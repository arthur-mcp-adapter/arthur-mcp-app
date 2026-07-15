# Plano de implantação contínua em Ubuntu com Docker e Kubernetes

## 1. Objetivo

Criar um ambiente de produção para o Arthur MCP em uma única máquina Ubuntu, com:

- imagem Docker reproduzível;
- Kubernetes leve por meio do K3s;
- publicação automática de imagens no GitHub Container Registry (GHCR);
- atualização automática do ambiente quando a branch principal do repositório mudar;
- TLS, health checks, métricas, logs, backup e rollback;
- nenhum secret armazenado em texto puro no repositório público.

O repositório será público permanentemente. Portanto, código, manifests Kubernetes, configurações não sensíveis e imagens podem ser públicos. Credenciais, chaves privadas, tokens OAuth, senhas de banco e chaves de criptografia não podem ser publicados.

## 2. Decisões de arquitetura

### 2.1 Componentes escolhidos

| Camada | Escolha | Responsabilidade |
|---|---|---|
| Código-fonte | GitHub público | Código, Dockerfile, workflows e manifests declarativos |
| CI | GitHub Actions | Validar, testar, compilar, analisar e publicar a imagem |
| Registro | GHCR público | Armazenar imagens imutáveis por SHA do commit |
| Host | Ubuntu Server | Máquina física ou virtual que executará o ambiente |
| Kubernetes | K3s single-node | Orquestrar a aplicação e componentes operacionais |
| Runtime de containers | containerd do K3s | Executar os pods dentro do cluster |
| Docker | Docker Engine + Buildx | Desenvolvimento, diagnóstico e builds manuais; não será o runtime do K3s |
| Entrada HTTP | Traefik fornecido pelo K3s | Rotear tráfego externo para a aplicação |
| TLS | cert-manager + Let's Encrypt | Emitir e renovar certificados automaticamente |
| GitOps/CD | Flux CD | Observar o repositório e reconciliar o cluster |
| Configuração | Kustomize | Manter uma base e overlays por ambiente |
| Secrets | SOPS + age, ou secrets criados fora do Git | Impedir exposição de credenciais no repositório público |
| Banco | PostgreSQL gerenciado pelo Supabase (mesmo projeto usado para Auth) | Persistência isolada do host da aplicação |
| Backup | Backups do provedor + exportação lógica periódica | Recuperação independente da máquina Ubuntu |

### 2.2 Fluxo de atualização

```text
push/merge em main
        |
        v
GitHub Actions: type-check + testes + builds + scan
        |
        v
imagem ghcr.io/<org>/<repo>:sha-<commit>
        |
        v
workflow atualiza o digest/tag no overlay de produção
        |
        v
Flux detecta a alteração no repositório público
        |
        v
K3s executa rolling update + readiness check
        |
        +--> sucesso: nova versão permanece ativa
        |
        +--> falha: rollout para e operador reverte o commit Git
```

O cluster não fará `git pull` nem executará `docker compose up` periodicamente. O Git será a fonte declarativa do estado desejado, e o Flux reconciliará esse estado no Kubernetes.

### 2.2.1 Como a atualização sem indisponibilidade realmente acontece ("o orquestrador")

Não existe um componente único chamado "orquestrador" — é a combinação de quatro mecanismos, cada um cobrindo a lacuna do anterior. Domínio de produção definido: `https://app.arthurmcp.io/`.

1. **Kubernetes Deployment com `RollingUpdate`** (Fase 6). Com `replicas: 1` e a estratégia padrão (`maxUnavailable: 25%`, `maxSurge: 25%`), o Kubernetes arredonda `maxUnavailable` para baixo (`0`) e `maxSurge` para cima (`1`) num Deployment de 1 réplica. Na prática: ele sobe o pod novo **antes** de derrubar o antigo — por um instante existem 2 pods rodando ao mesmo tempo. O pod antigo só é terminado depois que o novo passa no `readinessProbe`. Isso é o que garante zero downtime a nível de tráfego HTTP.
2. **`readinessProbe: /ready` correto — hoje não é**. Conferido em `api/src/observability/health.controller.ts`: `/health`, `/ready` e `/live` chamam o mesmo método e devolvem exatamente a mesma resposta (`status: 'ok'`, uptime, versão) — nenhum verifica conexão de banco ou qualquer dependência real. Isso significa que `/ready` responde OK assim que o processo Node sobe, mesmo que `migrationsRun: true` ainda esteja rodando as migrations ou a conexão com o Postgres externo tenha falhado. Num rolling update, o Kubernetes marcaria esse pod como pronto e mandaria tráfego pra ele cedo demais. Antes da Fase 6, `/ready` precisa checar de verdade a conexão com o banco (ex: `dataSource.isInitialized` ou um `SELECT 1`) e só responder OK depois disso — `/live`/`/health` continuam podendo ser só "processo vivo".
3. **Desligamento gracioso do pod antigo**. `app.enableShutdownHooks()` já está habilitado em `api/src/main.ts` — o NestJS reage a `SIGTERM` e roda os hooks de lifecycle (fecha conexão de banco, etc.) antes de sair. Falta, no manifest do Deployment: um `preStop` hook (ex. `sleep 5`) antes do `SIGTERM`, pra dar tempo do Service/Traefik parar de rotear pro pod que já está terminando, e um `terminationGracePeriodSeconds` maior que o tempo de drenar requisições em andamento. Sem isso, uma requisição pode chegar no pod já em processo de desligamento.
4. **Migração de banco durante o rolling update**. Como o passo 1 mantém pod antigo e novo rodando simultaneamente por alguns segundos, isso **já vale desde a primeira atualização com `replicas: 1`**, não só "quando escalar para mais réplicas" (correção do que a Fase 6 sugeria abaixo). Toda migration precisa ser compatível com o código da versão anterior rodando ao mesmo tempo (ex: adicionar coluna nullable antes de passar a exigi-la; nunca remover uma coluna que a versão anterior ainda lê). `migrationsRun: true` no startup (`api/src/database/database.module.ts`) roda a cada boot de pod — com 2 pods subindo em paralelo num rolling update, ambos podem tentar aplicar a mesma migration pendente ao mesmo tempo; validar que a versão do TypeORM em uso serializa isso com segurança antes de depender disso em produção (a Fase 10 já recomenda evoluir para um Job de migração único e controlado antes de qualquer múltipla réplica — na prática essa recomendação vale a partir do primeiro rolling update, não depois).
5. **Flux como reconciliador, não como executor de comandos**. Flux não faz o rollout acontecer — ele só garante que o manifest no Git (com a nova tag/digest de imagem) está aplicado no cluster. Quem executa o rolling update é o próprio Kubernetes, reagindo à mudança do Deployment. O `Kustomization.spec.healthChecks` do Flux (Fase 9) deve apontar para o Deployment, para que o Flux marque a reconciliação como falha se o rollout não completar — isso não reverte o Git sozinho, só sinaliza (rollback continua sendo o processo manual da Fase 12: reverter o commit de promoção).
6. **"Balanceamento"**: não há um load balancer separado — o Service `ClusterIP` + Traefik já só encaminham tráfego para pods com `readinessProbe` OK. Durante o rolling update isso já distribui automaticamente: para de mandar tráfego pro pod antigo assim que ele fica `NotReady`/`Terminating`, e começa a mandar pro novo assim que ele fica `Ready`. Não precisa de lógica extra além de probes corretos.

Resumo prático: zero downtime real depende menos de "instalar as ferramentas certas" e mais de três detalhes de implementação que ainda faltam — `preStop` + `terminationGracePeriodSeconds` no manifest do Deployment, `/ready` realmente verificando prontidão (não só liveness), e migrations retrocompatíveis por design. Sem os três, o rolling update do Kubernetes ainda vai causar erros intermitentes durante cada deploy, mesmo com Flux/K3s/cert-manager funcionando perfeitamente.

### 2.3 Limitações conscientes

- Uma única máquina não oferece alta disponibilidade. Uma falha de energia, disco, rede ou sistema operacional derruba todo o serviço.
- Um cluster single-node não suporta atualização ou manutenção do host sem indisponibilidade.
- Kubernetes organiza workloads, mas não transforma um único host em infraestrutura altamente disponível.
- A indisponibilidade do host interrompe a aplicação, mas não deve interromper nem destruir o banco externo.
- O primeiro objetivo será implantação reproduzível e recuperação previsível. Alta disponibilidade da aplicação exigirá outros nós, embora a persistência já esteja isolada externamente.

## 3. Estado atual e lacunas

O repositório já possui:

- Dockerfile multi-stage;
- Docker Compose com aplicação, SQLite, PostgreSQL e MySQL opcionais;
- endpoints `/health`, `/ready`, `/live` e `/metrics`;
- migrações TypeORM executadas no startup;
- suporte a variáveis de ambiente e OAuth;
- configurações locais de Prometheus, Grafana e Tempo.

Antes da produção, ainda será necessário:

- trocar `npm install` por `npm ci` nos builds;
- executar a imagem final com usuário não root;
- adicionar `NODE_ENV=production` e revisar permissões de escrita;
- passar `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` como `ARG`/`ENV` no build do frontend no Dockerfile — hoje não existe nenhum `ARG` no Dockerfile, então a imagem buildada cairia no placeholder `http://localhost` de `src/supabaseClient.ts` (o mesmo problema já encontrado e corrigido no dev local) e signup/login quebrariam silenciosamente em produção. `VITE_API_URL` não é necessário neste deploy (frontend e backend no mesmo domínio/origem, `/api` relativo já funciona);
- corrigir `/ready` para checar conexão real com o banco em vez de responder igual a `/health`/`/live` (ver seção 2.2.1) — necessário para o rolling update não mandar tráfego pra um pod ainda não pronto;
- publicar a imagem no GHCR;
- criar manifests Kustomize;
- criar pipeline CI/CD;
- configurar domínio, DNS e TLS;
- configurar conectividade segura, backup e recuperação do PostgreSQL do Supabase;
- separar migração de banco do startup de múltiplas réplicas antes de escalar;
- criar runbooks de deploy, rollback e recuperação.

## 4. Estrutura proposta no repositório

```text
.github/
  workflows/
    ci.yml
    publish-image.yml
    promote-production.yml

deploy/
  k8s/
    base/
      namespace.yaml
      deployment.yaml
      service.yaml
      service-account.yaml
      configmap.yaml
      kustomization.yaml
    overlays/
      production/
        ingress.yaml
        certificate.yaml
        network-policy.yaml
        resource-quota.yaml
        kustomization.yaml
        image-policy.yaml
    infrastructure/
      cert-manager/
      flux-system/
      monitoring/

docs/
  RUNBOOK_DEPLOYMENT.pt-BR.md
  RUNBOOK_ROLLBACK.pt-BR.md
  RUNBOOK_BACKUP_RESTORE.pt-BR.md
```

Os arquivos gerados pelo bootstrap do Flux devem ser mantidos no Git. Secrets só podem aparecer no repositório se estiverem criptografados com SOPS e a chave privada permanecer apenas fora dele.

## 5. Plano de execução

### Fase 0 — decisões e pré-requisitos

Objetivo: eliminar decisões implícitas antes de alterar o servidor.

Tarefas:

1. ~~Definir o domínio público~~ — decidido: `app.arthurmcp.io`, TLS via Let's Encrypt (cert-manager, Fase 8).
2. Confirmar IP público fixo ou estratégia de DNS dinâmico.
3. Confirmar acesso administrativo por SSH com chave.
4. Confirmar que o banco será o PostgreSQL do próprio projeto Supabase de produção (não um provedor de PostgreSQL separado) — mesmo projeto usado para Auth.
5. No dashboard do Supabase (Project Settings → Database), obter a connection string, decidir entre conexão direta e o connection pooler (PgBouncer), definir allowlist de IP/restrições de rede, retenção de backup e destino de exportações lógicas.
6. Definir branch de produção; recomendação inicial: `main`.
7. Definir janela aceitável de indisponibilidade para manutenção do host.
8. Confirmar que o projeto Supabase de produção existe e está configurado: "Confirm email" ativado, provedores Google/GitHub habilitados se forem usados, e `https://app.arthurmcp.io/oauth-callback` + `https://app.arthurmcp.io/reset-password` cadastrados em Authentication → URL Configuration → Redirect URLs (ver `docs/FLOWS.md`). Sem isso os fluxos de signup/OAuth/reset falham silenciosamente em produção.

Critério de conclusão:

- domínio, configuração do Postgres do Supabase (connection string, modo do pooler, backup) e política de atualização documentados.

### Fase 1 — preparar e proteger o Ubuntu

Objetivo: criar uma base mínima e recuperável.

Tarefas:

1. Atualizar o Ubuntu e habilitar atualizações automáticas de segurança.
2. Criar usuário administrativo sem login direto como root.
3. Usar autenticação SSH por chave e desabilitar senha após validar acesso alternativo.
4. Configurar firewall permitindo somente:
   - SSH a partir de origens administrativas conhecidas, quando possível;
   - HTTP `80/tcp`;
   - HTTPS `443/tcp`.
5. Habilitar sincronização de horário.
6. Verificar espaço em disco, memória, CPU e saúde do armazenamento.
7. Instalar Docker Engine pelo repositório oficial e o plugin Buildx.
8. Registrar inventário básico da máquina e procedimento de reinstalação.

Validação:

```bash
docker version
docker buildx version
sudo ufw status verbose
timedatectl status
```

Critério de conclusão:

- host acessível por chave, firewall ativo e Docker funcional.

### Fase 2 — endurecer e validar a imagem Docker

Objetivo: gerar uma imagem imutável, segura e reproduzível.

Tarefas no Dockerfile:

1. Usar Node.js 20 em versão controlada.
2. Usar `npm ci` com os lockfiles existentes.
3. Manter dependências de compilação somente nos stages de build.
4. Copiar somente artefatos e dependências necessárias para o runner.
5. Definir `NODE_ENV=production`.
6. Executar o processo com usuário não root.
7. Garantir escrita somente nos diretórios realmente necessários.
8. Preservar o health check.
9. Adicionar labels OCI com repositório, versão e SHA.
10. Gerar SBOM e executar scan de vulnerabilidades no pipeline.
11. Adicionar `ARG SUPABASE_URL`/`ARG SUPABASE_PUBLISHABLE_KEY` no stage `frontend-builder` (`ENV` a partir do `ARG`, antes do `npm run build`), e passá-los via `--build-arg` no workflow de publicação (Fase 4) — sem isso o frontend buildado usa o placeholder local e quebra em produção.
12. Corrigir `api/src/observability/health.controller.ts`'s `/ready` para checar conexão real com o banco (ex.: `SELECT 1` via `DataSource`) em vez de responder igual a `/health`/`/live` — pré-requisito para o `readinessProbe` da Fase 6 ter algum sentido.

Validação mínima:

```bash
docker build -t arthur-mcp:local .
docker run --rm -p 3000:3000 --env-file api/.env arthur-mcp:local
curl --fail http://localhost:3000/health
```

O arquivo `.env` usado localmente não deve ser copiado para a imagem nem commitado.

Critério de conclusão:

- imagem inicia como usuário não root, responde ao health check e não contém secrets.

### Fase 3 — criar o pipeline de integração contínua

Objetivo: impedir publicação de versões inválidas.

Criar `.github/workflows/ci.yml` para pull requests e pushes relevantes.

Jobs recomendados:

1. frontend:
   - `npm ci`;
   - `npm run type-check`;
   - `npm test`;
   - `npm run build`.
2. backend:
   - `npm ci --prefix api`;
   - `npm test --prefix api`;
   - `npm run build --prefix api`.
3. container:
   - validar build Docker;
   - executar scan;
   - opcionalmente iniciar a imagem e testar `/health`.
4. manifests:
   - renderizar `kubectl kustomize`;
   - validar schemas com `kubeconform`;
   - bloquear Secret em texto puro.

Aplicar permissões mínimas ao `GITHUB_TOKEN` e cancelamento de execuções antigas da mesma pull request.

Critério de conclusão:

- branch principal protegida contra merge quando qualquer verificação obrigatória falhar.

### Fase 4 — publicar imagens no GHCR

Objetivo: separar build de deploy e permitir rollback por imagem imutável.

Criar workflow disparado após sucesso da CI em `main`.

Tags recomendadas:

```text
ghcr.io/arthur-mcp-adapter/arthur-mcp-app:sha-<commit-completo>
ghcr.io/arthur-mcp-adapter/arthur-mcp-app:main
```

O Kubernetes deve implantar por digest ou por tag baseada em SHA, nunca depender apenas de `latest`.

O workflow deve:

1. autenticar no GHCR com `GITHUB_TOKEN`;
2. compilar uma vez;
3. publicar a imagem;
4. gerar metadados/SBOM;
5. assinar a imagem quando a política de supply chain for adotada;
6. tornar o package público;
7. registrar digest e SHA no resumo da execução.

Critério de conclusão:

- qualquer pessoa consegue baixar a imagem pública, mas somente o workflow autorizado consegue publicá-la.

### Fase 5 — instalar K3s e ferramentas administrativas

Objetivo: disponibilizar o cluster single-node.

Tarefas:

1. Instalar uma versão controlada do K3s.
2. Manter o Traefik padrão inicialmente.
3. Configurar acesso ao `kubectl` somente para administradores.
4. Validar node, DNS, storage class e ingress controller.
5. Instalar Flux CLI na estação administrativa.
6. Instalar ferramentas de validação, como `kubeconform`, `helm` e `sops`.

Validação:

```bash
sudo k3s kubectl get nodes
sudo k3s kubectl get pods --all-namespaces
sudo k3s kubectl get storageclass
sudo k3s kubectl get ingressclass
```

Critério de conclusão:

- node `Ready`, componentes do sistema saudáveis e armazenamento padrão disponível.

### Fase 6 — criar os manifests Kubernetes

Objetivo: executar a aplicação declarativamente.

Recursos mínimos:

- Namespace dedicado;
- ServiceAccount sem acesso à API Kubernetes;
- Deployment com uma réplica inicial;
- Service `ClusterIP`;
- ConfigMap para configurações não sensíveis;
- Secret externo ou criptografado;
- Ingress para o domínio público;
- probes de startup, readiness e liveness;
- requests e limits de CPU/memória;
- security context não root;
- NetworkPolicy;
- nenhum PersistentVolumeClaim para a aplicação, que deve permanecer stateless; volumes futuros só serão adicionados mediante necessidade explícita.

Configuração inicial sugerida para a aplicação:

```text
replicas: 1
containerPort: 3000
startupProbe: /live
readinessProbe: /ready
livenessProbe: /live
service: ClusterIP
automountServiceAccountToken: false
strategy: RollingUpdate (maxSurge: 1, maxUnavailable: 0 — explícito, não depender do arredondamento padrão)
terminationGracePeriodSeconds: 30
lifecycle.preStop: sleep 5   # dá tempo do Service parar de rotear antes do SIGTERM chegar
```

Sobre portas: a porta 5173 do Vite é exclusiva do dev local (`npm run dev`) e não existe em produção — o build do frontend vira arquivos estáticos servidos pelo próprio NestJS em `dist/public` na porta 3000 (ver `Dockerfile`). O caminho externo completo é `https://app.arthurmcp.io` (443, TLS do Let's Encrypt terminado no Traefik) → Ingress → Service → `containerPort: 3000`. Nenhum ajuste de porta é necessário na aplicação; o mapeamento 443→3000 é responsabilidade do Ingress/Service.

O endpoint `/health` pode ser usado para smoke tests externos. Readiness deve determinar entrada no balanceamento, e liveness não deve reiniciar o pod por uma indisponibilidade temporária do banco. Ver seção 2.2.1 para o raciocínio completo por trás de `maxSurge`/`preStop`/`terminationGracePeriodSeconds` — são o que efetivamente torna o rolling update "sem indisponibilidade", não apenas ter o Kubernetes instalado.

Antes de escalar para mais de uma réplica — **e já a partir do primeiro rolling update com `replicas: 1`, já que o passo acima roda 2 pods simultaneamente por alguns segundos**:

1. remover a corrida de `migrationsRun` entre pods;
2. criar Job controlado de migração;
3. confirmar que nenhum estado de sessão ou cache necessário fica apenas em memória;
4. confirmar pooling e limites de conexão do Postgres do Supabase para todas as réplicas — se usar o connection pooler (PgBouncer) em modo transaction, validar compatibilidade com prepared statements do TypeORM; preferir modo session ou conexão direta caso haja conflito;
5. testar rolling update e concorrência.

Critério de conclusão:

- `kubectl kustomize` renderiza recursos válidos e a aplicação responde dentro do cluster.

### Fase 7 — configurar secrets de forma segura

Objetivo: permitir GitOps sem expor credenciais no repositório público.

Opção recomendada para uma máquina própria: SOPS com age.

Modelo:

- chave pública age: pode ficar documentada;
- chave privada age: armazenada somente no cluster e em backup offline seguro;
- arquivo Secret: commitado apenas após criptografia com SOPS;
- Flux: descriptografa durante a reconciliação.

Secrets iniciais:

- `JWT_SECRET` (hoje só assina/verifica os tokens OAuth emitidos para clientes MCP de terceiros — não é mais a sessão de login do usuário, ver `docs/DESIGN_PATTERNS.md`);
- `DATABASE_URI` — connection string do PostgreSQL do próprio projeto Supabase (direta ou do pooler), não de um provedor de banco separado. **Atenção ao sufixo TLS**: com o driver `pg` atual, `?sslmode=require` sozinho passou a *verificar* a cadeia de certificados e rejeita o certificado do pooler do Supabase ("self-signed certificate"); a forma que funciona é `?uselibpqcompat=true&sslmode=require` (semântica libpq clássica, TLS sem verificação de CA — coerente com o `rejectUnauthorized: false` que `api/src/database/database.module.ts` aplica). Validado em produção em 2026-07-15;
- `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — obrigatórios, a aplicação não sobe sem eles (`api/src/config/env.validation.ts`). `SUPABASE_SECRET_KEY` é a service-role key e precisa do mesmo tratamento que os outros secrets; `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` também são necessários no build/runtime do **frontend** como `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` (não são secretos — a publishable key é pública por design — mas precisam estar disponíveis como build args da imagem do frontend, não só no Secret do backend);
- credenciais SMTP;
- credenciais de observabilidade externa, se houver.

Google/GitHub sign-in não usa mais Client ID/Secret desta aplicação — é OAuth nativo do Supabase, configurado no dashboard do projeto Supabase (Authentication → Providers), fora deste repositório e fora do Kubernetes. Não há `GOOGLE_CLIENT_SECRET`/`GITHUB_CLIENT_SECRET` nem callback `/api/auth/google/callback` para configurar aqui.

Critério de conclusão:

- busca no Git não encontra nenhum secret em texto puro e a perda do cluster não implica perda da única chave de descriptografia.

### Fase 8 — instalar cert-manager e publicar com TLS

Objetivo: expor a aplicação com HTTPS renovável automaticamente.

Tarefas:

1. Apontar o DNS de `app.arthurmcp.io` (registro A ou CNAME, conforme o provedor de DNS) para o IP público do host Ubuntu.
2. Instalar cert-manager conforme a versão suportada pelo cluster.
3. Criar um `ClusterIssuer` Let's Encrypt de staging.
4. Emitir certificado de teste para `app.arthurmcp.io`.
5. Trocar para issuer de produção (`letsencrypt-prod`) depois que o de staging validar a cadeia HTTP-01/DNS-01 corretamente.
6. Configurar redirecionamento HTTP para HTTPS.
7. Validar renovação e cadeia do certificado.
8. Atualizar Redirect URLs do Supabase (Fase 0, item 8) e `CORS_ORIGIN` do backend para `https://app.arthurmcp.io` assim que o domínio estiver servindo tráfego real.

Critério de conclusão:

- aplicação acessível somente por HTTPS e certificado gerenciado automaticamente.

### Fase 9 — instalar Flux e ativar atualização automática

Objetivo: fazer o servidor acompanhar a configuração versionada.

Como o repositório é público, o Flux pode fazer leitura sem uma deploy key. Escrita no repositório continuará restrita ao GitHub Actions ou a um bot controlado.

Sequência:

1. Instalar os controllers do Flux no cluster.
2. Criar `GitRepository` apontando para o repositório público e branch `main`.
3. Criar `Kustomization` apontando para `deploy/k8s/overlays/production`.
4. Configurar intervalo inicial de reconciliação, por exemplo cinco minutos.
5. Configurar health checks e timeout da reconciliação.
6. Fazer o workflow de promoção atualizar a referência imutável da imagem no overlay.
7. O Flux detecta o commit e executa o rollout.

Estratégia recomendada de promoção:

- CI e publicação acontecem a cada merge em `main`;
- somente após publicação bem-sucedida o workflow altera a referência da imagem;
- o commit de promoção contém o SHA e usa marcador para não disparar build recursivo;
- Flux reconcilia exclusivamente o estado commitado;
- nenhuma rotina executa `kubectl set image` diretamente a partir do GitHub Actions.

Para maior controle futuro, separar `main` de uma branch ou tag de produção e exigir aprovação manual no GitHub Environment antes do commit de promoção.

Critério de conclusão:

- um merge de teste publica uma imagem, altera o overlay, é reconciliado pelo Flux e aparece no histórico do Deployment.

### Fase 10 — PostgreSQL do Supabase, conectividade e migrações

Objetivo: proteger dados da aplicação.

Premissa definitiva: o banco não será executado na máquina Ubuntu nem dentro do K3s — é o PostgreSQL gerenciado do mesmo projeto Supabase já usado para Auth, não um provedor de banco separado.

Requisitos:

- usar o PostgreSQL gerenciado pelo Supabase;
- evitar SQLite para produção Kubernetes;
- exigir TLS na conexão (`sslmode=require` na `DATABASE_URI`) e usar a connection string fornecida pelo dashboard do Supabase (Project Settings → Database);
- restringir a origem por rede privada, VPN, tunnel ou pelas restrições de rede/IP allowlist do Supabase (Database → Network Restrictions), conforme o plano contratado;
- criar usuário exclusivo da aplicação com privilégios mínimos (Supabase permite roles/usuários adicionais no Postgres além do owner padrão);
- configurar pool e limite de conexões de acordo com o plano do Supabase e o número máximo de réplicas — decidir entre conexão direta e o connection pooler (PgBouncer); em modo transaction do pooler, validar que prepared statements do TypeORM funcionam ou usar modo session/conexão direta;
- manter `DATABASE_URI` somente no Secret criptografado ou no secret manager;
- habilitar backups automáticos e point-in-time recovery conforme disponível no plano do Supabase contratado (retenção varia por tier);
- manter exportação lógica periódica em local diferente do Supabase;
- testar restauração em uma instância isolada;
- monitorar latência, conexões, armazenamento, locks e falhas de autenticação (Supabase expõe parte disso no próprio dashboard/relatórios).

Na primeira versão single-replica, `migrationsRun` no startup é funcional, mas aumenta o acoplamento entre deploy e migração. A evolução planejada deve criar uma imagem/comando de migração e um Job executado uma única vez antes da promoção do Deployment. A migração precisa ter timeout, impedir execuções concorrentes e falhar sem substituir a versão saudável da aplicação.

Critério de conclusão:

- backup automatizado, retenção definida e restauração testada com sucesso.

### Fase 11 — observabilidade

Objetivo: detectar falhas antes ou logo após impacto ao usuário.

Implantação gradual:

1. Coletar métricas de `/metrics` com Prometheus.
2. Importar/adaptar os dashboards Grafana existentes.
3. Coletar logs estruturados com retenção limitada.
4. Integrar traces com Tempo quando o custo operacional for aceitável.
5. Configurar alertas mínimos:
   - aplicação indisponível;
   - rollout falhou;
   - pod reiniciando repetidamente;
   - disco acima de 80%;
   - backup falhou;
   - certificado próximo do vencimento;
   - erro HTTP 5xx acima do limite definido.

Em uma máquina única, a stack completa de observabilidade compete por memória e disco com a aplicação. Começar com métricas essenciais e retenção curta.

Critério de conclusão:

- dashboard operacional e pelo menos um canal de alerta testado.

### Fase 12 — rollback e recuperação

Objetivo: tornar falhas operáveis.

Rollback da aplicação:

1. identificar o último commit/digest saudável;
2. reverter o commit que promoveu a imagem;
3. enviar a reversão para o GitHub;
4. aguardar o Flux reconciliar;
5. confirmar rollout e `/health`;
6. registrar o incidente.

Não usar `kubectl rollout undo` como estado final, pois o Flux voltará a aplicar o estado presente no Git. Ele pode servir somente como mitigação emergencial autorizada, seguida imediatamente pela correção declarativa no repositório.

Recuperação do host:

1. reinstalar Ubuntu;
2. reinstalar K3s e Flux;
3. restaurar a chave privada age;
4. permitir que o Flux reconstrua recursos stateless;
5. restaurar apenas os dados locais realmente necessários aos componentes operacionais;
6. reconfigurar acesso seguro ao PostgreSQL do Supabase, que permanece independente do host;
7. validar aplicação, migrações, OAuth, métricas e certificados.

Critério de conclusão:

- rollback de aplicação e restore do banco executados ao menos uma vez em teste.

## 6. Política de atualização

### Aplicação

- merge em `main` inicia CI;
- somente CI verde publica imagem;
- imagem identificada por SHA/digest;
- promoção altera o estado declarativo no Git;
- Flux aplica automaticamente;
- falha de readiness impede que a nova versão receba tráfego;
- reversão ocorre por commit.

### Dependências

- usar Dependabot ou Renovate em pull requests;
- nunca atualizar dependências diretamente em produção;
- exigir CI verde antes do merge;
- revisar atualizações maiores manualmente.

### Ubuntu e K3s

- atualizações de segurança do Ubuntu podem ser automáticas;
- reboot deve ocorrer em janela planejada, pois o host é único;
- K3s deve ser atualizado em janela própria, após backup e leitura das notas de versão;
- cert-manager, Flux e controladores devem ser versionados no Git e atualizados por pull request.

## 7. Segurança específica para repositório público

Pode ser público:

- Dockerfile;
- workflows;
- manifests e charts;
- ConfigMaps sem credenciais;
- nomes de serviços, portas e health checks;
- imagem da aplicação;
- chave pública de criptografia;
- documentação operacional sem dados de acesso.

Não pode ser público:

- conteúdo de `.env`;
- JWT secret;
- OAuth client secrets;
- senha/URI completa do banco;
- chave privada age;
- kubeconfig;
- chave SSH;
- tokens GitHub pessoais;
- backups;
- dumps de banco;
- logs contendo tokens ou dados pessoais.

O pipeline deve incluir verificação de secrets, e o histórico Git deve ser considerado permanente. Se um secret for commitado, removê-lo do arquivo não basta: ele precisa ser revogado/rotacionado imediatamente.

## 8. Recursos mínimos sugeridos

Para aplicação, K3s e observabilidade básica na mesma máquina, com PostgreSQL gerenciado pelo Supabase:

- mínimo de laboratório: 2 vCPU, 4 GB RAM, 40 GB SSD;
- recomendação inicial de produção pequena: 4 vCPU, 8 GB RAM, 80 GB SSD;
- com Prometheus, Grafana, Tempo e retenção maior: considerar 16 GB RAM e disco separado/maior.

Esses valores são ponto de partida. Requests, limits e retenção devem ser ajustados após medição real.

## 9. Ordem recomendada de implementação

1. Preparar Ubuntu e Docker.
2. Endurecer Dockerfile.
3. Criar CI.
4. Publicar imagem pública no GHCR.
5. Instalar K3s.
6. Criar e validar manifests Kustomize.
7. Configurar secrets com SOPS/age.
8. Instalar cert-manager e TLS.
9. Instalar Flux e reconciliar manifests.
10. Ativar promoção automática por SHA/digest.
11. Configurar PostgreSQL do Supabase, conectividade, pooling e backups.
12. Implantar observabilidade e alertas.
13. Executar testes de rollback e recuperação.

## 10. Checklist de aceite final

- [ ] Ubuntu protegido e documentado.
- [ ] Docker e Buildx instalados.
- [ ] Imagem executa como não root.
- [ ] CI obrigatória em pull requests.
- [ ] Imagem pública no GHCR por SHA/digest.
- [ ] K3s saudável em single-node.
- [ ] Manifests versionados e validados.
- [ ] Nenhum secret em texto puro no Git.
- [ ] TLS válido e renovável automaticamente.
- [ ] Flux reconciliando o repositório público.
- [ ] Merge em `main` promove nova imagem automaticamente.
- [ ] Readiness bloqueia versão defeituosa.
- [ ] PostgreSQL do Supabase protegido por TLS e restrição de origem.
- [ ] Backup externo automatizado.
- [ ] Restauração testada.
- [ ] Métricas e alertas essenciais ativos.
- [ ] Rollback por Git testado.
- [ ] Runbooks revisados.

## 11. Próxima etapa recomendada

Executar somente as Fases 0 a 2 primeiro: confirmar domínio/banco/backup, preparar o Ubuntu e endurecer o Dockerfile. Depois disso, implementar CI e publicação no GHCR antes de instalar Kubernetes. Essa ordem garante que o cluster receba um artefato já validado e reproduzível.

## 12. Referências oficiais

- K3s: <https://docs.k3s.io/>
- Docker Engine no Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>
- Publicação de imagens com GitHub Actions: <https://docs.github.com/actions/publishing-packages/publishing-docker-images>
- GitHub Container Registry: <https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry>
- Flux: <https://fluxcd.io/flux/>
- Flux Git repositories: <https://fluxcd.io/flux/components/source/gitrepositories/>
- Kustomize: <https://kubectl.docs.kubernetes.io/guides/introduction/kustomize/>
- cert-manager: <https://cert-manager.io/docs/>
- SOPS: <https://getsops.io/>
- Kubernetes probes: <https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/>
- Kubernetes security contexts: <https://kubernetes.io/docs/tasks/configure-pod-container/security-context/>
