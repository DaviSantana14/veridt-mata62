# Visualizar Detalhes dos Registros Realizados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o REQ 13 para que `/registros/:id` mostre detalhes reais do registro selecionado, incluindo nome e email do usuario responsavel.

**Architecture:** O `capture-service` continua sendo dono dos dados de captura e ja expoe `GET /records/:recordId`. O `identity-service` continua sendo dono dos dados do usuario e ja expoe `GET /users/:id` pelo API Gateway. O frontend compoe os dois dados via API Gateway, sem chamada direta a microsservicos e sem criar rota nova desnecessaria.

**Tech Stack:** Next.js 16 App Router, React 19, NestJS 11, Prisma, PostgreSQL, TypeScript, Jest, Node architecture tests.

---

## Contexto Confirmado

- O PDF `docs/veridit-req.pdf` define o REQ 13 como: o sistema deve disponibilizar os dados do registro selecionado pelo usuario com base no Apendice A.
- Campos do Apendice A para `Detalhes dos registros`:
  - id gerado pelo sistema;
  - titulo;
  - data/hora inicio;
  - data/hora fim;
  - tipos de dados registrados;
  - informacoes dos dados, com numero de imagens e videos;
  - usuario responsavel pelo registro.
- Decisao de produto: usuario responsavel deve aparecer como nome e email.
- `ContentRecord` e `CaptureAsset` vivem no banco do `capture-service`.
- Nome/email do usuario vivem no banco do `identity-service`.
- O API Gateway ja expoe:
  - `GET /capture/records/:recordId`;
  - `GET /identity/users/:id`.
- O frontend ja tem helpers:
  - `getCaptureRecord(recordId)` em `apps/web/src/lib/gateway.ts`;
  - `getUserProfile(userId)` em `apps/web/src/lib/gateway.ts`.
- A pagina `apps/web/src/app/registros/[id]/page.tsx` existe, mas ainda usa `getRecordById` e `chainOfCustody` de `apps/web/src/lib/mock-data.ts`.
- A pagina `apps/web/src/app/captura/concluida/page.tsx` ja mostra um detalhe minimo real usando `getCaptureRecord(recordId)`. Ela deve servir como referencia de formatacao e estados de erro, mas nao substitui `/registros/:id`.
- O dashboard ja lista registros reais, mas atualmente as acoes de registros finalizados apontam para `/captura/concluida?recordId=...`. Para REQ 13, o fluxo oficial de detalhes deve apontar para `/registros/:id`.

## Referencias Validadas

- Context7 confirmou que, no Next.js App Router atual, paginas com rota dinamica recebem `params` como `Promise` em Server Components e devem usar `await params`.
- Context7 confirmou o padrao NestJS de `@Get(':id')` com `@Param('id')`, e que rotas parametrizadas devem respeitar ordem para nao interceptar caminhos mais especificos.
- Context7 confirmou que Prisma Client suporta `include`, `select` e contagens filtradas de relacoes. Para este requisito, a rota existente ja retorna `imageCount` e `videoCount`, entao nao e necessario redesenhar consultas agora.

## Escopo

Implementar:

- pagina real de detalhes em `/registros/:id`;
- exibicao de nome e email do usuario responsavel;
- remocao do uso de `mock-data` na pagina de detalhes;
- redirecionamento da listagem/dashboard para a pagina real de detalhes;
- view model simples para formatar os dados do registro;
- testes de arquitetura para impedir regressao para mock;
- documentacao das rotas usadas pelo REQ 13;
- verificacao por build/testes.

Nao implementar neste plano:

- REQ 14, relatorio real;
- REQ 15, ZIP real;
- download de assets;
- exibicao de lista de arquivos capturados;
- autenticacao/autorizacao backend por JWT;
- composicao no API Gateway;
- migracao de banco.

## Decisao De Fluxo

Fluxo alvo:

```text
Dashboard
  -> /registros/:id
    -> web chama GET /capture/records/:recordId pelo API Gateway
    -> web usa record.userId e chama GET /identity/users/:id pelo API Gateway
    -> tela renderiza campos do REQ 13
```

Motivo:

- e a menor mudanca que atende o requisito;
- preserva isolamento: cada servico continua lendo apenas seu banco;
- evita criar endpoint composto antes de haver autenticacao forte;
- reaproveita helpers e testes ja existentes.

## Experiencia Esperada

Em `/registros/:id`, mostrar:

```text
Titulo
Status
ID do registro
URL/site do registro
Data/hora inicio
Data/hora fim ou "-"
Tipos de dados registrados: Print, Video, Print + Video, ou Sem midia
Numero de imagens
Numero de videos
Usuario responsavel: nome + email
ID tecnico do usuario
```

Estados:

```text
Registro nao encontrado ou erro no capture-service:
  mostrar erro sem dados ficticios e botao para Dashboard.

Usuario responsavel nao encontrado ou erro no identity-service:
  mostrar os dados do registro, mostrar userId, e exibir alerta informando que nome/email nao puderam ser carregados.
```

Acoes:

```text
Voltar para Dashboard
Nova captura
Continuar captura, apenas quando status for STARTED
```

Nao mostrar como disponiveis nesta tela:

```text
Ver relatorio
Baixar ZIP
Hash, duracao e tamanho ficticios
```

Esses pontos pertencem aos requisitos 14 e 15 ou ainda nao existem como dados reais.

---

## Estrutura De Arquivos

### Web

- Modify: `apps/web/src/lib/capture-record-view.ts`
  - Fazer `detailHref` apontar sempre para `/registros/:id`.
  - Manter uma rota de retomada separada para registros `STARTED`, se necessario.
  - Reusar formatacao de data e tipo de dado na pagina de detalhe.
- Create: `apps/web/src/lib/capture-record-detail-view.ts`
  - Centralizar o view model da pagina `/registros/:id`.
  - Receber `CaptureRecordDetailsResponse` e, quando disponivel, `UserResponse`.
  - Produzir labels prontos para a UI.
- Modify: `apps/web/src/app/registros/[id]/page.tsx`
  - Remover `getRecordById` e `chainOfCustody`.
  - Buscar o registro real com `getCaptureRecord(id)`.
  - Buscar usuario responsavel com `getUserProfile(record.userId)`.
  - Renderizar os campos do REQ 13.
  - Renderizar estados de erro sem fallback mockado.
- Modify: `apps/web/src/components/veridit/evidence-card.tsx`
  - Garantir que cards mobile abrem `record.detailHref`, que passa a ser `/registros/:id`.
- Modify: `apps/web/src/components/veridit/dashboard-client.tsx`
  - Garantir que a coluna `Detalhes` usa `record.detailHref`.
  - Se houver acao de continuar captura, ela deve ser separada visualmente da acao de detalhe.
- Test: `apps/web/test/gateway-architecture.spec.mjs`
  - Garantir que `/registros/[id]` usa gateway real.
  - Garantir que `/registros/[id]` nao importa `mock-data`.
  - Garantir que dashboard/cards podem apontar para `/registros/:id`.

### Docs

- Modify: `docs/04-servicos.md`
  - Documentar que o REQ 13 usa `GET /capture/records/:recordId` e `GET /identity/users/:id`.
  - Registrar que nome/email do responsavel vem do `identity-service`.

### Backend

- No code changes expected.
- O contrato atual `CaptureRecordDetailsResponse` ja tem dados suficientes para o REQ 13 no lado de captura: `id`, `userId`, `title`, `siteUrl`, `status`, `startedAt`, `finishedAt`, `imageCount`, `videoCount`.
- O contrato atual `UserResponse` ja tem os dados necessarios para responsavel: `id`, `fullName`, `email`.

---

## Task 1: View Model De Detalhes

**Files:**
- Modify: `apps/web/src/lib/capture-record-view.ts`
- Create: `apps/web/src/lib/capture-record-detail-view.ts`

- [ ] **Step 1: Ajustar o link canonico de detalhe**

Em `apps/web/src/lib/capture-record-view.ts`, alterar a regra de `detailHref` para sempre apontar para `/registros/:id`.

Manter qualquer rota de retomada de captura separada do detalhe:

```text
detailHref: /registros/:id
resumeHref: /captura/:id, apenas se status STARTED
```

Aceite:

- registros concluídos abrem `/registros/:id`;
- registros falhos abrem `/registros/:id`;
- registros em andamento tambem podem abrir `/registros/:id`;
- se a UI quiser continuar captura, usa um link separado para `/captura/:id`.

- [ ] **Step 2: Criar o view model de detalhe**

Criar `apps/web/src/lib/capture-record-detail-view.ts`.

Responsabilidades:

- importar `CaptureRecordDetailsResponse` e `UserResponse` de `@veridit/contracts`;
- importar `formatCaptureDateTime` e `getCaptureDataTypeLabel` de `@/lib/capture-record-view`;
- exportar um tipo `CaptureRecordDetailView`;
- exportar uma funcao `toCaptureRecordDetailView(record, responsibleUser?)`.

Campos do view model:

```text
id
title
siteUrl
status
statusLabel
startedAtLabel
finishedAtLabel
dataTypeLabel
imageCountLabel
videoCountLabel
responsibleName
responsibleEmail
responsibleUserId
hasResponsibleUserProfile
resumeHref
```

Regras:

- `statusLabel`: `STARTED -> Em andamento`, `COMPLETED -> Concluido`, `FAILED -> Falhou`;
- `finishedAtLabel`: usar `formatCaptureDateTime`, que retorna `-` quando nao houver data;
- `dataTypeLabel`: usar `getCaptureDataTypeLabel`;
- `responsibleName`: `responsibleUser.fullName` quando existir, senao `Usuario nao carregado`;
- `responsibleEmail`: `responsibleUser.email` quando existir, senao `-`;
- `responsibleUserId`: sempre vem de `record.userId`;
- `hasResponsibleUserProfile`: `true` apenas quando nome/email foram carregados;
- `resumeHref`: `/captura/:id` apenas quando `record.status === "STARTED"`.

- [ ] **Step 3: Rodar build do web para validar tipos**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/capture-record-view.ts apps/web/src/lib/capture-record-detail-view.ts
git commit -m "feat: add capture record detail view model"
```

---

## Task 2: Pagina Real `/registros/:id`

**Files:**
- Modify: `apps/web/src/app/registros/[id]/page.tsx`

- [ ] **Step 1: Remover dependencias mockadas**

Em `apps/web/src/app/registros/[id]/page.tsx`, remover imports de:

```text
getRecordById
chainOfCustody
RecordKind
RecordStatus
```

Tambem remover da UI qualquer campo que hoje dependa apenas de mock:

```text
hash
duration
size
relatorio disponivel
baixar ZIP
cadeia de custodia mockada
```

- [ ] **Step 2: Buscar o registro real**

Na pagina server component, manter o padrao do Next.js 16:

```text
params: Promise<{ id: string }>
const { id } = await params
```

Usar `getCaptureRecord(id)`.

Se a resposta falhar:

- renderizar dentro de `AppShell active="dashboard"`;
- mostrar titulo `Registro nao encontrado`;
- mostrar a mensagem retornada pelo gateway;
- mostrar botao para `/dashboard`;
- nao usar dados ficticios.

- [ ] **Step 3: Buscar o usuario responsavel**

Depois que `getCaptureRecord(id)` retornar `ok`, usar `record.userId` para chamar `getUserProfile(record.userId)`.

Regra:

- se `getUserProfile` retornar `ok`, passar `result.data` para `toCaptureRecordDetailView`;
- se falhar, passar apenas o registro e guardar a mensagem de erro para um alerta;
- nao bloquear a visualizacao do registro quando so o perfil falhar.

- [ ] **Step 4: Renderizar os campos do REQ 13**

Renderizar uma tela com estes blocos:

```text
Cabecalho:
  titulo do registro
  status
  URL/site

Metadados do registro:
  ID do registro
  Data/hora inicio
  Data/hora fim
  Tipo de dado registrado

Informacoes dos dados:
  Numero de imagens
  Numero de videos

Usuario responsavel:
  Nome
  Email
  ID tecnico do usuario
```

Usar `StatusPill` para status.

Se `hasResponsibleUserProfile` for `false`, exibir um `Alert` discreto informando que nome/email nao puderam ser carregados e que o `userId` tecnico foi preservado.

- [ ] **Step 5: Ajustar acoes da tela**

Mostrar:

```text
Voltar para Dashboard -> /dashboard
Nova captura -> /captura
Continuar captura -> /captura/:id, apenas quando resumeHref existir
```

Nao mostrar:

```text
Ver relatorio
Baixar ZIP
```

Motivo: esses botoes pertencem ao REQ 14 e REQ 15 e hoje levariam a fluxos mockados ou incompletos.

- [ ] **Step 6: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/registros/[id]/page.tsx
git commit -m "feat: show real capture record details"
```

---

## Task 3: Dashboard Apontando Para Detalhes Reais

**Files:**
- Modify: `apps/web/src/components/veridit/dashboard-client.tsx`
- Modify: `apps/web/src/components/veridit/evidence-card.tsx`
- Modify: `apps/web/src/lib/capture-record-view.ts`

- [ ] **Step 1: Ajustar a coluna `Detalhes` no dashboard**

Em `apps/web/src/components/veridit/dashboard-client.tsx`, a coluna `Detalhes` deve usar:

```text
href = record.detailHref
label = Abrir
```

Aceite:

- o link gerado deve ser `/registros/:id`;
- a coluna nao deve apontar para `/captura/concluida?recordId=...`.

- [ ] **Step 2: Preservar retomada de captura sem confundir com detalhes**

Se for mantida uma acao para registros `STARTED`, ela deve aparecer como acao separada:

```text
Continuar -> /captura/:id
```

Nao trocar o significado da coluna `Detalhes`.

- [ ] **Step 3: Ajustar card mobile**

Em `apps/web/src/components/veridit/evidence-card.tsx`, garantir que o link principal usa `record.detailHref`.

Aceite:

- tocar no card mobile abre `/registros/:id`;
- o card nao usa `/captura/concluida`.

- [ ] **Step 4: Rodar teste de arquitetura**

Run:

```bash
npm --workspace @veridit/web run test:architecture
```

Expected nesta etapa:

```text
falha enquanto o teste ainda espera /captura/concluida
```

Esta falha e esperada antes da Task 4.

- [ ] **Step 5: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/veridit/dashboard-client.tsx apps/web/src/components/veridit/evidence-card.tsx apps/web/src/lib/capture-record-view.ts
git commit -m "feat: route record list to real details"
```

---

## Task 4: Teste De Arquitetura Web

**Files:**
- Modify: `apps/web/test/gateway-architecture.spec.mjs`

- [ ] **Step 1: Adicionar leitura da pagina de detalhes**

No teste, ler:

```text
src/app/registros/[id]/page.tsx
```

Guardar em uma constante chamada `recordDetailsPage`.

- [ ] **Step 2: Bloquear retorno para mock na pagina de detalhes**

Adicionar asserts garantindo que `recordDetailsPage`:

```text
nao importa "@/lib/mock-data"
nao usa getRecordById
nao usa chainOfCustody
usa getCaptureRecord
usa getUserProfile
usa toCaptureRecordDetailView
```

- [ ] **Step 3: Atualizar asserts de rota da listagem**

Trocar os asserts antigos que proibiam `/registros/:id`.

Novo comportamento esperado:

```text
capture-record-view deve construir /registros/${encodeURIComponent(record.id)}
dashboard ou evidence-card devem usar record.detailHref
nenhuma acao de detalhe deve apontar para /captura/concluida
```

Manter permitido `/captura/:id` apenas para retomada de captura iniciada.

- [ ] **Step 4: Rodar teste de arquitetura**

Run:

```bash
npm --workspace @veridit/web run test:architecture
```

Expected:

```text
exit code 0
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/test/gateway-architecture.spec.mjs
git commit -m "test: require real record details page"
```

---

## Task 5: Docs Do Fluxo REQ 13

**Files:**
- Modify: `docs/04-servicos.md`

- [ ] **Step 1: Documentar rotas usadas pelo detalhe**

Na lista de rotas do API Gateway, garantir que constam:

```text
- GET /capture/records/:recordId
- GET /identity/users/:id
```

- [ ] **Step 2: Atualizar descricao dos servicos envolvidos**

Na secao do `capture-service`, registrar:

```text
Responsavel por registros de conteudo, sessoes de captura e assets capturados. Fornece os metadados e contagens usados no detalhe do REQ 13.
```

Na secao do `identity-service`, registrar:

```text
Fornece nome e email do usuario responsavel exibidos nos detalhes do registro.
```

- [ ] **Step 3: Commit**

```bash
git add docs/04-servicos.md
git commit -m "docs: document record details flow"
```

---

## Task 6: Verificacao Final

**Files:**
- No code changes expected.

- [ ] **Step 1: Rodar teste de arquitetura web**

Run:

```bash
npm --workspace @veridit/web run test:architecture
```

Expected:

```text
exit code 0
```

- [ ] **Step 2: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 3: Rodar testes/builds dos servicos afetados indiretamente**

Mesmo sem mudanca backend, rodar para garantir contratos e gateway:

```bash
npm --workspace @veridit/contracts run build
npm --workspace @veridit/api-gateway run test
npm --workspace @veridit/api-gateway run build
```

Expected:

```text
todos com exit code 0
```

- [ ] **Step 4: Rodar build geral**

Run:

```bash
npm run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 5: Verificacao manual**

Subir ambiente:

```bash
npm run dev
```

Fluxo no navegador:

```text
1. Fazer login.
2. Abrir /captura.
3. Criar uma captura.
4. Tirar pelo menos um print ou gravar um video.
5. Finalizar a captura.
6. Abrir /dashboard.
7. Clicar em Abrir na coluna Detalhes.
8. Confirmar que a URL e /registros/:id.
9. Confirmar que aparecem id, titulo, inicio, fim, tipo, imagens, videos, nome e email do responsavel.
10. Confirmar que nao aparecem dados mockados como hash ficticio, tamanho ficticio ou cadeia de custodia fixa.
```

---

## Acceptance Criteria

- `/registros/:id` usa dados reais de `getCaptureRecord(id)`.
- `/registros/:id` usa `getUserProfile(record.userId)` para exibir nome e email do usuario responsavel.
- `/registros/:id` nao importa nem usa `apps/web/src/lib/mock-data.ts`.
- A tela exibe todos os campos do Apêndice A para `Detalhes dos registros`.
- Dashboard e cards mobile abrem `/registros/:id` para detalhes.
- Fluxos de relatorio e ZIP nao sao apresentados como prontos no REQ 13.
- Frontend continua chamando somente o API Gateway.
- Teste de arquitetura web passa.
- Build do web passa.
- Build geral passa.

## Risks And Controls

- **Sem autorizacao backend forte:** qualquer usuario com um `recordId` pode tentar buscar detalhes enquanto JWT/backend guard nao estiver implementado. Controlar isso em requisito separado de seguranca/autenticacao.
- **Perfil do usuario pode falhar:** a pagina deve continuar exibindo o registro e mostrar `userId`; nome/email aparecem quando `identity-service` responder.
- **Pagina de relatorio ainda mockada:** remover links de relatorio/ZIP desta tela evita afirmar que REQ 14/15 estao prontos.
- **`/captura/concluida` ainda existe:** manter como tela de pos-finalizacao, mas o fluxo oficial de detalhe listado deve ser `/registros/:id`.

## Self-Review

- Spec coverage: o plano cobre id, titulo, inicio, fim, tipo de dados, numero de imagens, numero de videos e usuario responsavel com nome/email.
- Placeholder scan: nao ha marcadores de trabalho indefinido nem etapa sem criterio de aceite.
- Type consistency: `CaptureRecordDetailsResponse`, `UserResponse`, `toCaptureRecordDetailView`, `detailHref` e `resumeHref` sao usados de forma consistente.
