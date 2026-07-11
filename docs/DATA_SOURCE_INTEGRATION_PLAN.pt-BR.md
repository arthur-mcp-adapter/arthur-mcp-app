# Plano: Habilitar Data Sources Além de API/Blank (SQL, MongoDB, Key-Value, ...)

Este plano descreve como transformar os "cards desabilitados" do wizard de criação de servidor (SQL, MongoDB, Redis, DynamoDB, Elasticsearch, Snowflake, GraphQL, gRPC, Cassandra, Firestore) em fontes de dados de verdade — do jeito que hoje já funciona para API (OpenAPI/Postman) e Blank.

## Contexto e Motivação (por que isso importa)

O produto hoje só cria um MCP server a partir de uma API existente (OpenAPI/Postman) ou de um server em branco montado tool a tool na mão. O problema: **muitos usuários não têm uma API**. Antes desta mudança, a única saída seria pedir para o usuário construir uma API própria em cima do banco de dados, dos comandos do Mongo, do key-value, ou de um SDK de terceiros — só para poder usar o produto. Isso é atrito grande demais para um usuário que só quer expor os dados que já tem.

A ideia central deste plano é inverter isso: **a query, o comando ou a chave viram a fonte diretamente** — sem passar por uma API intermediária que o usuário teria que construir e manter. Isso é o que torna a solução mais robusta e maleável: qualquer lugar onde o usuário já tem dados (banco relacional, Mongo, Redis, e no futuro possivelmente um SDK) vira uma Operation, e a Operation vira Tool/Resource, do mesmo jeito que um endpoint de API já vira Tool/Resource hoje.

**Nota sobre SDKs**: o usuário mencionou SDKs como uma quarta categoria (junto de SQL/commands/key-value) de fonte que hoje exigiria uma API-ponte. Isso fica **fora do escopo deste plano por enquanto** — diferente de query/comando/chave (que são preenchimento de variável num template fixo, ver Decisão de Arquitetura #0), rodar contra um SDK normalmente significa executar código, não só substituir parâmetros, o que muda o modelo de segurança por completo (sandboxing, quais chamadas do SDK são permitidas, etc.) e merece sua própria conversa de arquitetura antes de entrar num plano de fases. Registrado aqui para não se perder, não detalhado.

## Specialist Inputs

- `software-architect`: dono das decisões de fronteira de módulo, do formato do dispatch de execução, do modelo de credenciais/segredos e das decisões de permissão.
- `software-engineer`: dono da execução incremental, dos testes por fase e de manter o resto do produto estável enquanto isso é construído.

## Estado Atual (achado por investigação de código, não por suposição)

Isso é importante porque **o ROADMAP.md atual afirma coisas que não são verdade**:

- `docs/ROADMAP.md:72` diz "Completed phase 1 of the operation-first migration by renaming user-facing data-source execution UI from Queries to Operations" — **não existe nenhuma aba/UI "Operations" no frontend hoje.** Não há tab de Connection/Operations/Queries em `ServerDetail`, nem pasta `src/features/server/operations` ou equivalente.
- `docs/ROADMAP.md:73` diz "Added input/output schema support to data-source operations and MCP Tool generation" — **não existe caminho de execução que transforma uma `DbQuery` em uma MCP Tool chamável.** `inputSchema`/`outputSchema` existem no tipo `DbQuery`, mas nada os usa para gerar uma tool real.

A boa notícia: **o "trabalho difícil" já foi feito e está esquecido, não faltando.**

### O que já existe (backend)

- `api/src/dynamic-mcp/types.ts` já define `DbQuery` (query SQL, comandos/operações Mongo, comandos Redis, DynamoDB, Elasticsearch, GraphQL, gRPC — tudo num único tipo, discriminado por `sourceType`) e `ExecutionRef` (union discriminada: `http | db | sql | mongodb | redis | dynamodb | elasticsearch | snowflake | graphql | grpc | firestore | static`).
- `api/src/dynamic-mcp/adapters/` já tem implementações reais e funcionando:
  - `sql.adapter.ts`: Postgres, MySQL/MariaDB, SQL Server, ClickHouse, Cassandra (drivers `pg`/`mysql2` já instalados; `mssql`/`@clickhouse/client`/`cassandra-driver` **não estão em `package.json`**, então esses branches quebram em runtime hoje).
  - `mongodb.adapter.ts`: find/insertOne/updateOne/deleteOne/aggregate (driver `mongodb` só está presente como dependência transitiva do TypeORM — precisa virar dependência direta).
  - `redis.adapter.ts`: 6 modos de template + ~15 comandos raw (driver `ioredis` **não está instalado**).
  - Oracle, Snowflake, DynamoDB, Elasticsearch, GraphQL, gRPC, Firestore: sem adapter real, só o erro "not yet available".
- `api/src/swagger/swagger.service.ts` já expõe endpoints administrativos completos: testar conexão, introspectar schema, CRUD de `DbQuery`, rodar query/operação inline ou salva (`updateConnectionConfig`, `testDbConnection`, `introspectDbSchema`, `listDbQueries`/`addDbQuery`/`updateDbQuery`/`deleteDbQuery`, `runDbQuery`, `runQueryInline`).
- `SwaggerProjectEntity` já tem as colunas `connection_config` e `db_queries` (texto/JSON), sem precisar de migration nova.
- Escopo por dono (`ownerId` + `ServerOwnershipGuard`) já cobre todas essas rotas — **nenhum trabalho de multi-tenancy é necessário aqui**, foi resolvido na sessão anterior.

### O que falta (o gap real)

1. **Dispatch de execução nunca usa `executionRef`.** O handler MCP `CallTool` (`dynamic-mcp.service.ts`, por volta da linha 331) exige `tool.endpointRef` e lança erro se ausente. O mesmo vale para `executeTool` (teste direto) e para execução de passo de chain. Ou seja: hoje é fisicamente impossível uma AI client chamar uma tool baseada em banco de dados — mesmo que a `DbQuery` exista, tenha sido testada com sucesso pelos endpoints admin, e tudo mais.
2. **Nenhum endpoint transforma uma `DbQuery`/Operation em uma `GeneratedTool`.** `addDbQuery`/`updateDbQuery` só mexem no array `dbQueries`; nunca tocam no array `tools` (que é o que o dispatch de MCP realmente lê).
3. **Credenciais de conexão são armazenadas em texto puro**, sem o padrão `{{secret:NOME}}` que `AuthConfig` (fluxo HTTP) já usa. Isso é inconsistente com o resto do produto e um risco de segurança (a config completa, incluindo senha, pode vazar em qualquer resposta que devolva o registro do server).
4. **O wizard do frontend (`NewServer`) já tem os formulários inteiros de conexão para SQL/Mongo/Redis/DynamoDB/Elasticsearch/Snowflake/Firestore prontos, com validação e state — mas todos os cards estão `available: false`, e pior: no `handleCreate`, os campos de conexão capturados nunca são enviados para `PATCH /servers/:id/connection`.** Se alguém apenas trocasse `available: true`, o submit ainda criaria um server sem conexão de verdade.
5. **Nenhuma aba "Operations"/"Connection" existe em `ServerDetail`.** Não há onde o usuário configuraria/testaria as operações depois de criar o server.
6. **Nenhuma permissão dedicada** separa "ver/editar credenciais de conexão de banco" de "editar configurações gerais do server" — inconsistente com o padrão já usado para secrets (`secrets_reveal_values`) e AI providers (`ai_providers_execute`).

## Decisão de Arquitetura

**Não redesenhar o modelo de dados.** `DbQuery`/`ExecutionRef`/os adapters já modelam exatamente o que foi pedido: SQL → `query`, MongoDB → `collection` + `operationType` (comandos), Redis/KV → `command`/`keyPattern`. O trabalho aqui é **fiação (wiring)**, não desenho de schema.

### 0. Modelo de parametrização: Operation = Endpoint, variável = argumento (a AI nunca escreve a query)

Isso não é uma decisão nova — é o desenho que `DbQuery` já tem, só precisa ficar explícito porque é a base de tudo:

Hoje, num data source de API, o **dono do server** cria o endpoint (método, path, `parameterMap`) uma única vez, em tempo de administração. Em tempo de execução, a AI client nunca escolhe a URL nem o método — ela só fornece **valores de argumento** para os parâmetros que o dono declarou (`ParameterMapping`), e o `buildRequest` os encaixa no lugar certo (path/query/header/body).

O mesmo modelo vale para Operations, sem nenhuma peça nova:

- SQL: o dono escreve a query **uma vez**, com placeholders nomeados — `query?: string; // SQL string with :paramName placeholders` (`types.ts`). O adapter (`sql.adapter.ts`, `buildQuery()`) já converte `:paramName` em parâmetros posicionais/nomeados nativos do driver (`$1`, `$2`, ...) e passa os valores **separados do texto da query** para o driver — ou seja, já é bind de prepared statement, não concatenação de string. A AI client nunca vê nem escreve SQL; ela só manda `{ paramName: valor }`.
- MongoDB: mesma lógica com `filterTemplate`/`updateTemplate` usando placeholders `{{param}}`, resolvidos com os valores enviados pela AI, dentro do `operationType` (find/insertOne/updateOne/...) que o dono escolheu ao criar a Operation.
- Redis/KV: mesma lógica com `keyPattern`/`valueTemplate`.
- Em todos os casos, a declaração formal de quais variáveis existem, o tipo de cada uma, e quais são obrigatórias vem de `parameters?: DbQueryParameter[]` — o campo `inputSchema` da tool MCP é **derivado desse array**, exatamente como hoje é derivado de `ParameterMapping[]` para tools de API (`tool-generator.ts` → `buildParams`). O comentário do próprio tipo já registra essa intenção: `DbQuery` é "Analogous to an API endpoint in a REST server."

Consequência prática para o resto do plano: não existe cenário de "a AI decide rodar uma query arbitrária" — isso é estruturalmente impossível, do mesmo jeito que hoje uma AI client não decide inventar uma URL nova para uma tool de API. O único ponto de controle que realmente importa é **o que o dono do server escolhe expor como Operation** (ex.: se ele cria uma Operation com `DELETE FROM pedidos WHERE id = :id`, isso é uma decisão dele — equivalente a ele já poder hoje expor um endpoint HTTP `DELETE /pedidos/:id`). Ver a seção Riscos para o que isso muda na análise de segurança.

### 1. Uma Operation (`DbQuery`) sincroniza uma entrada em `tools`

Quando uma Operation é criada/editada/apagada (`addDbQuery`/`updateDbQuery`/`deleteDbQuery`), o servidor também cria/atualiza/remove uma entrada correspondente em `SwaggerProjectRecord.tools`, com `executionRef` preenchido em vez de `endpointRef` — exatamente como `addTool`/`updateTool` já fazem hoje para tools HTTP. Isso mantém `tools` como a única fonte que o dispatch MCP precisa ler; não é preciso um passo de merge em tempo de chamada.

### 2. Um único ponto de branch no dispatch de execução

Em `dynamic-mcp.service.ts`, nos três lugares que hoje fazem `buildRequest(args, tool.endpointRef, ...)` sem condição (handler `CallTool`, `executeTool`, execução de passo de chain), adicionar:

```ts
if (tool.executionRef) {
  return executeWithRef(tool.executionRef, effectiveArgs, resolvedConnectionConfig);
}
if (tool.endpointRef) {
  // caminho HTTP existente, inalterado
}
throw new Error('Tool sem configuração de execução válida.');
```

`executeWithRef` já existe em `api/src/dynamic-mcp/adapters/index.ts` — só precisa ser importado e chamado. O mapeamento de resposta (`mapResponse`) já é genérico o suficiente para aceitar o resultado normalizado que os adapters devolvem (esse é literalmente o propósito documentado do padrão de adapter em `docs/DESIGN_PATTERNS.md`: "Return normalized results from adapters so MCP response logic can stay generic").

### 3. Credenciais de conexão seguem o padrão `{{secret:NOME}}`

`DbConnectionConfig` passa a aceitar `{{secret:NOME}}` nos campos sensíveis (`password`, `uri`, `redisPassword`, `secretKey`, `apiKey`, etc.), resolvido pela mesma infraestrutura de secrets por dono já usada por `AuthConfig` (`resolveSecretRefs`, já escopada por `server.ownerId` desde a sessão de multi-tenancy). Nenhuma peça nova de infraestrutura de secrets é necessária — só reaproveitar o resolver existente (extrair para uma função genérica reutilizável entre `AuthConfig` e `DbConnectionConfig`, já que a lógica de regex/substituição é a mesma).

Consequência direta: `GET /servers/:id` e qualquer outro endpoint que devolva o registro do server passam a devolver `connectionConfig` com placeholders (`{{secret:NOME}}`), nunca o valor real — igual já acontece com `AuthConfig` hoje.

### 4. Nova permissão: `servers_manage_connection`

Segue o padrão já estabelecido (`secrets_reveal_values`, `ai_providers_execute`) de separar ações sobre credenciais da edição geral. Cobre: `PATCH /connection`, `POST /test-db-connection`, `POST /introspect`, CRUD de Operations, `POST /queries/:id/run`, `POST /run-query-inline`. Precisa ser adicionada em: `RolePermissions` (backend), presets de role embutidos (backend), `Permission` enum (frontend), `UserPermissions` (frontend), presets de fallback de role (frontend), guards/decorators do backend, gates `can(Permission.X)` no frontend — conforme a regra de "permission gate" do `AGENTS.md`.

## Fases de Entrega

A ideia é entregar **SQL primeiro, de ponta a ponta**, como implementação de referência do padrão inteiro (dispatch + secrets + permissão + UI). Depois, MongoDB e Redis/KV reaproveitam o mesmo padrão quase sem trabalho novo de arquitetura — só a UI específica de cada tipo e a instalação do driver que faltar.

### Fase 0 — Correções e fundação (pré-requisito para tudo)

- Corrigir `docs/ROADMAP.md` linhas 72–73: marcar como não concluído, ou reescrever descrevendo o estado real.
- Extrair `resolveSecretRefs` para uma função reutilizável fora de `auth-provider.ts` (ou criar uma equivalente genérica) e aplicá-la também a `DbConnectionConfig` antes de qualquer adapter rodar.
- Definir e cadastrar a permissão `servers_manage_connection` nas 6 camadas exigidas pelo `AGENTS.md`.
- Auditoria de segurança rápida no `redis.adapter.ts`: confirmar que a lista de ~15 comandos raw expostos não inclui comandos destrutivos/administrativos (`FLUSHALL`, `FLUSHDB`, `CONFIG`, `SHUTDOWN`, `DEBUG`) — se incluir, remover do allowlist antes de expor a feature a usuários finais.

**Arquivos:** `docs/ROADMAP.md`, `api/src/dynamic-mcp/auth-provider.ts` (extrair helper), `api/src/dynamic-mcp/adapters/redis.adapter.ts`, `api/src/roles/permissions.ts`, `api/src/common/guards/permissions.guard.ts`, `src/context/AuthContext.tsx`, `src/context/permissionPresets.ts`.

### Fase 1 — SQL de ponta a ponta (implementação de referência)

Escopo: Postgres e MySQL/MariaDB (drivers já instalados e funcionando; não gastar tempo com Oracle/Snowflake/ClickHouse/Cassandra nesta fase).

**Backend:**
- Sincronizar `addDbQuery`/`updateDbQuery`/`deleteDbQuery` com o array `tools` (criar/atualizar/remover a entrada `executionRef`-based correspondente).
- Ligar o branch de dispatch descrito acima nos 3 pontos de execução.
- Aplicar resolução de secret em `DbConnectionConfig` antes de chamar os adapters.
- Proteger as rotas de conexão/operations com a nova permissão.

**Frontend:**
- `NewServer`: trocar `available: false` → `true` para `postgresql`/`mysql`/`mariadb`; corrigir `handleCreate` para de fato persistir os campos de conexão via `PATCH /servers/:id/connection` depois de criar o server (hoje esse payload é descartado silenciosamente).
- `ServerDetail`: nova aba "Operations" (ou "Connection" + "Operations", a decidir com UX) — CRUD de Operations, teste de conexão, teste de operação individual, seguindo a ordem de campo já normatizada em `docs/DESIGN_PATTERNS.md`: identidade da operação → contrato de entrada → definição de execução → contrato de saída → teste.
- i18n: novas strings em `locales/en` e `locales/pt-BR`.

**Testes:** unit tests do dispatch (tool com `executionRef` é executada corretamente; tool sem `endpointRef` nem `executionRef` dá erro claro), unit tests de resolução de secret em `DbConnectionConfig`, teste e2e leve (registrar 2 tenants, cada um com um Postgres de teste, confirmar isolamento — reaproveita o padrão de verificação já usado na sessão de multi-tenancy).

**Critério de aceite:** um usuário cria um server Postgres pelo wizard, configura credenciais (como secret), cria uma Operation, e uma AI client consegue de fato chamar essa tool via `/mcp/server/:id` e receber dados reais do banco.

### Fase 2 — MongoDB (comandos)

Reaproveita 100% do dispatch/secrets/permissão da Fase 1. Só falta:
- Adicionar `mongodb` como dependência direta em `api/package.json` (hoje só existe transitivamente).
- Habilitar o card `mongodb` no wizard e persistir a `uri` (como secret) em `handleCreate`.
- UI de Operations precisa da variante Mongo: escolher `collection` + `operationType` (find/insertOne/updateOne/deleteOne/aggregate) em vez de escrever uma query livre — **não expor um campo de comando arbitrário/`eval`**, manter a mesma allowlist de operações que o adapter já implementa.

### Fase 3 — Redis / Key-Value

Mesma mecânica das fases 1–2. Só falta:
- Adicionar `ioredis` como dependência.
- Habilitar o card `redis` e persistir host/porta/senha (senha como secret).
- UI de Operations com os 6 modos de `redisTemplate` (get/set/del/etc. por padrão de chave) como opção principal; comandos raw (allowlist já revisada na Fase 0) como opção avançada.

### Fase 4 — Extensão aos demais tipos já modelados

DynamoDB, Elasticsearch, Snowflake, GraphQL, gRPC, Cassandra, ClickHouse, Oracle, Firestore: o tipo `DbQuery`/`ExecutionRef` já tem os campos para todos eles. Cada um vira apenas: (a) instalar o driver que falta, (b) escrever o adapter (os que faltam), (c) habilitar o card no wizard, (d) variante de UI de Operations específica. Nenhuma mudança de arquitetura nova — tratar como backlog, priorizado pela demanda real de usuários, não hoje.

## Riscos e Mitigações

- **Não é risco: "a AI client monta uma query arbitrária."** Como descrito na Decisão de Arquitetura #0, isso é estruturalmente impossível — a AI só fornece valores para variáveis já declaradas pelo dono do server numa Operation pré-existente, igual já acontece com tools de API hoje. Não há nenhum campo "SQL livre"/"comando livre" exposto à AI em nenhuma fase deste plano.
- **O risco real é o mesmo que já existe hoje para tools de API: o dono do server decide o que expor.** Uma Operation pode ser uma leitura (`SELECT`) ou uma mutação (`UPDATE`/`DELETE`/`insertOne`/etc.) — isso é escolha do dono ao criar a Operation, equivalente a ele já poder hoje configurar um endpoint HTTP `DELETE`. Nada muda na análise de risco aqui em relação ao que o produto já permite para API; a mitigação é a mesma já aplicada a servers hoje (permissão dedicada — item #4 — e o dono é o único que autora Operations, nunca a AI client).
- **Comandos administrativos/destrutivos no modo "raw command" do Redis** (`redis.adapter.ts`, ~15 comandos no modo composite): esse modo é diferente do resto — é o dono escolhendo um comando Redis por nome de uma lista pré-definida pelo adapter, não escrevendo um "template com variável". Auditar essa lista na Fase 0 e remover `FLUSHALL`/`FLUSHDB`/`CONFIG`/`SHUTDOWN`/`DEBUG` (ou qualquer comando fora do escopo de leitura/escrita de chaves) antes de expor a feature.
- **Vazamento de credencial em resposta de API**: mitigado pelo padrão `{{secret:NOME}}` (Decisão de Arquitetura #3) — sem isso, não avançar para nenhuma fase além da 0.
- **Driver ausente quebrando em runtime silenciosamente**: os adapters já falham com mensagem clara ("X adapter not yet available" / "client not installed") — manter esse comportamento, e só habilitar um card no wizard quando o driver correspondente estiver de fato instalado e testado.
- **Regressão no fluxo HTTP existente**: o branch de dispatch é aditivo (`if (tool.executionRef) ... else if (tool.endpointRef) ...`), então tools HTTP continuam no mesmo caminho de código inalterado.

## Documentação a Atualizar Durante a Entrega

- `docs/ROADMAP.md`: estado real por fase.
- `docs/ENTITIES.md`: já documenta `connectionConfig`/`dbQueries`; atualizar quando o formato de secret-ref for adicionado.
- `docs/FLOWS.md`: já tem a seção "Data Source Operations" descrevendo o estado alvo — atualizar a nota de compatibilidade quando a aba Operations existir de fato.
- `docs/DESIGN_PATTERNS.md`: já documenta o Adapter Pattern — atualizar quando o dispatch estiver ligado.
