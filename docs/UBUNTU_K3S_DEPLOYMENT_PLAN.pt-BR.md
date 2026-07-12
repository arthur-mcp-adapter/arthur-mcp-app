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
| Banco | PostgreSQL externo/gerenciado | Persistência isolada do host da aplicação |
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
- publicar a imagem no GHCR;
- criar manifests Kustomize;
- criar pipeline CI/CD;
- configurar domínio, DNS e TLS;
- configurar conectividade segura, backup e recuperação do PostgreSQL externo;
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

1. Definir o domínio público, por exemplo `arthur.example.com`.
2. Confirmar IP público fixo ou estratégia de DNS dinâmico.
3. Confirmar acesso administrativo por SSH com chave.
4. Escolher o provedor ou servidor externo de PostgreSQL.
5. Definir endpoint privado/público, TLS, allowlist de IP, usuário, banco, retenção de backup e destino de exportações lógicas.
6. Definir branch de produção; recomendação inicial: `main`.
7. Definir janela aceitável de indisponibilidade para manutenção do host.

Critério de conclusão:

- domínio, PostgreSQL externo, conectividade, destino de backup e política de atualização documentados.

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
```

O endpoint `/health` pode ser usado para smoke tests externos. Readiness deve determinar entrada no balanceamento, e liveness não deve reiniciar o pod por uma indisponibilidade temporária do banco.

Antes de escalar para mais de uma réplica:

1. remover a corrida de `migrationsRun` entre pods;
2. criar Job controlado de migração;
3. confirmar que nenhum estado de sessão ou cache necessário fica apenas em memória;
4. confirmar pooling e limites de conexão do PostgreSQL externo para todas as réplicas;
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

- `JWT_SECRET`;
- `DATABASE_URI` ou senha do PostgreSQL;
- `GOOGLE_CLIENT_SECRET`;
- `GITHUB_CLIENT_SECRET`;
- credenciais SMTP;
- credenciais de observabilidade externa, se houver.

Os OAuth Client IDs não são senhas, mas devem permanecer na configuração apropriada para evitar divergências. Os callbacks devem usar exatamente:

```text
https://<dominio>/api/auth/google/callback
https://<dominio>/api/auth/github/callback
```

Critério de conclusão:

- busca no Git não encontra nenhum secret em texto puro e a perda do cluster não implica perda da única chave de descriptografia.

### Fase 8 — instalar cert-manager e publicar com TLS

Objetivo: expor a aplicação com HTTPS renovável automaticamente.

Tarefas:

1. Apontar DNS do domínio para o IP público.
2. Instalar cert-manager conforme a versão suportada pelo cluster.
3. Criar um `ClusterIssuer` Let's Encrypt de staging.
4. Emitir certificado de teste.
5. Trocar para issuer de produção.
6. Configurar redirecionamento HTTP para HTTPS.
7. Validar renovação e cadeia do certificado.

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

### Fase 10 — PostgreSQL externo, conectividade e migrações

Objetivo: proteger dados da aplicação.

Premissa definitiva: o banco não será executado na máquina Ubuntu nem dentro do K3s.

Requisitos:

- usar PostgreSQL externo, preferencialmente gerenciado;
- evitar SQLite para produção Kubernetes;
- exigir TLS na conexão e validar a cadeia do servidor sempre que o provedor permitir;
- restringir a origem por rede privada, VPN, tunnel ou allowlist do IP do host Ubuntu;
- criar usuário exclusivo da aplicação com privilégios mínimos;
- configurar pool e limite de conexões de acordo com o plano do banco e o número máximo de réplicas;
- manter `DATABASE_URI` somente no Secret criptografado ou no secret manager;
- habilitar backups automáticos, retenção e point-in-time recovery quando disponíveis;
- manter exportação lógica periódica em local diferente do provedor do banco;
- testar restauração em uma instância isolada;
- monitorar latência, conexões, armazenamento, locks e falhas de autenticação.

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
6. reconfigurar acesso seguro ao PostgreSQL externo, que permanece independente do host;
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

Para aplicação, K3s e observabilidade básica na mesma máquina, com PostgreSQL externo:

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
11. Configurar PostgreSQL externo, conectividade, pooling e backups.
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
- [ ] PostgreSQL externo protegido por TLS e restrição de origem.
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
