# Relatorio e ZIP de Registro Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os REQ 14 e REQ 15 com dados reais, reaproveitando apenas as partes uteis da branch da Paula e mantendo o REQ 13 como fonte de verdade para registro, usuario responsavel e navegacao.

**Architecture:** O `capture-service` continua sendo dono do registro e dos arquivos capturados. O API Gateway expoe metadados e download de assets para o frontend. O web monta relatorio e ZIP a partir de `getCaptureRecord(id)`, `getUserProfile(record.userId)` e assets reais, sem `mock-data` no fluxo de `/registros/:id`, relatorio ou ZIP.

**Tech Stack:** Next.js 16 App Router, React 19, NestJS 11, Prisma, PostgreSQL, TypeScript, JSZip, Playwright PDF route, Jest, Node architecture tests.

---

## Contexto Confirmado

- O PDF `docs/veridit-req.pdf` define:
  - REQ 14: gerar relatorio do registro selecionado pelo usuario com base no Apendice A.
  - REQ 15: gerar arquivo ZIP para download com os arquivos capturados durante o registro.
- Campos do Apendice A para `Relatorio do registro de conteudo`:
  - titulo;
  - id gerado pelo sistema;
  - usuario;
  - CPF;
  - id do registro gerado pelo sistema;
  - data/hora inicio;
  - data/hora fim;
  - duracao;
  - imagens capturadas;
  - site da imagem;
  - URL do site navegado;
  - nome do arquivo gerado pelo sistema;
  - tamanho do arquivo.
- O REQ 13 ja implementado deve ser a fonte de verdade:
  - `/registros/:id` chama `getCaptureRecord(id)`;
  - usuario responsavel vem de `getUserProfile(record.userId)`;
  - dashboard e cards abrem `/registros/:id`;
  - a pagina de detalhe nao usa `mock-data`.
- A branch da Paula trouxe partes reaproveitaveis:
  - `apps/web/src/app/api/pdf/route.ts`;
  - `apps/web/src/app/registros/[id]/relatorio/report-client.tsx`;
  - `apps/web/src/components/veridit/report-document.tsx`;
  - `apps/web/src/lib/zip/build-record-zip.ts`;
  - dependencia `jszip`.
- A branch da Paula tambem trouxe partes que devem ser removidas ou reescritas:
  - `getRecordById` em `apps/web/src/app/registros/[id]/relatorio/page.tsx`;
  - `VeriditRecord` de `apps/web/src/lib/mock-data.ts` no relatorio e ZIP;
  - `chainOfCustody`, `reportValidationItems`, hash e tamanho ficticios no relatorio;
  - arquivos `.txt` placeholder dentro do ZIP;
  - dependencia `file-saver`, se o download final for feito por `Response`/`Content-Disposition`.
- Context7 confirmou:
  - Next.js Route Handlers podem retornar arquivos com `new Response(bytesOrStream, { headers: { "Content-Type", "Content-Disposition" } })`;
  - JSZip suporta `zip.file(...)` e `generateAsync({ type: "uint8array" })` ou `generateAsync({ type: "blob" })`.

## Decisoes De Produto E Arquitetura

- Nada de mock em REQ 14/15 final.
- O relatorio deve carregar dados reais no server component da rota `/registros/:id/relatorio`.
- `ReportDocument` deve ser componente apresentacional: recebe um view model pronto e nao chama `getAuthSession`, `getUserProfile` ou `mock-data`.
- O ZIP deve ser gerado server-side em uma rota do web, para baixar assets reais pelo API Gateway e devolver `application/zip`.
- `file-saver` nao e necessario se o ZIP/PDF forem baixados por rota com `Content-Disposition`. Se ficar sem uso, remover de `apps/web/package.json` e `package-lock.json`.
- O `capture-service` nao deve expor caminho absoluto de arquivo. Ele deve expor metadados e stream/download controlado por `recordId` + `assetId`.
- O API Gateway deve continuar sendo a unica superficie HTTP consumida pelo web para dados de negocio.

## Fluxos Alvo

### REQ 14 - Relatorio

```text
/registros/:id
  -> Ver relatorio
  -> /registros/:id/relatorio
    -> web chama GET /capture/records/:recordId pelo API Gateway
    -> web chama GET /capture/records/:recordId/assets pelo API Gateway
    -> web chama GET /identity/users/:id pelo API Gateway
    -> web monta RecordReportView
    -> ReportDocument renderiza apenas dados reais
    -> botao PDF usa /api/pdf com HTML do relatorio real
```

### REQ 15 - ZIP

```text
/registros/:id
  -> Baixar ZIP
  -> /api/records/:id/zip
    -> web chama GET /capture/records/:recordId pelo API Gateway
    -> web chama GET /capture/records/:recordId/assets pelo API Gateway
    -> web baixa cada asset via GET /capture/records/:recordId/assets/:assetId/download pelo API Gateway
    -> web monta ZIP com JSZip
    -> Response application/zip
```

## Estrutura De Arquivos

### Contracts

- Modify: `packages/contracts/src/index.ts`
  - Adicionar `ListCaptureAssetsResponse`.
  - Reusar `CaptureAssetResponse`.

### Capture Service

- Modify: `apps/capture-service/src/capture/capture-storage.service.ts`
  - Adicionar leitura segura de arquivo capturado por `recordId` + `fileName`.
- Modify: `apps/capture-service/src/app.service.ts`
  - Adicionar `listAssets(recordId)`.
  - Adicionar `getAssetDownload(recordId, assetId)`.
- Modify: `apps/capture-service/src/app.controller.ts`
  - Adicionar `GET /records/:recordId/assets`.
  - Adicionar `GET /records/:recordId/assets/:assetId/download`.
- Test: `apps/capture-service/src/app.service.spec.ts`
- Test: `apps/capture-service/src/app.controller.spec.ts`

### API Gateway

- Modify: `apps/api-gateway/src/app.service.ts`
  - Adicionar proxy JSON para lista de assets.
  - Adicionar proxy binario para download de asset.
- Modify: `apps/api-gateway/src/app.controller.ts`
  - Expor `GET /capture/records/:recordId/assets`.
  - Expor `GET /capture/records/:recordId/assets/:assetId/download`.
- Test: `apps/api-gateway/src/app.service.spec.ts`
- Test: `apps/api-gateway/src/app.controller.spec.ts`

### Web

- Modify: `apps/web/src/lib/gateway.ts`
  - Adicionar `listCaptureAssets(recordId)`.
  - Adicionar helper de download binario para server routes.
- Create: `apps/web/src/lib/record-report-view.ts`
  - View model real para relatorio.
- Modify: `apps/web/src/app/registros/[id]/relatorio/page.tsx`
  - Remover `getRecordById`.
  - Buscar registro, usuario e assets reais.
- Modify: `apps/web/src/app/registros/[id]/relatorio/report-client.tsx`
  - Trocar `VeriditRecord` por `RecordReportView`.
- Modify: `apps/web/src/components/veridit/report-document.tsx`
  - Remover hooks, session, mock e cadeia de custodia ficticia.
- Modify: `apps/web/src/app/api/pdf/route.ts`
  - Manter a ideia da Paula, mas validar entrada e nome do arquivo.
- Create: `apps/web/src/app/api/records/[id]/zip/route.ts`
  - Gerar ZIP real server-side.
- Modify: `apps/web/src/lib/zip/build-record-zip.ts`
  - Gerar ZIP com metadata real e bytes reais.
- Delete: `apps/web/src/lib/zip/evidence-factory.ts`
  - Remover placeholders mockados.
- Delete: `apps/web/src/lib/zip/evidence-mapper.ts`
  - Remover placeholders mockados.
- Modify: `apps/web/src/lib/zip/types.ts`
  - Tipos reais para arquivos do ZIP.
- Modify: `apps/web/src/app/registros/[id]/page.tsx`
  - Adicionar botoes reais de relatorio e ZIP quando o registro permitir.
- Modify: `apps/web/package.json`
  - Remover `file-saver` e `@types/file-saver` se ficarem sem uso.
- Test: `apps/web/test/gateway-architecture.spec.mjs`

### Docs

- Modify: `docs/04-servicos.md`
  - Documentar rotas de assets/download e fluxo REQ 14/15.

---

## Task 1: Contratos De Assets Reais

**Files:**
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Adicionar contrato de lista de assets**

Adicionar uma interface pequena, sem alterar `CaptureAssetResponse`:

```ts
export interface ListCaptureAssetsResponse {
  recordId: string;
  assets: CaptureAssetResponse[];
}
```

Aceite:

- `CaptureAssetResponse` continua com `id`, `recordId`, `type`, `fileName`, `fileSizeBytes`, `sourceUrl`, `createdAt`.
- O contrato nao inclui `filePath`.
- Nenhum dado mockado entra no contrato.

- [ ] **Step 2: Rodar build dos contratos**

Run:

```bash
npm --workspace @veridit/contracts run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/index.ts
git commit -m "feat: add capture asset list contract"
```

---

## Task 2: Capture Service Listando E Baixando Assets

**Files:**
- Modify: `apps/capture-service/src/capture/capture-storage.service.ts`
- Modify: `apps/capture-service/src/app.service.ts`
- Modify: `apps/capture-service/src/app.controller.ts`
- Test: `apps/capture-service/src/app.service.spec.ts`
- Test: `apps/capture-service/src/app.controller.spec.ts`

- [ ] **Step 1: Escrever teste de lista de assets**

Em `apps/capture-service/src/app.service.spec.ts`, adicionar teste para `listAssets(recordId)`.

O teste deve montar um registro com dois assets e esperar:

```text
response.recordId = "record-1"
response.assets.length = 2
response.assets[0].fileName = "screenshot.png"
response.assets[1].fileName = "video.webm"
```

Expected antes da implementacao:

```text
FAIL: service.listAssets is not a function
```

- [ ] **Step 2: Implementar `listAssets(recordId)`**

Em `apps/capture-service/src/app.service.ts`:

- chamar `findRecordOrThrow(recordId)` antes da consulta;
- buscar `captureAsset.findMany({ where: { recordId }, orderBy: { createdAt: "asc" } })`;
- mapear cada item com `mapCaptureAsset`.

Formato esperado:

```ts
async listAssets(recordId: string): Promise<ListCaptureAssetsResponse>
```

- [ ] **Step 3: Escrever teste de download de asset**

Em `apps/capture-service/src/app.service.spec.ts`, adicionar teste para `getAssetDownload(recordId, assetId)`.

O teste deve garantir:

```text
asset pertence ao recordId informado
fileName e contentType sao retornados
storage e chamado com recordId + fileName
```

Expected antes da implementacao:

```text
FAIL: service.getAssetDownload is not a function
```

- [ ] **Step 4: Adicionar leitura segura no storage**

Em `apps/capture-service/src/capture/capture-storage.service.ts`, adicionar metodo que reconstrua o caminho a partir do storage root:

```ts
openAsset(recordId: string, fileName: string)
```

Regras:

- rejeitar `fileName` vazio;
- rejeitar `fileName` com `/`, `\` ou byte nulo;
- montar caminho com `getRecordDir(recordId)` + `fileName`;
- validar com `assertInsideStorage`;
- retornar stream e tamanho real do arquivo.

- [ ] **Step 5: Implementar `getAssetDownload(recordId, assetId)`**

Em `apps/capture-service/src/app.service.ts`:

- buscar asset por `id` e `recordId`;
- se nao achar, lançar `NotFoundException`;
- chamar `storage.openAsset(recordId, asset.fileName)`;
- definir `contentType` por tipo:
  - `IMAGE` -> `image/png`;
  - `VIDEO` -> `video/webm`.

Retorno interno esperado:

```text
stream
fileName
contentType
contentLength
```

- [ ] **Step 6: Expor rotas no controller**

Em `apps/capture-service/src/app.controller.ts`, adicionar:

```text
GET /records/:recordId/assets
GET /records/:recordId/assets/:assetId/download
```

Para download, usar `StreamableFile` e headers:

```text
Content-Type
Content-Length
Content-Disposition: attachment; filename="<fileName>"
```

- [ ] **Step 7: Rodar testes do capture-service**

Run:

```bash
npm --workspace @veridit/capture-service run test
```

Expected:

```text
exit code 0
```

- [ ] **Step 8: Commit**

```bash
git add apps/capture-service/src/capture/capture-storage.service.ts apps/capture-service/src/app.service.ts apps/capture-service/src/app.controller.ts apps/capture-service/src/app.service.spec.ts apps/capture-service/src/app.controller.spec.ts
git commit -m "feat: expose capture assets for reports"
```

---

## Task 3: API Gateway Para Assets E Download

**Files:**
- Modify: `apps/api-gateway/src/app.service.ts`
- Modify: `apps/api-gateway/src/app.controller.ts`
- Test: `apps/api-gateway/src/app.service.spec.ts`
- Test: `apps/api-gateway/src/app.controller.spec.ts`

- [ ] **Step 1: Escrever teste de proxy da lista de assets**

Em `apps/api-gateway/src/app.service.spec.ts`, testar:

```text
getCaptureAssets("record-1")
  chama http://127.0.0.1:3103/records/record-1/assets
  retorna ListCaptureAssetsResponse
```

Expected antes da implementacao:

```text
FAIL: service.getCaptureAssets is not a function
```

- [ ] **Step 2: Implementar proxy JSON**

Em `apps/api-gateway/src/app.service.ts`, adicionar:

```ts
getCaptureAssets(recordId: string): Promise<ListCaptureAssetsResponse>
```

Usar `getFromService` com `preserveClientErrors: true`.

- [ ] **Step 3: Escrever teste de proxy binario**

Em `apps/api-gateway/src/app.service.spec.ts`, testar que o gateway:

```text
chama /records/:recordId/assets/:assetId/download
preserva content-type
preserva content-disposition
retorna bytes/stream sem tentar parsear JSON
```

- [ ] **Step 4: Implementar helper binario no gateway**

Em `apps/api-gateway/src/app.service.ts`, adicionar metodo separado para download binario.

Regras:

- nao usar `getFromService`, porque ele faz `response.json()`;
- se status 4xx, preservar erro do capture-service;
- se status 5xx ou falha de rede, lançar `BadGatewayException`;
- retornar stream e headers seguros.

Assinatura interna sugerida:

```ts
downloadCaptureAsset(recordId: string, assetId: string)
```

- [ ] **Step 5: Expor rotas no controller**

Em `apps/api-gateway/src/app.controller.ts`, adicionar:

```text
GET /capture/records/:recordId/assets
GET /capture/records/:recordId/assets/:assetId/download
```

Para download, usar `StreamableFile` e repassar:

```text
Content-Type
Content-Length
Content-Disposition
```

- [ ] **Step 6: Rodar testes do API Gateway**

Run:

```bash
npm --workspace @veridit/api-gateway run test
```

Expected:

```text
exit code 0
```

- [ ] **Step 7: Commit**

```bash
git add apps/api-gateway/src/app.service.ts apps/api-gateway/src/app.controller.ts apps/api-gateway/src/app.service.spec.ts apps/api-gateway/src/app.controller.spec.ts
git commit -m "feat: proxy capture asset downloads"
```

---

## Task 4: Helpers Web E View Model Real Do Relatorio

**Files:**
- Modify: `apps/web/src/lib/gateway.ts`
- Create: `apps/web/src/lib/record-report-view.ts`

- [ ] **Step 1: Adicionar helper de lista de assets**

Em `apps/web/src/lib/gateway.ts`, adicionar:

```ts
listCaptureAssets(recordId: string)
```

Endpoint:

```text
GET /capture/records/:recordId/assets
```

Retorno:

```text
GatewayResult<ListCaptureAssetsResponse>
```

- [ ] **Step 2: Adicionar helper server-side para baixar asset**

Em `apps/web/src/lib/gateway.ts`, adicionar helper para uso em route handlers:

```ts
downloadCaptureAssetBytes(recordId: string, assetId: string)
```

Regras:

- chamar API Gateway;
- retornar `Uint8Array`, `fileName`, `contentType`;
- nao tentar `JSON.parse` em resposta binaria;
- em erro, retornar `{ ok: false, message, status }`.

- [ ] **Step 3: Criar `record-report-view.ts`**

Criar `apps/web/src/lib/record-report-view.ts`.

O view model deve receber:

```text
CaptureRecordDetailsResponse
UserResponse | undefined
CaptureAssetResponse[]
```

E retornar:

```text
id
title
siteUrl
status
startedAtLabel
finishedAtLabel
durationLabel
responsibleName
responsibleEmail
responsibleCpf
responsibleUserId
imageAssets
videoAssets
allAssets
```

Regras:

- `durationLabel` = diferenca entre `startedAt` e `finishedAt`; se nao houver fim, `Em andamento`;
- `responsibleCpf` vem de `UserResponse.cpf`; se perfil falhar, usar `-`;
- `imageAssets` filtra `type === "IMAGE"`;
- `videoAssets` filtra `type === "VIDEO"`;
- cada asset deve ter `fileName`, `sourceUrlLabel`, `fileSizeLabel`, `createdAtLabel`.

- [ ] **Step 4: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/gateway.ts apps/web/src/lib/record-report-view.ts
git commit -m "feat: add real record report view model"
```

---

## Task 5: Relatorio Real Sem Mock

**Files:**
- Modify: `apps/web/src/app/registros/[id]/relatorio/page.tsx`
- Modify: `apps/web/src/app/registros/[id]/relatorio/report-client.tsx`
- Modify: `apps/web/src/components/veridit/report-document.tsx`

- [ ] **Step 1: Remover `mock-data` da pagina de relatorio**

Em `apps/web/src/app/registros/[id]/relatorio/page.tsx`, remover:

```text
getRecordById
VeriditRecord
mock-data
```

Buscar dados reais:

```text
getCaptureRecord(id)
getUserProfile(record.userId)
listCaptureAssets(id)
toRecordReportView(record, user, assets)
```

Estados:

- se `getCaptureRecord` falhar, renderizar erro com botao para dashboard;
- se `listCaptureAssets` falhar, renderizar erro dizendo que assets nao puderam ser carregados;
- se `getUserProfile` falhar, renderizar relatorio com CPF `-` e alerta discreto.

- [ ] **Step 2: Trocar props do `ReportClient`**

Em `report-client.tsx`, trocar:

```text
record: VeriditRecord
```

por:

```text
report: RecordReportView
```

Manter:

```text
botao Imprimir
botao PDF
ref do documento
```

- [ ] **Step 3: Limpar `ReportDocument`**

Em `report-document.tsx`, remover:

```text
"use client" se nao houver hook
useEffect
useState
getAuthSession
getUserProfile
chainOfCustody
reportValidationItems
VeriditRecord
hash ficticio
```

Renderizar apenas campos reais do `RecordReportView`.

Blocos obrigatorios:

```text
Informacoes do registro
Responsavel
Imagens capturadas
Videos capturados
Arquivos gerados pelo sistema
```

- [ ] **Step 4: Garantir campos do PDF**

O relatorio deve mostrar:

```text
Titulo
ID do registro
Usuario
CPF
Data/hora inicio
Data/hora fim
Duracao
URL do site navegado
Imagens capturadas
Site da imagem
Nome do arquivo
Tamanho do arquivo
```

Se nao houver imagem:

```text
Nenhuma imagem capturada para este registro.
```

- [ ] **Step 5: Rodar teste de arquitetura**

Run:

```bash
npm --workspace @veridit/web run test:architecture
```

Expected nesta etapa:

```text
pode falhar se o teste ainda nao foi atualizado para REQ 14/15
```

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
git add apps/web/src/app/registros/[id]/relatorio/page.tsx apps/web/src/app/registros/[id]/relatorio/report-client.tsx apps/web/src/components/veridit/report-document.tsx
git commit -m "feat: render real record reports"
```

---

## Task 6: PDF Com Dados Reais

**Files:**
- Modify: `apps/web/src/app/api/pdf/route.ts`
- Modify: `apps/web/src/app/registros/[id]/relatorio/report-client.tsx`

- [ ] **Step 1: Validar entrada do PDF route**

Em `apps/web/src/app/api/pdf/route.ts`, manter a ideia da Paula, mas validar:

```text
html precisa ser string nao vazia
fileName precisa terminar em .pdf
fileName pode conter apenas letras, numeros, ponto, hifen e underscore
```

Se falhar:

```text
400 com mensagem curta
```

- [ ] **Step 2: Ajustar headers do PDF**

Responder com:

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="<fileName>"
```

Manter `browser.close()` no `finally`.

- [ ] **Step 3: Garantir que o HTML enviado e do relatorio real**

Em `report-client.tsx`, o `ref` usado no PDF deve envolver apenas `ReportDocument`.

O payload deve usar:

```text
fileName = relatorio-<recordId>.pdf
```

Onde `<recordId>` vem de `RecordReportView.id`.

- [ ] **Step 4: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/pdf/route.ts apps/web/src/app/registros/[id]/relatorio/report-client.tsx
git commit -m "feat: generate pdf from real reports"
```

---

## Task 7: ZIP Real Server-Side

**Files:**
- Create: `apps/web/src/app/api/records/[id]/zip/route.ts`
- Modify: `apps/web/src/lib/zip/build-record-zip.ts`
- Modify: `apps/web/src/lib/zip/types.ts`
- Delete: `apps/web/src/lib/zip/evidence-factory.ts`
- Delete: `apps/web/src/lib/zip/evidence-mapper.ts`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Redefinir tipos do ZIP**

Em `apps/web/src/lib/zip/types.ts`, remover `VeriditRecord` e `Evidence`.

Criar tipos pequenos:

```text
RecordZipMetadata
RecordZipAsset
```

Campos minimos:

```text
record
responsibleUser
assets
generatedAt
```

- [ ] **Step 2: Reescrever `build-record-zip`**

Em `apps/web/src/lib/zip/build-record-zip.ts`, manter `JSZip`, mas aceitar dados reais:

```text
metadata
assets com bytes reais
```

Conteudo esperado do ZIP:

```text
metadata.json
assets/<fileName real>
```

Regras:

- `metadata.json` deve conter registro, responsavel, lista de assets e `generatedAt`;
- cada asset deve usar o `fileName` retornado pelo capture-service;
- nao criar `screenshot.txt`;
- nao criar `video.txt`;
- nao criar conteudo placeholder.

- [ ] **Step 3: Criar route handler do ZIP**

Criar `apps/web/src/app/api/records/[id]/zip/route.ts`.

Fluxo:

```text
await params
getCaptureRecord(id)
getUserProfile(record.userId)
listCaptureAssets(id)
downloadCaptureAssetBytes(id, asset.id) para cada asset
buildRecordZip(...)
return new Response(zipBytes, headers)
```

Headers:

```text
Content-Type: application/zip
Content-Disposition: attachment; filename="registro-<id>.zip"
```

- [ ] **Step 4: Tratar estados de erro do ZIP**

Regras:

- se registro nao existir, retornar 404 JSON;
- se assets nao carregarem, retornar 502 JSON;
- se um asset falhar no download, retornar 502 JSON com nome do asset;
- se nao houver assets, retornar ZIP com `metadata.json` e lista vazia.

- [ ] **Step 5: Apagar arquivos mortos**

Remover:

```text
apps/web/src/lib/zip/evidence-factory.ts
apps/web/src/lib/zip/evidence-mapper.ts
```

Remover imports quebrados.

- [ ] **Step 6: Remover `file-saver` se estiver sem uso**

Verificar:

```bash
rg "file-saver|saveAs"
```

Se nao houver uso em codigo:

```bash
npm uninstall --workspace @veridit/web file-saver @types/file-saver
```

Expected:

```text
apps/web/package.json e package-lock.json atualizados
```

- [ ] **Step 7: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/api/records/[id]/zip/route.ts apps/web/src/lib/zip/build-record-zip.ts apps/web/src/lib/zip/types.ts apps/web/package.json package-lock.json
git add -u apps/web/src/lib/zip
git commit -m "feat: generate real record zip downloads"
```

---

## Task 8: Acoes Reais Na Tela De Detalhe

**Files:**
- Modify: `apps/web/src/app/registros/[id]/page.tsx`

- [ ] **Step 1: Adicionar link de relatorio**

Na pagina `/registros/:id`, adicionar botao:

```text
Ver relatorio -> /registros/:id/relatorio
```

Regra:

- mostrar quando `record.status === "COMPLETED"`;
- nao mostrar quando `STARTED`;
- nao depender de `mock-data`.

- [ ] **Step 2: Adicionar link de ZIP**

Na pagina `/registros/:id`, adicionar botao:

```text
Baixar ZIP -> /api/records/:id/zip
```

Regra:

- mostrar quando `record.status === "COMPLETED"`;
- se `imageCount + videoCount === 0`, manter o botao desabilitado ou oculto;
- o link deve usar `encodeURIComponent(record.id)`.

- [ ] **Step 3: Preservar acoes existentes**

Manter:

```text
Dashboard
Nova captura
Continuar captura apenas para STARTED
```

- [ ] **Step 4: Rodar build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/registros/[id]/page.tsx
git commit -m "feat: add report and zip actions to record details"
```

---

## Task 9: Testes De Arquitetura E Docs

**Files:**
- Modify: `apps/web/test/gateway-architecture.spec.mjs`
- Modify: `docs/04-servicos.md`

- [ ] **Step 1: Bloquear mock no relatorio**

Em `apps/web/test/gateway-architecture.spec.mjs`, adicionar leitura de:

```text
src/app/registros/[id]/relatorio/page.tsx
src/components/veridit/report-document.tsx
src/lib/zip/build-record-zip.ts
```

Asserts:

```text
relatorio nao importa mock-data
relatorio usa getCaptureRecord
relatorio usa getUserProfile
relatorio usa listCaptureAssets
ReportDocument nao usa getAuthSession
ReportDocument nao usa chainOfCustody
ZIP nao importa mock-data
ZIP nao cria screenshot.txt ou video.txt
```

- [ ] **Step 2: Bloquear `file-saver` morto**

Se o plano removeu `file-saver`, adicionar assert:

```text
apps/web/package.json nao contem file-saver
```

- [ ] **Step 3: Documentar rotas novas**

Em `docs/04-servicos.md`, adicionar no API Gateway:

```text
GET /capture/records/:recordId/assets
GET /capture/records/:recordId/assets/:assetId/download
```

Na secao do `capture-service`, registrar:

```text
Fornece metadados e download dos assets reais usados nos REQ 14 e 15.
```

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
git add apps/web/test/gateway-architecture.spec.mjs docs/04-servicos.md
git commit -m "test: require real report and zip data"
```

---

## Task 10: Verificacao Final

**Files:**
- No code changes expected.

- [ ] **Step 1: Rodar contratos**

Run:

```bash
npm --workspace @veridit/contracts run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 2: Rodar capture-service**

Run:

```bash
npm --workspace @veridit/capture-service run test
npm --workspace @veridit/capture-service run build
```

Expected:

```text
todos com exit code 0
```

- [ ] **Step 3: Rodar API Gateway**

Run:

```bash
npm --workspace @veridit/api-gateway run test
npm --workspace @veridit/api-gateway run build
```

Expected:

```text
todos com exit code 0
```

- [ ] **Step 4: Rodar web**

Run:

```bash
npm --workspace @veridit/web run test:architecture
npm --workspace @veridit/web run build
```

Expected:

```text
todos com exit code 0
```

- [ ] **Step 5: Rodar build geral**

Run:

```bash
npm run build
```

Expected:

```text
exit code 0
```

- [ ] **Step 6: Verificacao manual**

Subir ambiente:

```bash
npm run dev
```

Fluxo:

```text
1. Fazer login.
2. Criar captura real em /captura.
3. Tirar pelo menos um print.
4. Gravar e parar um video, se possivel.
5. Finalizar captura.
6. Abrir /dashboard.
7. Abrir detalhes do registro.
8. Confirmar que /registros/:id mostra dados reais.
9. Clicar em Ver relatorio.
10. Confirmar que /registros/:id/relatorio nao mostra hash/cadeia ficticia.
11. Baixar PDF.
12. Confirmar que o PDF contem os dados reais do registro e do responsavel.
13. Voltar ao detalhe.
14. Baixar ZIP.
15. Abrir ZIP e confirmar metadata.json + arquivos reais capturados.
```

---

## Acceptance Criteria

- REQ 14:
  - `/registros/:id/relatorio` usa `getCaptureRecord(id)`.
  - `/registros/:id/relatorio` usa `getUserProfile(record.userId)`.
  - `/registros/:id/relatorio` usa assets reais do capture-service.
  - `ReportDocument` nao importa `mock-data`.
  - O relatorio exibe todos os campos exigidos no Apendice A que existem no dominio atual.
  - PDF e gerado a partir do relatorio real.
- REQ 15:
  - ZIP baixa por rota real.
  - ZIP contem `metadata.json` real.
  - ZIP contem os arquivos capturados reais retornados pelo capture-service.
  - ZIP nao contem placeholders `.txt`.
- Arquitetura:
  - Web continua chamando o API Gateway para dados de negocio.
  - Capture-service nao expoe caminho absoluto de arquivo.
  - `mock-data` nao participa de detalhe, relatorio ou ZIP de registro.
  - Builds e testes passam.

## Risks And Controls

- **Arquivos grandes no ZIP:** gerar ZIP em memoria com JSZip e aceitavel para o escopo atual. Se videos crescerem muito, migrar depois para streaming ZIP.
- **Sem autorizacao backend forte:** os endpoints seguem o padrao atual do projeto. Autorizacao por JWT deve ser tratada em requisito separado.
- **CPF indisponivel se identity falhar:** relatorio deve exibir `-` e alerta, sem inventar CPF.
- **Duracao sem campo dedicado:** calcular pela diferenca entre `startedAt` e `finishedAt`; se `finishedAt` nao existir, mostrar `Em andamento`.
- **PDF por HTML enviado do client:** validar `fileName` e manter o HTML restrito ao `ReportDocument`. Uma versao futura pode gerar o HTML server-side.

## Self-Review

- Spec coverage: o plano cobre REQ 14, REQ 15 e campos do Apendice A para relatorio e ZIP.
- Placeholder scan: nao ha marcadores de trabalho indefinido nem etapa sem criterio de aceite.
- Type consistency: `ListCaptureAssetsResponse`, `CaptureAssetResponse`, `RecordReportView`, `listCaptureAssets`, `downloadCaptureAssetBytes` e `buildRecordZip` aparecem com nomes consistentes ao longo das tarefas.
