# Modelo de Integrações

Este documento descreve como Arthur MCP deve modelar integrações de APIs, protocolos, bancos de dados e serviços analíticos como MCP servers. Este arquivo está em português por solicitação explícita do usuário; os demais documentos do projeto devem continuar em inglês.

## Objetivo

A ideia original do produto era transformar REST APIs em MCP servers. Com a evolução para bancos de dados, MongoDB commands, Redis commands e outras fontes, o sistema ganhou uma segunda camada chamada `queries`. Essa camada resolve uma necessidade real, mas hoje cria a sensação de que REST e bancos de dados são produtos diferentes dentro do mesmo produto.

O modelo recomendado é unificar tudo sob uma abstração:

```txt
MCP Server
  -> Source Connection
  -> Source Operations
  -> MCP Exposures
```

Em outras palavras:

- Um **MCP Server** representa uma fonte externa ou lógica.
- Uma **Source Connection** descreve como Arthur conecta nessa fonte.
- Uma **Source Operation** descreve algo executável nessa fonte.
- Uma **MCP Exposure** decide como uma operação aparece no protocolo MCP: Tool, Resource ou Prompt-related behavior.

Nesse modelo, uma REST endpoint, uma SQL query, uma MongoDB aggregation, um Redis command, uma GraphQL query e uma chamada gRPC são todas **operações**.

## Conceitos Canônicos

### MCP Server

É a unidade que o usuário cria e que um cliente MCP consome.

Responsabilidades:

- Nome, descrição e status.
- Source type via tag `source:<type>`.
- Configuração de conexão.
- Lista de operações.
- Lista de tools/resources/prompts/chains expostos ao MCP.
- API keys, rate limits, availability, maintenance e logs.

Exemplos:

- `Stripe API`
- `Internal CRM Database`
- `Mongo Analytics`
- `Redis Cache Ops`

### Source Connection

Descreve como conectar na fonte.

Campos conceituais:

```ts
interface SourceConnection {
  sourceType: SourceType
  config: Record<string, unknown>
  auth?: AuthConfig
}
```

No estado atual do projeto, isso está representado principalmente por:

- `SwaggerProjectRecord.connectionConfig`
- `SwaggerProjectRecord.auth`
- `tags` com `source:<type>`
- `baseUrl` para fontes HTTP/API

Regra de arquitetura:

> A conexão pertence ao server, não à operação individual, exceto quando a fonte exigir overrides explícitos.

### Source Operation

Representa uma ação executável contra a fonte.

Campos conceituais:

```ts
interface SourceOperation {
  id: string
  name: string
  description?: string
  sourceType: SourceType
  kind: OperationKind
  inputSchema: JsonSchema
  execution: OperationExecution
  resultMode?: 'rows' | 'first' | 'count' | 'raw'
  iteratorPath?: string
}
```

Mapeamento atual:

- REST: `GeneratedTool.endpointRef`
- Bancos/NoSQL/protocolos futuros: `DbQuery`
- Runtime: `ExecutionRef`

Modelo desejado:

- REST endpoints também devem virar `SourceOperation`.
- `DbQuery` deve evoluir ou ser renomeado para `SourceOperation`.
- Tools e Resources devem referenciar `operationId`, não carregar detalhes específicos da fonte.

### MCP Exposure

É como uma operação fica disponível para o cliente MCP.

Tipos:

- **Tool**: o AI client pode executar.
- **Resource**: o AI client pode ler ou listar.
- **Prompt**: template de prompt associado ao server ou global.
- **Chain**: composição de Tools/Operations.

Campos conceituais:

```ts
interface McpToolExposure {
  id: string
  name: string
  description?: string
  operationId: string
  enabled: boolean
  outputSchema?: JsonSchema
}
```

Regra de arquitetura:

> A Tool não deve saber se executa REST, SQL, MongoDB ou Redis. Ela deve saber qual operação expõe.

## Famílias de Integração

## 1. APIs & Protocols

Inclui:

- REST
- GraphQL
- gRPC
- Blank / Static

### REST

`sourceType`: `rest`

Estado atual:

- REST é o fluxo mais maduro.
- Importa OpenAPI, Swagger e Postman.
- Gera Tools a partir de endpoints.
- Templates REST criam servers com `source:rest`.

Modelo recomendado:

```txt
REST Server
  SourceConnection
    baseUrl
    auth
    global/static headers
  SourceOperations
    HTTP Endpoint Operation
      method
      path
      contentType
      parameterMap
      inputSchema
  MCP Tools
    reference operationId
```

Operação REST:

```ts
interface RestOperationExecution {
  kind: 'http_endpoint'
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  contentType?: string
  parameterMap: ParameterMapping[]
  staticHeaders?: Array<{ name: string; value: string }>
}
```

Regra:

- OpenAPI/Postman importam operações.
- O usuário pode editar ou desabilitar operações.
- A Tool expõe uma operação REST, mas não deve duplicar toda a definição HTTP no longo prazo.

### GraphQL

`sourceType`: `graphql`

Estado atual:

- Aparece como source type.
- Execução ainda está marcada como não disponível em adapters.

Modelo recomendado:

```txt
GraphQL Server
  SourceConnection
    endpoint
    auth
  SourceOperations
    GraphQL Operation
      operationType: query | mutation
      document
      variables schema
  MCP Tools
    reference operationId
```

Operação GraphQL:

```ts
interface GraphQLOperationExecution {
  kind: 'graphql_operation'
  operationType: 'query' | 'mutation'
  document: string
  variableSchema: JsonSchema
}
```

Regra:

- GraphQL deve usar variáveis oficiais do GraphQL, não interpolação livre dentro do documento.
- Introspection pode gerar operações sugeridas, mas o usuário deve revisar antes de expor como Tool.

### gRPC

`sourceType`: `grpc`

Estado atual:

- Aparece como source type.
- Execução ainda está marcada como não disponível em adapters.

Modelo recomendado:

```txt
gRPC Server
  SourceConnection
    host
    port
    tls
    metadata/auth
  SourceOperations
    RPC Method Operation
      service
      method
      request schema
  MCP Tools
    reference operationId
```

Operação gRPC:

```ts
interface GrpcOperationExecution {
  kind: 'grpc_method'
  service: string
  method: string
  requestSchema: JsonSchema
  metadata?: Record<string, string>
}
```

Regra:

- `.proto` ou server reflection devem gerar operações candidatas.
- A operação deve armazenar contrato de input suficiente para o MCP client saber o que enviar.

### Blank / Static

`sourceType`: `blank`

Modelo recomendado:

```txt
Blank Server
  No external connection
  Static Operations
    response template
  MCP Tools / Resources
    expose static content or deterministic templates
```

Regra:

- Deve ser tratado como fonte válida, não como exceção espalhada no código.
- Útil para protótipos, docs estáticas e respostas parametrizadas simples.

## 2. Relational Databases

Inclui:

- PostgreSQL
- MySQL
- MariaDB
- SQL Server
- Oracle
- CockroachDB
- ClickHouse
- Cassandra
- Snowflake

Observação: Cassandra e Snowflake podem ter particularidades fortes, mas hoje aparecem agrupados com fontes SQL-like no projeto. A modelagem deve permitir adapters específicos quando necessário.

### Modelo Geral

```txt
Database Server
  SourceConnection
    host
    port
    database/keyspace/schema
    user
    password/secret reference
    ssl/tls
  SourceOperations
    SQL Query Operation
      query
      parameters
      resultMode
  MCP Tools
    execute query with args
  MCP Resources
    read query result
```

Operação SQL:

```ts
interface SqlOperationExecution {
  kind: 'sql_query'
  dialect: SqlDialect
  query: string
  parameters: OperationParameter[]
  resultMode: 'rows' | 'first' | 'count'
}
```

Regra:

- SQL query é uma implementação específica de Source Operation.
- O usuário deve criar queries parametrizadas, nunca concatenar input livre.
- O adapter deve fazer binding de parâmetros.
- Resultados devem ser normalizados antes de virar resposta MCP.

### PostgreSQL, MySQL, MariaDB, SQL Server, CockroachDB

Essas fontes seguem o fluxo SQL padrão.

Connection:

- host
- port
- database
- username
- password ou `{{secret:NAME}}`
- ssl

Operation:

- SQL com placeholders nomeados.
- parâmetros tipados.
- modo de resultado.

Exemplo:

```sql
select id, name, email
from customers
where status = :status
limit :limit
```

### Oracle

Mesma ideia do SQL padrão, mas com diferenças de driver, connection string e placeholders.

Regra:

- O adapter Oracle deve encapsular diferenças de driver.
- A UI pode seguir o mesmo modelo, mas a execução não deve reutilizar cegamente o adapter SQL genérico se o driver exigir semântica própria.

### ClickHouse

Fonte analítica SQL-like.

Regra:

- Deve ser modelado como operação SQL analítica.
- `resultMode` deve favorecer `rows` e limites explícitos.
- A UI deve incentivar queries read-only.

### Cassandra

Fonte CQL, não SQL relacional clássico.

Regra:

- Pode usar `kind: 'cql_query'` no futuro, mesmo que hoje esteja próxima de SQL.
- Deve usar `keyspace` em vez de database quando aplicável.
- Queries devem respeitar as restrições de partition key do Cassandra.

### Snowflake

Data warehouse SQL.

Connection:

- account
- warehouse
- database
- schema
- user
- password/key pair

Operation:

- SQL analítico.
- parâmetros.
- result mode.

Regra:

- Modelar como source de analytics, mas com operação SQL.
- Separar config específica do warehouse da config genérica de banco.

## 3. NoSQL & Document Stores

Inclui:

- MongoDB
- Redis
- Firestore
- DynamoDB

Essas fontes não devem ser forçadas artificialmente ao conceito de "query". Elas devem ser modeladas como operações específicas.

### MongoDB

`sourceType`: `mongodb`

Modelo:

```txt
MongoDB Server
  SourceConnection
    uri
    database
  SourceOperations
    Mongo Operation
      collection
      operationType
      filter/update/pipeline templates
      parameters
  MCP Tools / Resources
    reference operationId
```

Operação Mongo:

```ts
interface MongoOperationExecution {
  kind: 'mongo_operation'
  collection: string
  operationType: 'find' | 'findOne' | 'insertOne' | 'updateOne' | 'deleteOne' | 'aggregate' | 'count'
  filterTemplate?: JsonTemplate
  projectionTemplate?: JsonTemplate
  updateTemplate?: JsonTemplate
  pipelineTemplate?: JsonTemplate
  limit?: number
}
```

Regra:

- MongoDB não deve ser descrito como SQL query.
- `find`, `aggregate`, `count`, `insertOne`, `updateOne` e `deleteOne` são operações.
- Templates JSON devem ser validados antes de salvar.
- Operações de escrita devem ter sinalização visual e permissões claras.

### Redis

`sourceType`: `redis`

Modelo:

```txt
Redis Server
  SourceConnection
    host
    port
    password
    tls
  SourceOperations
    Redis Command Operation
      command
      key pattern
      value template
  MCP Tools
    execute command
```

Operação Redis:

```ts
interface RedisOperationExecution {
  kind: 'redis_command'
  command: string
  keyPattern: string
  valueTemplate?: string
}
```

Regra:

- Redis command é uma operação, não query.
- Comandos perigosos devem ser bloqueados ou exigir confirmação/permissão.
- `KEYS *`, `FLUSHALL`, `FLUSHDB` e comandos destrutivos devem ser tratados como alto risco.

### Firestore

`sourceType`: `firestore`

Modelo:

```txt
Firestore Server
  SourceConnection
    projectId
    credentials
  SourceOperations
    Firestore Operation
      collection path
      operationType
      filter/order/limit
  MCP Tools / Resources
    reference operationId
```

Regra:

- Não tratar como MongoDB internamente, mesmo que a UI pareça semelhante.
- Collections, documents e paths devem ser modelados explicitamente.
- Credenciais devem ser secret-backed.

### DynamoDB

`sourceType`: `dynamodb`

Modelo:

```txt
DynamoDB Server
  SourceConnection
    region
    access key / secret reference
    endpoint override
  SourceOperations
    Dynamo Operation
      table
      operationType
      key condition
      filter expression
  MCP Tools / Resources
    reference operationId
```

Operação DynamoDB:

```ts
interface DynamoOperationExecution {
  kind: 'dynamo_operation'
  tableName: string
  operationType: 'getItem' | 'putItem' | 'updateItem' | 'deleteItem' | 'query' | 'scan'
  keyConditionTemplate?: string
  filterExpressionTemplate?: string
}
```

Regra:

- `scan` deve ser marcado como potencialmente caro.
- A UI deve favorecer `getItem` e `query` antes de `scan`.
- Região e credenciais pertencem à conexão, não à operação.

## 4. Cloud & Analytics

Inclui:

- Elasticsearch
- Snowflake
- ClickHouse
- DynamoDB
- Outros serviços cloud futuros

Essa família mistura serviços que também aparecem em outras categorias. A regra é: a família visual pode ser "Cloud & Analytics", mas a modelagem deve seguir o tipo real de operação.

### Elasticsearch

`sourceType`: `elasticsearch`

Modelo:

```txt
Elasticsearch Server
  SourceConnection
    url
    api key / basic auth
  SourceOperations
    Elasticsearch Operation
      index
      operationType
      body template
  MCP Tools / Resources
    reference operationId
```

Operação Elasticsearch:

```ts
interface ElasticsearchOperationExecution {
  kind: 'elasticsearch_operation'
  index: string
  operationType: 'search' | 'get' | 'index' | 'update' | 'delete'
  bodyTemplate?: JsonTemplate
}
```

Regra:

- Search deve ser tratado como leitura.
- Index/update/delete devem ser tratados como escrita.
- Queries com body JSON devem ter validação estrutural.

### Analytics SQL

Inclui:

- Snowflake
- ClickHouse

Modelo:

```txt
Analytics Server
  SourceConnection
    warehouse / endpoint / database / schema
  SourceOperations
    Analytics SQL Operation
      query
      parameters
      result limits
  MCP Resources
    expose datasets
  MCP Tools
    run controlled analytic queries
```

Regra:

- A UI deve incentivar limites e filtros.
- Operações devem ser preferencialmente read-only.
- Resultado grande deve virar Resource paginado ou resumido, não Tool gigantesca.

## Tabela de Modelagem

| Família | Source Types | Connection | Operation Kind | Exposição MCP Recomendada |
|---|---|---|---|---|
| APIs & Protocols | `rest` | base URL + auth | `http_endpoint` | Tool e Resource |
| APIs & Protocols | `graphql` | endpoint + auth | `graphql_operation` | Tool |
| APIs & Protocols | `grpc` | host/port/tls + metadata | `grpc_method` | Tool |
| APIs & Protocols | `blank` | nenhuma | `static_response` | Tool e Resource |
| Relational Databases | `postgresql`, `mysql`, `mariadb`, `mssql`, `oracle`, `cockroachdb` | host/port/database/user/secret | `sql_query` | Tool e Resource |
| Relational/Analytics | `clickhouse`, `snowflake` | endpoint/account/warehouse/database/schema | `analytics_sql_query` | Resource preferencial, Tool controlada |
| NoSQL & Document Stores | `mongodb` | URI/database | `mongo_operation` | Tool e Resource |
| NoSQL & Document Stores | `firestore` | project/credentials | `firestore_operation` | Tool e Resource |
| NoSQL / Key-value | `redis` | host/port/password/tls | `redis_command` | Tool |
| Cloud & Analytics | `dynamodb` | region/credentials/table context | `dynamo_operation` | Tool e Resource |
| Cloud & Analytics | `elasticsearch` | URL/auth | `elasticsearch_operation` | Tool e Resource |

## Regras de Segurança

### Leitura vs Escrita

Toda operação deve declarar intenção:

```ts
type OperationIntent = 'read' | 'write' | 'delete' | 'admin'
```

Regras:

- Operações `read` podem ser expostas com menor fricção.
- Operações `write` exigem aviso visual e permissões específicas.
- Operações `delete` exigem confirmação e permissões específicas.
- Operações `admin` devem ser bloqueadas por padrão.

### Segredos

Credenciais devem usar `{{secret:NAME}}` ou integração equivalente com Secrets.

Regra:

- Values de secrets não podem aparecer em list/detail metadata.
- Configuração de conexão pode armazenar referência ao secret, não o valor exposto.

### Validação de Templates

Templates de JSON, SQL, GraphQL e command strings devem ser validados antes da execução.

Regras:

- SQL deve usar parâmetros nomeados.
- JSON templates devem parsear corretamente.
- GraphQL deve validar documento e variáveis.
- Redis commands devem passar por allowlist.
- Operações destrutivas devem ser explícitas.

## Como Isso Deve Aparecer na UI

### New Server

Primeiro passo: escolher a fonte.

Famílias visuais:

- APIs & Protocols
- Relational Databases
- NoSQL & Document Stores
- Cloud & Analytics
- Blank / Static

Após escolher a fonte:

- Configurar conexão.
- Criar/importar operações.
- Revisar operações.
- Expor operações como Tools/Resources.

### Server Detail

Tabs recomendadas no longo prazo:

- Connect
- Operations
- Tools
- Resources
- Prompts
- Chains
- Settings
- Activity

Regra:

> A tab `Operations` deve substituir a divisão mental entre `Endpoints`, `Queries` e `Commands`.

Dentro de Operations, a UI muda conforme a fonte:

- REST: endpoints.
- SQL: queries.
- MongoDB: collection operations.
- Redis: commands.
- Elasticsearch: search/index operations.
- GraphQL: queries/mutations.
- gRPC: methods.

Ordem recomendada no editor de operação:

1. Identidade da operação.
2. Input parameters, tratados como contrato de entrada.
3. Query, command, document ou request template específico da fonte.
4. Output schema.
5. Teste da operação.

## Migração do Estado Atual

### Estado Atual

O projeto hoje tem:

- REST gerando `GeneratedTool` com `endpointRef`.
- DB/NoSQL usando `DbQuery`.
- Tools DB usando `ExecutionRef` com `type: 'db'` e `dbQueryId`.
- Resources usando `queryRef`.
- `connectionConfig` e `dbQueries` dentro do server.

Isso funciona, mas espalha conceitos diferentes para coisas que deveriam ser o mesmo tipo de problema.

### Estado Desejado

```txt
SwaggerProject / McpServer
  sourceType
  sourceConnection
  sourceOperations[]
  tools[]
  resources[]
```

Tools:

```ts
tool.operationId
```

Resources:

```ts
resource.operationId
```

### Plano Incremental

1. Renomear UI de `Queries` para `Operations`. **Status: concluído para a linguagem genérica da tela de detalhes do server.**
2. Manter `DbQuery` internamente por compatibilidade, mas tratar como `SourceOperation` no vocabulário do produto.
3. Garantir que operações carreguem `inputSchema` e `outputSchema` para formar Tools e Resources MCP com contrato estável. **Status: iniciado; operações legadas agora aceitam schemas e Tools herdam esses schemas quando disponíveis.**
   - O `inputSchema` nasce dos parâmetros de entrada da operação, de forma semelhante a query params de um GET.
   - Esses parâmetros podem ser usados como variáveis em SQL (`:productId`), templates JSON (`{{productId}}`), Redis keys, GraphQL variables ou request templates.
4. Extrair lógica de queries/operations de `SwaggerService` para um serviço dedicado.
5. Criar tipos novos `SourceOperation`, `OperationExecution` e `OperationIntent`.
6. Migrar `DbQuery` para `SourceOperation` mantendo compatibilidade de leitura.
7. Migrar REST endpoints importados para também serem operações.
8. Migrar Tools e Resources para referenciar `operationId`.
9. Remover formatos legados quando não houver mais dependência.

## Decisão Arquitetural Recomendada

Arthur MCP deve tratar qualquer integração executável como uma **Source Operation**.

Decisão:

> REST endpoints, SQL queries, MongoDB operations, Redis commands, GraphQL queries, gRPC methods e analytics queries são variações de uma mesma abstração: operação de fonte. MCP Tools e Resources devem expor operações, não carregar detalhes específicos de integração.

Benefícios:

- Reduz duplicação entre REST e DB.
- Melhora o modelo mental do usuário.
- Facilita adicionar novas fontes.
- Simplifica runtime: resolver operação, executar adapter, normalizar resultado.
- Evita que `SwaggerService` continue acumulando responsabilidades.

Trade-offs:

- Exige migração gradual.
- Algumas telas terão que trocar linguagem de `Queries` para `Operations`.
- REST, que hoje está maduro, precisará se adaptar ao modelo comum sem quebrar importação.
- Será necessário manter compatibilidade com dados existentes durante a transição.

## Glossário

- **Source**: tipo de integração, como REST, PostgreSQL ou MongoDB.
- **Source Connection**: configuração necessária para conectar na fonte.
- **Source Operation**: ação executável dentro da fonte.
- **MCP Exposure**: forma como uma operação fica visível via MCP.
- **Tool**: ação chamável pelo AI client.
- **Resource**: dado/documento legível pelo AI client.
- **Query**: tipo específico de operação SQL ou analytics; não deve ser o nome genérico para todas as fontes.
- **Command**: tipo específico de operação em fontes como Redis ou MongoDB.
