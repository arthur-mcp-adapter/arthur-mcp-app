# MCP Convert — Product Backlog & Roadmap

> Última atualização: 2026-06-15
> Product Owner review: baseado na análise do ecossistema MCP (13k+ servidores), pain points da comunidade e estado atual da codebase.

---

## Estado atual (já implementado)

- Import OpenAPI/Swagger/Postman (upload + URL + auto-discovery)
- Preview de spec antes de salvar
- Multi API keys nomeadas por projeto
- Rate limiting configurável por projeto
- Availability windows (dias/horas/timezone)
- Maintenance mode com mensagem customizável
- Pause/unpause de projeto (retorna 503)
- Auth: bearer / api-key / basic / oauth2-client-credentials / custom headers
- Cache em memória 60s com invalidação por evento
- Tool enable/disable, rename, edição completa, adição manual, remoção
- Tool comments (anotações internas)
- Execution logs + Audit logs
- Alert config (threshold de erro + e-mail)
- Share link (token JWT 30d) → página pública de setup do cliente
- Duplicate project
- Re-import spec (preserva enabled/description das tools)
- Dashboard React/MUI admin

---

## Backlog Priorizado

### Prioridade: CRÍTICA — bloqueia o primeiro release público

---

#### US-01 — Docker Compose de produção

**Como** desenvolvedor que quer testar o MCP Convert,
**Quero** rodar `docker compose up` e ter o sistema funcionando em menos de 3 minutos,
**Para que** eu não precise instalar Node, Mongo ou configurar nada manualmente.

**Critérios de aceite:**
- [ ] `docker-compose.prod.yml` na raiz do repo com services: backend NestJS (build multi-stage), frontend Nginx (build estático), MongoDB
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] Frontend servido por Nginx (sem Vite dev server no container)
- [ ] Health checks configurados nos containers
- [ ] `docker compose up` resulta em dashboard acessível em `http://localhost:3000`
- [ ] Sem mensagens de erro no console ao subir pela primeira vez

**Justificativa:** O pain point #1 da comunidade é não conseguir rodar na primeira tentativa. Hoje o projeto usa o Vite dev server dentro do container — isso é inaceitável para produção e afasta contribuidores. Sem isso, qualquer divulgação é contraproducente.

---

#### US-02 — Botão "Copiar config Claude Desktop"

**Como** usuário que acabou de criar um projeto no MCP Convert,
**Quero** clicar em um botão e ter o JSON do `claude_desktop_config.json` copiado para minha área de transferência,
**Para que** eu conecte meu projeto ao Claude Desktop em menos de 30 segundos sem precisar consultar a documentação.

**Critérios de aceite:**
- [ ] Botão "Copy Claude Desktop config" visível na página de detalhes do projeto
- [ ] JSON gerado inclui a URL correta do MCP endpoint e a API key selecionada (se houver)
- [ ] Botão muda para "Copied!" por 2s após clicar
- [ ] JSON é válido e funciona sem edição manual no Claude Desktop
- [ ] Documentação inline mostra onde colar o JSON no arquivo de configuração

**Justificativa:** A página de share link já existe, mas o fluxo ainda exige que o usuário monte o JSON manualmente. Reduzir esse atrito é o segundo passo mais impactante para first-run experience.

---

#### US-03 — README com quick-start visual (< 2 min)

**Como** desenvolvedor que encontrou o projeto no GitHub,
**Quero** ver no README um GIF ou conjunto de screenshots mostrando o fluxo completo,
**Para que** eu entenda o valor do projeto em 30 segundos e consiga rodar em menos de 2 minutos.

**Critérios de aceite:**
- [ ] GIF ou vídeo no README mostrando: `docker compose up` → upload do spec → copy Claude Desktop config → tool funcionando no Claude
- [ ] Seção "Quick Start" com no máximo 4 comandos
- [ ] Badge de status do CI visível no topo
- [ ] Links diretos para: Glama.ai listing, GitHub Registry, Discord/fórum
- [ ] Seção de exemplos com links para specs públicas (Stripe, GitHub, Notion)

**Justificativa:** 80% dos visitantes de repositórios open source decidem em menos de 60s se vale o tempo. README fraco = usuários perdidos antes de tentar.

---

#### US-04 — GitHub Actions CI (lint + build + test)

**Como** mantenedor do projeto,
**Quero** que cada PR passe por lint, build e testes automatizados antes de ser mergeado,
**Para que** contribuições externas não quebrem o projeto e eu possa aceitar PRs com confiança.

**Critérios de aceite:**
- [ ] Workflow `.github/workflows/ci.yml` executando em push para `main` e em PRs
- [ ] Jobs: lint (ESLint/Prettier), build (NestJS + React), unit tests
- [ ] Build da imagem Docker incluído no CI
- [ ] Badge de CI no README
- [ ] Falhas de build bloqueiam merge do PR
- [ ] Tempo total do CI abaixo de 5 minutos

**Justificativa:** Sem CI, qualquer contribuição externa é um risco. Isso é pré-requisito para aceitar PRs da comunidade e para a publicação no GitHub Registry.

---

### Prioridade: ALTA — diferencial competitivo direto

---

#### US-05 — Slim Schema (compactação de descriptions no ListTools)

**Como** desenvolvedor que usa o MCP Convert com uma API grande (50+ endpoints),
**Quero** ativar um modo "slim" que encurta ou omite as descriptions das tools no `ListTools`,
**Para que** o contexto enviado ao LLM seja menor e eu não desperdice tokens da context window.

**Critérios de aceite:**
- [ ] Campo `slimSchema: boolean` por projeto no schema do MongoDB
- [ ] Quando ativo, `ListTools` retorna descriptions truncadas em 80 chars (ou omitidas se `null`)
- [ ] Toggle visível no dashboard na página do projeto
- [ ] Estimativa de "tokens economizados" exibida no dashboard (comparação slim vs full)
- [ ] Sem impacto no comportamento do `CallTool`

**Justificativa:** Context window bloat é o pain point #1 do ecossistema MCP. Nenhum concorrente direto (mcp-openapi-proxy, IBM ContextForge) oferece isso via UI. É o argumento técnico mais forte para adoção por devs que já sofreram com esse problema.

---

#### US-06 — Tool filtering por API key

**Como** administrador de um projeto com muitas ferramentas,
**Quero** restringir quais tools cada API key pode acessar,
**Para que** eu exponha apenas as ferramentas relevantes para cada cliente/agente, reduzindo exposição e context window.

**Critérios de aceite:**
- [ ] Campo `allowedTools: string[]` adicionado a `McpApiKeyEntry` no schema
- [ ] UI no dashboard para selecionar tools permitidas por API key (multi-select com busca)
- [ ] `ListTools` retorna apenas as tools da `allowedTools` quando a key tem restrição
- [ ] API key sem `allowedTools` definido tem acesso a todas as tools (backward-compat)
- [ ] Contagem de tools permitidas visível na listagem de API keys

**Justificativa:** Complementa o Slim Schema no combate ao context bloat. Permite casos de uso multi-tenant onde clientes diferentes têm acesso a subsets diferentes da API. Diferencial em relação a todos os concorrentes listados.

---

#### US-07 — `/.well-known/mcp.json` discovery endpoint

**Como** cliente MCP (agente ou ferramenta de terceiros),
**Quero** fazer um GET em `/.well-known/mcp.json` de qualquer projeto e receber os metadados de conexão,
**Para que** eu possa descobrir e conectar ao MCP server sem consultar o dashboard.

**Critérios de aceite:**
- [ ] Endpoint `GET /api/mcp/project/:id/.well-known/mcp.json` (ou equivalente público)
- [ ] Resposta inclui: `name`, `version`, `mcpEndpoint`, `authRequired`, `toolCount`, `description`
- [ ] Endpoint não requer autenticação (é público por design)
- [ ] Content-Type `application/json`
- [ ] Documentado no README com exemplo de resposta

**Justificativa:** Padrão emergente no ecossistema MCP para auto-discovery. Facilita integração com ferramentas de terceiros e registries automatizados.

---

#### US-08 — Webhooks de alerta (Slack / Discord / generic HTTP)

**Como** operador de um MCP Convert em produção,
**Quero** receber uma notificação no Slack ou Discord quando a taxa de erro de um projeto ultrapassar o threshold configurado,
**Para que** eu saiba de problemas antes que os usuários reclamem.

**Critérios de aceite:**
- [ ] Campo `webhookUrl` e `webhookType: 'slack' | 'discord' | 'generic'` no `alertConfig` do schema
- [ ] Worker que verifica error rate a cada minuto e dispara webhook quando threshold é atingido
- [ ] Payload Slack-compatible (attachments com cor vermelha, nome do projeto, error rate, link para o dashboard)
- [ ] Cooldown de 15 minutos entre alertas do mesmo projeto (evita spam)
- [ ] Botão "Test webhook" no dashboard que envia notificação de teste
- [ ] Alert resolvido também envia notificação (volta ao verde)

**Justificativa:** `alertConfig` já existe no schema com `notifyEmail` mas sem implementação real. Webhooks têm maior adoção que e-mail para alertas de infraestrutura na comunidade dev.

---

### Prioridade: MÉDIA — maturidade e escala

---

#### US-09 — OpenTelemetry tracing

**Como** engenheiro de plataforma que opera o MCP Convert em produção com múltiplos projetos,
**Quero** ter traces distribuídos de cada chamada MCP (tool → HTTP → resposta),
**Para que** eu identifique gargalos de latência e erros em ferramentas específicas.

**Critérios de aceite:**
- [ ] Integração com `@opentelemetry/sdk-node` no backend NestJS
- [ ] Span criado para cada `CallTool` com atributos: `project.id`, `tool.name`, `http.method`, `http.url`, `http.status_code`, `duration_ms`
- [ ] Exportador OTLP configurável via env vars (`OTEL_EXPORTER_OTLP_ENDPOINT`)
- [ ] Compatível com Jaeger, Grafana Tempo, Honeycomb (padrão OTLP)
- [ ] Feature flag via `OTEL_ENABLED=true` (off por padrão para não exigir infra extra)
- [ ] Documentação de como visualizar traces no Jaeger local via Docker Compose

**Justificativa:** Observabilidade é o pain point #3 da comunidade MCP. Logs de execução já existem, mas traces distribuídos são o próximo nível e habilitam adoção por empresas que já têm stack de observabilidade.

---

#### US-10 — Redis opcional para cache distribuído

**Como** operador que roda múltiplas instâncias do MCP Convert (horizontal scaling),
**Quero** configurar Redis como backend de cache em vez do Map em memória,
**Para que** todas as instâncias compartilhem o cache e não hajam inconsistências.

**Critérios de aceite:**
- [ ] Abstração `CacheProvider` com duas implementações: `InMemoryCache` (atual) e `RedisCache`
- [ ] Configurado via env var `REDIS_URL` — se ausente, usa in-memory (backward-compat total)
- [ ] TTL configurável via `CACHE_TTL_SECONDS` (padrão 60)
- [ ] `invalidate(projectId)` funciona corretamente no Redis (deleta a chave)
- [ ] Documentação no README de como adicionar Redis ao docker-compose.prod.yml
- [ ] Sem impacto em nenhum comportamento existente quando Redis não está configurado

**Justificativa:** O cache atual é in-process e não escala para múltiplas réplicas. Redis é prerequisito para qualquer deploy sério em Kubernetes ou com load balancer.

---

#### US-11 — CLI `npx mcp-convert init`

**Como** desenvolvedor que já tem uma API com spec OpenAPI,
**Quero** rodar `npx mcp-convert init` no terminal e ter um MCP server funcionando localmente,
**Para que** eu avalie o produto sem precisar subir o dashboard.

**Critérios de aceite:**
- [ ] Pacote npm `mcp-convert` publicado com binário `mcp-convert`
- [ ] Comando `init` pergunta: URL do spec (ou path local), baseUrl, tipo de auth
- [ ] Gera `mcp-convert.config.json` com as configurações informadas
- [ ] Comando `start` lê o config e sobe um MCP server local na porta 3001
- [ ] Output inclui a linha de config para `claude_desktop_config.json`
- [ ] Funciona com Node 18+, sem dependência de Docker

**Justificativa:** Reduz drasticamente o time-to-value para devs que querem testar antes de commitar com infraestrutura. CLI é o segundo canal de distribuição mais importante depois do Docker.

---

#### US-12 — OAuth 2.1 + PKCE para auth de usuários do dashboard

**Como** empresa que self-hosta o MCP Convert,
**Quero** autenticar no dashboard via meu provedor de identidade corporativo (Google, Azure AD, Okta),
**Para que** eu não precise gerenciar senhas separadas e tenha SSO integrado.

**Critérios de aceite:**
- [ ] Suporte a OAuth 2.1 + PKCE como método de login no dashboard
- [ ] Configurável via env vars: `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_ISSUER_URL`
- [ ] Funciona com providers compatíveis com OIDC (Google, Azure AD, Okta, Keycloak)
- [ ] Sessão gerenciada via JWT com refresh token
- [ ] Login local (usuário/senha) permanece disponível como fallback
- [ ] Documentação de como configurar com Google OAuth e Azure AD

**Justificativa:** Pain point #4 do ecossistema. Requisito hard para adoção enterprise. Sem SSO, empresas não aprovam self-hosting em ambientes corporativos.

---

#### US-13 — semantic-release + CONTRIBUTING.md

**Como** contribuidor externo ao projeto,
**Quero** encontrar documentação clara de como contribuir e ver releases com changelogs automáticos,
**Para que** eu possa submeter PRs com confiança e acompanhar a evolução do projeto.

**Critérios de aceite:**
- [ ] `CONTRIBUTING.md` na raiz com: pré-requisitos, como rodar localmente, convenção de commits (Conventional Commits), processo de PR
- [ ] `semantic-release` configurado para gerar versão e CHANGELOG automaticamente no push para `main`
- [ ] Issues no GitHub com labels `good first issue`, `help wanted`, `bug`, `enhancement`
- [ ] Template de Pull Request no `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Template de Issue no `.github/ISSUE_TEMPLATE/`
- [ ] Release publicado automaticamente no GitHub Releases com assets (Docker image tags)

**Justificativa:** Projetos open source sem guia de contribuição recebem 60% menos PRs. semantic-release elimina o trabalho manual de versionamento e sinaliza maturidade para a comunidade.

---

#### US-14 — GHCR + Docker Hub publish no CI

**Como** usuário que quer rodar o MCP Convert,
**Quero** poder fazer `docker pull ghcr.io/owner/mcp-convert:latest` sem precisar buildar localmente,
**Para que** o onboarding seja ainda mais rápido.

**Critérios de aceite:**
- [ ] GitHub Actions workflow publica imagem no GHCR em cada release
- [ ] Tags publicadas: `latest`, `v{major}`, `v{major}.{minor}`, `v{major}.{minor}.{patch}`
- [ ] Multi-arch: `linux/amd64` e `linux/arm64` (M1/M2 Macs)
- [ ] Imagem base slim (Node 20-alpine)
- [ ] `docker-compose.prod.yml` usa a imagem do GHCR por padrão (pull, não build local)
- [ ] README atualizado com o comando de pull

**Justificativa:** Elimina o passo de build local — usuários simplesmente puxam a imagem pronta. Multi-arch é obrigatório para não alienar a maioria dos devs que usam Apple Silicon.

---

### Prioridade: BAIXA — crescimento e ecossistema

---

#### US-15 — Exemplos de integração com APIs públicas

**Como** desenvolvedor que quer ver o MCP Convert em ação com APIs reais,
**Quero** encontrar exemplos prontos de projetos configurados para Stripe, GitHub e Notion,
**Para que** eu entenda o potencial e adapte para minha própria API.

**Critérios de aceite:**
- [ ] Pasta `/examples` no repo com configs JSON para: Stripe API, GitHub REST API, Notion API
- [ ] Cada exemplo inclui: spec OpenAPI (ou URL), baseUrl, tipo de auth necessário, quais tools são mais úteis
- [ ] README dos exemplos com screenshots de cada tool sendo usada no Claude Desktop
- [ ] Exemplos importáveis via botão "Import example" no dashboard

**Justificativa:** Cada exemplo é uma keyword — "Stripe MCP server", "GitHub MCP server" — que gera tráfego orgânico. É marketing de conteúdo com custo zero.

---

#### US-16 — Testes E2E com Testcontainers

**Como** mantenedor do projeto,
**Quero** ter testes end-to-end que sobem um MongoDB real em container e testam o fluxo completo,
**Para que** eu detecte regressões antes de publicar uma nova versão.

**Critérios de aceite:**
- [ ] Setup com `testcontainers-node` para MongoDB
- [ ] Testes E2E cobrindo: criar projeto via upload de spec, gerar API key, executar tool via MCP, verificar execution log
- [ ] Testes rodam no CI sem dependência de infra externa
- [ ] Cobertura de pelo menos os 5 fluxos críticos (create, reimport, call tool, rate limit, maintenance mode)
- [ ] Relatório de cobertura publicado no CI

**Justificativa:** Testes de integração detectam regressões que unit tests não pegam (ex: mudanças no schema do Mongoose, interações entre services). Pré-requisito para aceitar PRs com confiança.

---

#### US-17 — Cadastro nos registries públicos MCP

**Como** projeto open source,
**Quero** estar listado no Glama.ai e no GitHub MCP Registry,
**Para que** desenvolvedores que procuram soluções MCP me encontrem organicamente.

**Critérios de aceite:**
- [ ] Projeto listado em Glama.ai com descrição, tags e link para repo
- [ ] PR submetido para o GitHub MCP Registry (github.com/github/mcp-servers)
- [ ] Tags no repositório: `mcp-server`, `openapi`, `swagger`, `rest-api`, `model-context-protocol`
- [ ] Repositório com `mcp.json` ou similar que registries possam parsear automaticamente

**Justificativa:** Glama.ai tem 35k+ servidores listados e é o principal ponto de descoberta da comunidade MCP. Custo zero, impacto direto em adoção.

---

## MVP v1.0 — Primeiro release público

**Objetivo:** Um dev consegue transformar qualquer API REST em MCP server em menos de 5 minutos, self-hosted, sem precisar escrever código.

**O que entra no v1.0:**

| # | Feature | US |
|---|---------|-----|
| 1 | Docker Compose de produção (Nginx + NestJS + MongoDB) | US-01 |
| 2 | Botão "Copiar config Claude Desktop" | US-02 |
| 3 | README com quick-start visual | US-03 |
| 4 | GitHub Actions CI (lint + build) | US-04 |
| 5 | Slim Schema (toggle por projeto) | US-05 |
| 6 | Tool filtering por API key | US-06 |
| 7 | `/.well-known/mcp.json` discovery | US-07 |
| 8 | GHCR publish automático | US-14 |
| 9 | CONTRIBUTING.md + semantic-release | US-13 |
| 10 | Cadastro no Glama.ai e GitHub Registry | US-17 |

**O que NÃO entra no v1.0 (scope cut intencional):**
- OpenTelemetry (infraestrutura extra, não é day-1)
- Redis cache (in-memory é suficiente para self-hosted single instance)
- OAuth 2.1/SSO (complexidade alta, público inicial são devs individuais)
- CLI npx (segundo canal de distribuição, não bloqueia o primeiro)
- Testes E2E Testcontainers (importante, mas não bloqueia o release)

**Critério de "done" do v1.0:**
- docker compose up funciona em Mac/Linux/Windows (WSL2)
- Um usuário sem conhecimento prévio do projeto consegue ter uma tool funcionando no Claude Desktop em menos de 5 minutos
- Imagem Docker disponível no GHCR
- Projeto listado no Glama.ai

---

## Roadmap de Releases

### v1.0 — "Make it work" (meta: 4-6 semanas)
**Tema:** First-run experience impecável e presença no ecossistema.

Entregas:
- US-01 Docker Compose produção
- US-02 Botão Claude Desktop config
- US-03 README com quick-start visual
- US-04 GitHub Actions CI
- US-05 Slim Schema
- US-06 Tool filtering por API key
- US-07 `/.well-known/mcp.json`
- US-13 CONTRIBUTING.md + semantic-release
- US-14 GHCR publish
- US-17 Cadastro nos registries

**Métricas de sucesso:**
- 100 GitHub stars no mês do lançamento
- Listado no Glama.ai
- 0 issues abertas de "não consigo rodar"

---

### v1.1 — "Make it observable" (meta: 8-10 semanas após v1.0)
**Tema:** Confiança em produção — você sabe o que está acontecendo.

Entregas:
- US-08 Webhooks de alerta (Slack/Discord)
- US-09 OpenTelemetry tracing
- US-10 Redis cache distribuído
- US-15 Exemplos de integração (Stripe, GitHub, Notion)
- US-16 Testes E2E Testcontainers
- Correções e polish baseados no feedback da v1.0

**Métricas de sucesso:**
- Pelo menos 1 empresa self-hostando em produção
- 3 exemplos de integração com APIs públicas documentados
- Cobertura de testes E2E > 80% dos fluxos críticos

---

### v2.0 — "Make it enterprise-ready" (meta: 6 meses após v1.0)
**Tema:** Adoção corporativa — SSO, multi-tenant, escala.

Entregas:
- US-12 OAuth 2.1 + PKCE (SSO corporativo)
- US-11 CLI `npx mcp-convert init`
- Multi-tenancy: múltiplos usuários com roles (admin/viewer) — nova US a detalhar
- Rate limiting por usuário/org além de por projeto
- Webhook de eventos granulares (tool called, project created, key rotated) — nova US a detalhar
- API pública de gerenciamento (CRUD de projetos via REST) — nova US a detalhar
- Suporte a AsyncAPI (websockets/events) — nova US a detalhar

**Métricas de sucesso:**
- Pelo menos 1 empresa com 10+ usuários usando em produção
- CLI com 500+ downloads/semana no npm
- Integração com pelo menos 1 identity provider corporativo documentada e testada

---

## Notas de priorização

**Por que Docker Compose e README antes de features?**
O ecossistema tem 13.000+ servidores MCP e a maioria falha no onboarding. Um projeto que funciona perfeitamente mas ninguém consegue rodar tem zero adoção. A regra é: antes de adicionar qualquer feature, garanta que a feature atual seja acessível a quem nunca viu o projeto.

**Por que Slim Schema e Tool Filtering antes de Observabilidade?**
Context window bloat é o problema #1 citado pela comunidade. São features que os primeiros adotantes vão usar ativamente e mencionar em posts/reviews — geram word-of-mouth. Observabilidade é importante mas é feature de "fase 2" (quando você já tem usuários em produção para observar).

**Por que OAuth 2.1 fica no v2.0?**
O público do v1.0 são devs individuais e small teams. Para eles, auth local é suficiente. Implementar OAuth cedo aumenta a complexidade do onboarding (exige configurar um provider) sem benefício para o público inicial. Fica no v2.0 quando o público-alvo muda para enterprise.




















MVP v1.0 — "Make it work" (4-6 semanas)

As 4 críticas primeiro:

Docker Compose produção real (sem Vite dev server no container)
Botão "Copiar config Claude Desktop" no dashboard
README com quick-start visual
GitHub Actions CI
Depois os diferenciais competitivos:
5. Slim Schema — compacta descriptions no ListTools (nenhum concorrente tem isso via UI)
6. Tool filtering por API key — expõe subsets de tools por cliente
7. /.well-known/mcp.json discovery
8. Webhooks de alerta (Slack/Discord)
9. Cadastro no Glama.ai + GitHub MCP Registry
10. Exemplos prontos (Stripe, GitHub, Notion)

v1.1 — observabilidade: OpenTelemetry, Redis, testes E2E, semantic-release

v2.0 — enterprise: OAuth 2.1 + PKCE, CLI npx mcp-convert init, multi-tenancy

O corte mais importante do MVP foi OAuth 2.1 e Redis — não bloqueiam adoção inicial e têm esforço alto. O que bloqueia adoção é o first-run experience ruim e não aparecer nos registries onde a comunidade procura.

Quer começar por algum item específico?