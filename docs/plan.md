# Registro de Conteudo Navegavel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o REQ 08 com uma sessao de captura navegavel: o usuario informa uma URL, o sistema abre essa URL em um navegador remoto controlado pelo `capture-service`, e a tela do Veridit permite navegar, gravar video e tirar prints do conteudo.

**Architecture:** O frontend continua falando somente com o API Gateway, como definido em `docs/03-arquitetura.md`. O `capture-service` passa a ser dono das sessoes Playwright, dos arquivos gerados e dos registros `ContentRecord`/`CaptureAsset`; o API Gateway apenas faz proxy HTTP. A primeira versao usa polling de frames em base64 e eventos de input por HTTP para manter a implementacao simples, sem iframe e sem WebSocket.

**Tech Stack:** Next.js 16 App Router, React 19, NestJS 11, Prisma, Playwright Chromium, PostgreSQL, RabbitMQ existente para `capture.completed`.

---

## Contexto Confirmado

- O PDF define `Registro de conteúdo` com `Endereço do site` e `título do registro do conteúdo`.
- O fluxo desejado pelo usuario e:
  - clicar em `Nova Captura`;
  - informar o link;
  - abrir uma tela de captura;
  - renderizar o site dentro de um container navegavel;
  - navegar no conteudo;
  - usar botoes laterais para gravar video e tirar print do container.
- Nao usar `iframe` como solucao principal. Sites externos podem bloquear embedding com `X-Frame-Options` ou `CSP frame-ancestors`, e o browser bloqueia captura confiavel de conteudo cross-origin.
- Usar navegador remoto com Playwright no backend. O container do frontend mostra frames desse navegador remoto e envia input do usuario de volta ao backend.
- Esta versao nao desconta credito. O repo ainda nao tem endpoint de consumo de credito por captura; o REQ 08 deve iniciar e operar a captura. Consumo de credito pode ser integrado quando existir regra no billing.
- Esta versao nao gera relatorio real nem ZIP. Ela grava `CaptureAsset` e publica `capture.completed` ao concluir, mantendo o caminho para REQ 10, REQ 14 e REQ 15.

## Decisao De Transporte

Usar HTTP polling no primeiro corte:

- `GET /capture/records/:recordId/frame` retorna o frame atual como JSON com base64.
- `POST /capture/records/:recordId/input` envia clique, scroll, tecla ou texto colado.
- O frontend atualiza o frame a cada 500 ms enquanto a sessao esta ativa e tambem apos cada input.

Motivo: e mais simples, usa o gateway HTTP existente, evita WebSocket, e respeita a regra "frontend chama apenas o API Gateway". Se a UX ficar lenta, a mesma modelagem de sessao permite trocar o transporte de frames por WebSocket em uma evolucao separada, sem mudar a persistencia principal.

## Rotas Alvo

Todas as rotas abaixo devem existir no API Gateway e ser encaminhadas para o `capture-service`.

```text
POST /capture/records
GET  /capture/records/:recordId
GET  /capture/records/:recordId/frame
POST /capture/records/:recordId/input
POST /capture/records/:recordId/screenshots
POST /capture/records/:recordId/video/start
POST /capture/records/:recordId/video/stop
POST /capture/records/:recordId/complete
```

## Estrutura De Arquivos

### Shared contracts

- Modify: `packages/contracts/src/index.ts`
  - Adicionar tipos de status, assets, frame, input e respostas das novas rotas.
  - Manter `StartCaptureRequest` compativel com o que ja existe.

### Capture service

- Modify: `apps/capture-service/package.json`
  - Adicionar `test`.
  - Adicionar dependencia `playwright`.
- Modify: `apps/capture-service/.env.example`
  - Adicionar configuracoes de storage, viewport e TTL.
- Modify: `.gitignore`
  - Ignorar arquivos locais de captura.
- Create: `apps/capture-service/src/dto/start-capture.dto.ts`
  - DTO real para `POST /records`.
- Create: `apps/capture-service/src/dto/browser-input.dto.ts`
  - DTO para input do container remoto.
- Create: `apps/capture-service/src/capture/url-policy.service.ts`
  - Validacao SSRF-safe para URLs informadas pelo usuario.
- Create: `apps/capture-service/src/capture/capture-storage.service.ts`
  - Criacao de diretorios e leitura de tamanho dos arquivos.
- Create: `apps/capture-service/src/capture/playwright-browser.service.ts`
  - Adapter fino sobre Playwright.
- Create: `apps/capture-service/src/capture/capture-session-manager.service.ts`
  - Gerencia sessoes em memoria, frames, input, screenshot, video e encerramento.
- Modify: `apps/capture-service/src/app.service.ts`
  - Delegar fluxo real de captura para os novos services.
- Modify: `apps/capture-service/src/app.controller.ts`
  - Expor rotas reais de captura.
- Modify: `apps/capture-service/src/app.module.ts`
  - Registrar novos providers.
- Test: `apps/capture-service/src/capture/url-policy.service.spec.ts`
- Test: `apps/capture-service/src/capture/capture-session-manager.service.spec.ts`
- Test: `apps/capture-service/src/app.controller.spec.ts`
- Test: `apps/capture-service/src/app.service.spec.ts`

### API Gateway

- Modify: `apps/api-gateway/src/app.controller.ts`
  - Expor as novas rotas `/capture/records...`.
- Modify: `apps/api-gateway/src/app.service.ts`
  - Fazer proxy para o `capture-service`.
- Test: `apps/api-gateway/src/app.controller.spec.ts`
- Test: `apps/api-gateway/src/app.service.spec.ts`

### Web

- Modify: `apps/web/src/lib/gateway.ts`
  - Adicionar client functions das novas rotas.
- Modify: `apps/web/src/app/captura/page.tsx`
  - Manter como tela de entrada da URL.
- Modify: `apps/web/src/components/veridit/capture-client.tsx`
  - Simplificar formulario para URL e titulo gerado/editavel.
- Create: `apps/web/src/app/captura/[recordId]/page.tsx`
  - Pagina da sessao navegavel.
- Create: `apps/web/src/components/veridit/capture-workspace-client.tsx`
  - Container remoto, polling de frames, input e botoes laterais.
- Modify: `apps/web/src/app/captura/concluida/page.tsx`
  - Aceitar `recordId` via query string e mostrar retorno coerente.
- Optional Test: `apps/web/test/gateway-architecture.spec.mjs`
  - Garantir que o web continua chamando apenas `NEXT_PUBLIC_API_GATEWAY_URL`.

---

## Task 1: Shared Contracts

**Files:**
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Definir os contratos de captura**

Adicionar tipos pequenos e explicitos. Manter nomes em ingles porque o pacote atual ja usa ingles.

```ts
export type CaptureRecordStatus = "STARTED" | "COMPLETED" | "FAILED";
export type CaptureAssetType = "IMAGE" | "VIDEO";

export interface CaptureViewport {
  width: number;
  height: number;
}

export interface StartCaptureSessionResponse extends ContentRecordResponse {
  status: CaptureRecordStatus;
  viewport: CaptureViewport;
}

export interface CaptureFrameResponse {
  recordId: string;
  mimeType: "image/jpeg";
  imageBase64: string;
  currentUrl: string;
  capturedAt: string;
  viewport: CaptureViewport;
}

export interface CaptureAssetResponse {
  id: string;
  recordId: string;
  type: CaptureAssetType;
  fileName: string;
  fileSizeBytes?: number;
  sourceUrl?: string;
  createdAt: string;
}
```

- [ ] **Step 2: Definir o contrato de input remoto**

Usar uma union discriminada para evitar payloads ambiguos.

```ts
export type BrowserInputRequest =
  | { type: "click"; x: number; y: number }
  | { type: "wheel"; deltaX: number; deltaY: number }
  | { type: "key"; key: string; code?: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean }
  | { type: "text"; value: string };

export interface BrowserInputResponse {
  accepted: true;
  currentUrl: string;
}

export interface CaptureVideoStateResponse {
  recording: boolean;
  asset?: CaptureAssetResponse;
}

export interface CompleteCaptureResponse extends ContentRecordResponse {
  status: "COMPLETED";
  imageCount: number;
  videoCount: number;
}
```

- [ ] **Step 3: Ajustar `ContentRecordResponse`**

Trocar o status atual:

```ts
status: "STARTED" | "COMPLETED";
```

por:

```ts
status: CaptureRecordStatus;
```

- [ ] **Step 4: Build dos contratos**

Run:

```bash
npm --workspace @veridit/contracts run build
```

Expected:

```text
> @veridit/contracts@0.0.0 build
```

e comando finaliza com exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts
git commit -m "feat: add capture session contracts"
```

---

## Task 2: Capture Service Setup

**Files:**
- Modify: `apps/capture-service/package.json`
- Modify: `apps/capture-service/.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Adicionar dependencia Playwright e script de teste**

Em `apps/capture-service/package.json`:

```json
"test": "jest"
```

Adicionar em `dependencies`:

```json
"playwright": "^1.61.0"
```

- [ ] **Step 2: Instalar dependencia**

Run:

```bash
npm install --workspace @veridit/capture-service
```

Expected:

```text
added
```

ou:

```text
up to date
```

e `package-lock.json` atualizado quando necessario.

- [ ] **Step 3: Instalar navegador Chromium do Playwright**

Run:

```bash
npm --workspace @veridit/capture-service exec playwright install chromium
```

Expected:

```text
Chromium
```

e comando finaliza com exit code `0`.

- [ ] **Step 4: Adicionar variaveis de ambiente**

Em `apps/capture-service/.env.example`, adicionar:

```text
CAPTURE_STORAGE_DIR=storage/captures
CAPTURE_VIEWPORT_WIDTH=1366
CAPTURE_VIEWPORT_HEIGHT=768
CAPTURE_FRAME_QUALITY=72
CAPTURE_IDLE_TTL_MS=900000
CAPTURE_ALLOW_PRIVATE_HOSTS=false
```

- [ ] **Step 5: Ignorar arquivos gerados**

Em `.gitignore`, adicionar:

```text
apps/capture-service/storage/
```

- [ ] **Step 6: Validar instalacao**

Run:

```bash
npm --workspace @veridit/capture-service run build
```

Expected:

```text
> @veridit/capture-service@0.0.1 build
```

e comando finaliza com exit code `0`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json apps/capture-service/package.json apps/capture-service/.env.example .gitignore
git commit -m "chore: prepare capture service for playwright"
```

---

## Task 3: URL Policy

**Files:**
- Create: `apps/capture-service/src/capture/url-policy.service.ts`
- Test: `apps/capture-service/src/capture/url-policy.service.spec.ts`
- Modify: `apps/capture-service/src/app.module.ts`

- [ ] **Step 1: Escrever teste de URLs permitidas**

Criar teste garantindo que estas URLs passam:

```ts
https://example.com
http://example.com/path?x=1
https://sub.example.org
```

Expected result: `validatePublicHttpUrl(url)` retorna a URL normalizada.

- [ ] **Step 2: Escrever teste de URLs bloqueadas**

Criar teste garantindo que estas entradas falham com `BadRequestException`:

```text
javascript:alert(1)
data:text/html,hello
file:///etc/passwd
ftp://example.com
http://localhost:3000
http://127.0.0.1:3000
http://10.0.0.1
http://172.16.0.10
http://192.168.0.10
```

- [ ] **Step 3: Implementar service**

Implementar `UrlPolicyService` com estas regras:

- aceitar somente protocolos `http:` e `https:`;
- exigir hostname;
- resolver DNS com `node:dns/promises`;
- bloquear `localhost`, loopback, link-local, private IPv4, private IPv6 e host sem DNS publico;
- permitir hosts privados apenas quando `CAPTURE_ALLOW_PRIVATE_HOSTS=true`;
- retornar `url.toString()` normalizado.

- [ ] **Step 4: Registrar provider**

Adicionar `UrlPolicyService` em `providers` no `apps/capture-service/src/app.module.ts`.

- [ ] **Step 5: Rodar teste**

Run:

```bash
npm --workspace @veridit/capture-service run test -- url-policy.service.spec.ts
```

Expected:

```text
PASS src/capture/url-policy.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/capture-service/src/capture/url-policy.service.ts apps/capture-service/src/capture/url-policy.service.spec.ts apps/capture-service/src/app.module.ts
git commit -m "feat: validate capture target urls"
```

---

## Task 4: Capture Storage

**Files:**
- Create: `apps/capture-service/src/capture/capture-storage.service.ts`
- Test: `apps/capture-service/src/capture/capture-storage.service.spec.ts`
- Modify: `apps/capture-service/src/app.module.ts`

- [ ] **Step 1: Escrever teste de diretorio por registro**

Teste:

- dado `CAPTURE_STORAGE_DIR=tmp/captures-test`;
- quando pedir diretorio para `record-1`;
- deve criar `tmp/captures-test/record-1`;
- deve retornar caminho absoluto dentro do storage configurado.

- [ ] **Step 2: Escrever teste de nome de arquivo**

Teste:

- screenshot deve usar formato `screenshot-YYYYMMDD-HHmmss-SSS.png`;
- video deve usar formato `video-YYYYMMDD-HHmmss-SSS.webm`;
- nomes nao podem conter `/`, `\`, `..` ou espaco.

- [ ] **Step 3: Implementar service**

Responsabilidades:

- ler `CAPTURE_STORAGE_DIR`;
- criar diretorios com `fs.promises.mkdir(..., { recursive: true })`;
- gerar nomes deterministamente por tipo e data;
- retornar tamanho com `fs.promises.stat(filePath).size`;
- rejeitar tentativa de resolver caminho fora do storage.

- [ ] **Step 4: Registrar provider**

Adicionar `CaptureStorageService` em `providers` no `AppModule`.

- [ ] **Step 5: Rodar teste**

Run:

```bash
npm --workspace @veridit/capture-service run test -- capture-storage.service.spec.ts
```

Expected:

```text
PASS src/capture/capture-storage.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/capture-service/src/capture/capture-storage.service.ts apps/capture-service/src/capture/capture-storage.service.spec.ts apps/capture-service/src/app.module.ts
git commit -m "feat: add capture asset storage"
```

---

## Task 5: Playwright Session Manager

**Files:**
- Create: `apps/capture-service/src/capture/playwright-browser.service.ts`
- Create: `apps/capture-service/src/capture/capture-session-manager.service.ts`
- Test: `apps/capture-service/src/capture/capture-session-manager.service.spec.ts`
- Modify: `apps/capture-service/src/app.module.ts`

- [ ] **Step 1: Definir interface interna de sessao**

Criar tipos internos pequenos:

```ts
type CaptureSession = {
  recordId: string;
  userId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  viewport: { width: number; height: number };
  recordingPath?: string;
  lastActivityAt: number;
};
```

- [ ] **Step 2: Escrever testes com Playwright mockado**

Cobrir estes casos:

- `startSession` abre browser, context e page com viewport configurado;
- `getFrame` chama `page.screenshot({ type: "jpeg", quality })` e retorna base64;
- `sendInput` mapeia `click` para `page.mouse.click(x, y)`;
- `sendInput` mapeia `wheel` para `page.mouse.wheel(deltaX, deltaY)`;
- `sendInput` mapeia `text` para `page.keyboard.insertText(value)`;
- `captureScreenshot` salva PNG em disco e retorna caminho;
- `startVideo` falha com `ConflictException` se ja estiver gravando;
- `stopVideo` falha com `ConflictException` se nao estiver gravando;
- `closeSession` fecha browser e remove sessao da memoria;
- sessao inexistente retorna `NotFoundException`.

- [ ] **Step 3: Implementar `PlaywrightBrowserService`**

Responsabilidade unica:

- chamar `chromium.launch({ headless: true })`;
- criar context com viewport;
- criar page;
- executar `page.goto(siteUrl, { waitUntil: "domcontentloaded", timeout: 30000 })`;
- retornar `{ browser, context, page }`.

- [ ] **Step 4: Implementar `CaptureSessionManagerService`**

Responsabilidades:

- manter `Map<string, CaptureSession>`;
- `startSession(record)` inicia browser remoto;
- `getFrame(recordId)` retorna JPEG base64;
- `sendInput(recordId, input)` aplica input na pagina;
- `captureScreenshot(recordId, filePath)` salva PNG;
- `startVideo(recordId, filePath)` chama `page.screencast.start({ path: filePath })`;
- `stopVideo(recordId)` chama `page.screencast.stop()`;
- `closeSession(recordId)` fecha browser;
- `closeIdleSessions()` encerra sessoes com `lastActivityAt` acima de `CAPTURE_IDLE_TTL_MS`;
- `onModuleDestroy()` fecha todos os browsers abertos.

- [ ] **Step 5: Registrar providers**

Adicionar em `AppModule`:

```ts
PlaywrightBrowserService,
CaptureSessionManagerService
```

- [ ] **Step 6: Rodar teste**

Run:

```bash
npm --workspace @veridit/capture-service run test -- capture-session-manager.service.spec.ts
```

Expected:

```text
PASS src/capture/capture-session-manager.service.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/capture-service/src/capture/playwright-browser.service.ts apps/capture-service/src/capture/capture-session-manager.service.ts apps/capture-service/src/capture/capture-session-manager.service.spec.ts apps/capture-service/src/app.module.ts
git commit -m "feat: manage remote browser capture sessions"
```

---

## Task 6: Capture Service HTTP API

**Files:**
- Create: `apps/capture-service/src/dto/start-capture.dto.ts`
- Create: `apps/capture-service/src/dto/browser-input.dto.ts`
- Modify: `apps/capture-service/src/app.controller.ts`
- Modify: `apps/capture-service/src/app.service.ts`
- Test: `apps/capture-service/src/app.controller.spec.ts`
- Test: `apps/capture-service/src/app.service.spec.ts`

- [ ] **Step 1: Criar DTO de inicio**

`StartCaptureDto`:

- `userId`: string obrigatoria;
- `siteUrl`: URL obrigatoria;
- `title`: string opcional.

Quando `title` vier vazio, o service deve gerar:

```text
Captura - <hostname> - <YYYY-MM-DD HH:mm>
```

- [ ] **Step 2: Criar DTO de input**

`BrowserInputDto` deve validar:

- `type` em `click`, `wheel`, `key`, `text`;
- `click`: `x` e `y` numericos, inteiros, `>= 0`;
- `wheel`: `deltaX` e `deltaY` numericos;
- `key`: `key` string nao vazia;
- `text`: `value` string nao vazia com limite de 500 caracteres.

- [ ] **Step 3: Escrever testes do service**

Cobrir:

- `startRecord` valida URL, cria `ContentRecord` com `STARTED` e inicia Playwright;
- `getFrame` delega para session manager;
- `sendInput` delega para session manager;
- `captureScreenshot` salva PNG, cria `CaptureAsset` tipo `IMAGE` e retorna asset;
- `startVideo` inicia gravacao sem criar asset;
- `stopVideo` cria `CaptureAsset` tipo `VIDEO` e retorna asset;
- `completeRecord` fecha sessao, atualiza `finishedAt/status`, conta assets e publica `capture.completed`.

- [ ] **Step 4: Implementar `AppService` real**

Adicionar metodos:

```ts
startRecord(body: StartCaptureRequest): Promise<StartCaptureSessionResponse>
getRecord(recordId: string): Promise<ContentRecordResponse>
getFrame(recordId: string): Promise<CaptureFrameResponse>
sendInput(recordId: string, input: BrowserInputRequest): Promise<BrowserInputResponse>
captureScreenshot(recordId: string): Promise<CaptureAssetResponse>
startVideo(recordId: string): Promise<CaptureVideoStateResponse>
stopVideo(recordId: string): Promise<CaptureVideoStateResponse>
completeRecord(recordId: string): Promise<CompleteCaptureResponse>
```

Erro esperado:

- registro inexistente: `NotFoundException`;
- registro ja concluido: `ConflictException`;
- sessao de browser ausente em registro `STARTED`: `ConflictException` com mensagem `Sessao de captura nao esta ativa`;
- URL bloqueada: `BadRequestException`.

- [ ] **Step 5: Expor rotas no controller**

Mapeamento:

```text
POST /records -> startRecord
GET /records/:recordId -> getRecord
GET /records/:recordId/frame -> getFrame
POST /records/:recordId/input -> sendInput
POST /records/:recordId/screenshots -> captureScreenshot
POST /records/:recordId/video/start -> startVideo
POST /records/:recordId/video/stop -> stopVideo
POST /records/:recordId/complete -> completeRecord
```

Manter `POST /records/mock` funcionando para demos antigas ate a UI deixar de usar.

- [ ] **Step 6: Rodar testes do capture-service**

Run:

```bash
npm --workspace @veridit/capture-service run test
```

Expected:

```text
PASS
```

- [ ] **Step 7: Rodar build**

Run:

```bash
npm --workspace @veridit/capture-service run build
```

Expected: exit code `0`.

- [ ] **Step 8: Commit**

```bash
git add apps/capture-service/src apps/capture-service/package.json apps/capture-service/.env.example
git commit -m "feat: expose real capture session api"
```

---

## Task 7: API Gateway Proxy

**Files:**
- Modify: `apps/api-gateway/src/app.controller.ts`
- Modify: `apps/api-gateway/src/app.service.ts`
- Test: `apps/api-gateway/src/app.controller.spec.ts`
- Test: `apps/api-gateway/src/app.service.spec.ts`

- [ ] **Step 1: Escrever testes de controller**

Adicionar expectativas:

- `POST /capture/records` chama `appService.startCapture`;
- `GET /capture/records/:recordId` chama `appService.getCaptureRecord`;
- `GET /capture/records/:recordId/frame` chama `appService.getCaptureFrame`;
- `POST /capture/records/:recordId/input` chama `appService.sendCaptureInput`;
- `POST /capture/records/:recordId/screenshots` chama `appService.captureScreenshot`;
- `POST /capture/records/:recordId/video/start` chama `appService.startCaptureVideo`;
- `POST /capture/records/:recordId/video/stop` chama `appService.stopCaptureVideo`;
- `POST /capture/records/:recordId/complete` chama `appService.completeCapture`.

- [ ] **Step 2: Escrever testes de service**

Mockar `fetch` e verificar que as chamadas vao para:

```text
http://127.0.0.1:3103/records
http://127.0.0.1:3103/records/record-1
http://127.0.0.1:3103/records/record-1/frame
http://127.0.0.1:3103/records/record-1/input
http://127.0.0.1:3103/records/record-1/screenshots
http://127.0.0.1:3103/records/record-1/video/start
http://127.0.0.1:3103/records/record-1/video/stop
http://127.0.0.1:3103/records/record-1/complete
```

Preservar erros `400`, `404` e `409` do `capture-service` como `HttpException`, igual ao fluxo de billing com `preserveClientErrors`.

- [ ] **Step 3: Implementar metodos no service**

Adicionar metodos com nomes alinhados aos testes:

```ts
startCapture(body, idempotencyKey?)
getCaptureRecord(recordId)
getCaptureFrame(recordId)
sendCaptureInput(recordId, body)
captureScreenshot(recordId)
startCaptureVideo(recordId)
stopCaptureVideo(recordId)
completeCapture(recordId)
```

Nao exigir `Idempotency-Key` nesta primeira versao.

- [ ] **Step 4: Implementar rotas no controller**

Usar os mesmos paths publicos definidos em "Rotas Alvo".

- [ ] **Step 5: Rodar testes**

Run:

```bash
npm --workspace @veridit/api-gateway run test
```

Expected:

```text
PASS src/app.controller.spec.ts
PASS src/app.service.spec.ts
```

- [ ] **Step 6: Rodar build**

Run:

```bash
npm --workspace @veridit/api-gateway run build
```

Expected: exit code `0`.

- [ ] **Step 7: Commit**

```bash
git add apps/api-gateway/src/app.controller.ts apps/api-gateway/src/app.service.ts apps/api-gateway/src/app.controller.spec.ts apps/api-gateway/src/app.service.spec.ts
git commit -m "feat: proxy real capture session routes"
```

---

## Task 8: Web Gateway Client

**Files:**
- Modify: `apps/web/src/lib/gateway.ts`

- [ ] **Step 1: Adicionar funcoes HTTP**

Adicionar funcoes pequenas:

```ts
startCaptureSession(payload)
getCaptureRecord(recordId)
getCaptureFrame(recordId)
sendCaptureInput(recordId, payload)
captureScreenshot(recordId)
startCaptureVideo(recordId)
stopCaptureVideo(recordId)
completeCapture(recordId)
```

- [ ] **Step 2: Garantir retorno tipado**

Importar tipos de `@veridit/contracts`:

```ts
StartCaptureSessionResponse
CaptureFrameResponse
BrowserInputRequest
BrowserInputResponse
CaptureAssetResponse
CaptureVideoStateResponse
CompleteCaptureResponse
```

- [ ] **Step 3: Manter `startMockCapture` temporariamente**

Nao remover `startMockCapture` neste task. A remocao deve acontecer apenas depois que a nova UI nao importar mais essa funcao.

- [ ] **Step 4: Build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected: exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/gateway.ts
git commit -m "feat: add capture session gateway client"
```

---

## Task 9: URL Entry Screen

**Files:**
- Modify: `apps/web/src/app/captura/page.tsx`
- Modify: `apps/web/src/components/veridit/capture-client.tsx`

- [ ] **Step 1: Simplificar a pagina**

`apps/web/src/app/captura/page.tsx` deve continuar usando:

```tsx
<AppShell active="capture">
```

Atualizar o heading:

```text
title: "Nova captura"
description: "Informe o site que sera aberto em uma sessao navegavel para registro."
```

- [ ] **Step 2: Trocar formulario antigo**

`CaptureClient` deve ter:

- input obrigatorio `URL do site`;
- input opcional `Titulo do registro`;
- resumo de saldo existente;
- botao `Abrir sessao de captura`;
- estado loading enquanto chama o gateway.

Remover da tela inicial:

- escolha previa entre video e screenshot;
- preview mock;
- checklist tecnico;
- switch de rolagem;
- chamada para `startMockCapture`.

- [ ] **Step 3: Gerar titulo quando vazio**

No submit:

- ler sessao com `getAuthSession()`;
- validar sessao ausente com toast e retorno;
- chamar `startCaptureSession`;
- se `title` estiver vazio, enviar string vazia e deixar o backend gerar o titulo;
- em sucesso, navegar para:

```ts
router.push(`/captura/${result.data.id}`);
```

- [ ] **Step 4: Tratar erro de URL bloqueada**

Se gateway retornar `400`, mostrar:

```text
Nao foi possivel abrir essa URL para captura.
```

Description:

```text
Use um endereco publico iniciado por http:// ou https://.
```

- [ ] **Step 5: Rodar build**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected: exit code `0`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/captura/page.tsx apps/web/src/components/veridit/capture-client.tsx
git commit -m "feat: create capture url entry screen"
```

---

## Task 10: Navigable Capture Workspace

**Files:**
- Create: `apps/web/src/app/captura/[recordId]/page.tsx`
- Create: `apps/web/src/components/veridit/capture-workspace-client.tsx`
- Modify: `apps/web/src/app/captura/concluida/page.tsx`

- [ ] **Step 1: Criar pagina por registro**

`apps/web/src/app/captura/[recordId]/page.tsx` deve:

- receber `params.recordId`;
- renderizar `AppShell active="capture"`;
- renderizar `CaptureWorkspaceClient recordId={recordId}`.

- [ ] **Step 2: Criar layout do workspace**

`CaptureWorkspaceClient` deve ter:

- area principal com container 16:9;
- imagem do frame remoto dentro do container;
- camada transparente por cima para capturar mouse, teclado e paste;
- lateral fixa com botoes:
  - `Tirar print`;
  - `Iniciar gravacao`;
  - `Parar gravacao`;
  - `Concluir captura`;
- painel pequeno com URL atual e status.

- [ ] **Step 3: Implementar polling de frame**

Comportamento:

- buscar frame inicial ao montar;
- atualizar a cada `500 ms` enquanto `document.visibilityState === "visible"`;
- pausar polling enquanto uma requisicao de frame estiver em andamento;
- mostrar skeleton enquanto nao houver frame;
- em erro `409`, mostrar estado:

```text
Sessao de captura nao esta ativa.
```

- [ ] **Step 4: Mapear clique**

No `pointerdown` da camada transparente:

- medir `getBoundingClientRect()`;
- converter coordenadas renderizadas para viewport remoto;
- enviar:

```ts
{ type: "click", x, y }
```

- chamar `refreshFrame()` apos o input.

- [ ] **Step 5: Mapear scroll**

No `wheel`:

- chamar `event.preventDefault()`;
- enviar:

```ts
{ type: "wheel", deltaX: event.deltaX, deltaY: event.deltaY }
```

- chamar `refreshFrame()` apos o input.

- [ ] **Step 6: Mapear teclado**

A camada deve ter `tabIndex={0}`.

No `keydown`:

- ignorar teclas modificadoras isoladas (`Shift`, `Control`, `Alt`, `Meta`);
- enviar:

```ts
{
  type: "key",
  key: event.key,
  code: event.code,
  ctrlKey: event.ctrlKey,
  shiftKey: event.shiftKey,
  altKey: event.altKey,
  metaKey: event.metaKey
}
```

- chamar `refreshFrame()` apos o input.

- [ ] **Step 7: Mapear paste**

No `paste`:

- ler `event.clipboardData.getData("text")`;
- se houver texto, enviar:

```ts
{ type: "text", value }
```

- limitar no frontend a 500 caracteres para bater com DTO.

- [ ] **Step 8: Implementar botao de print**

Ao clicar:

- chamar `captureScreenshot(recordId)`;
- mostrar toast:

```text
Print salvo no registro.
```

- chamar `refreshFrame()`.

- [ ] **Step 9: Implementar botoes de video**

Estado:

- `recording=false`: botao `Iniciar gravacao` habilitado, `Parar gravacao` desabilitado;
- `recording=true`: botao `Iniciar gravacao` desabilitado, `Parar gravacao` habilitado.

Ao iniciar:

- chamar `startCaptureVideo(recordId)`;
- mostrar toast:

```text
Gravacao iniciada.
```

Ao parar:

- chamar `stopCaptureVideo(recordId)`;
- mostrar toast:

```text
Video salvo no registro.
```

- [ ] **Step 10: Implementar conclusao**

Ao clicar `Concluir captura`:

- se `recording=true`, primeiro chamar `stopCaptureVideo(recordId)`;
- chamar `completeCapture(recordId)`;
- navegar para:

```ts
router.push(`/captura/concluida?recordId=${recordId}`);
```

- [ ] **Step 11: Atualizar tela concluida**

`/captura/concluida` deve ler `recordId` via `searchParams` e exibir:

```text
Registro: <recordId>
```

Manter links para dashboard e nova captura.

- [ ] **Step 12: Build do web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected: exit code `0`.

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/app/captura/[recordId]/page.tsx apps/web/src/components/veridit/capture-workspace-client.tsx apps/web/src/app/captura/concluida/page.tsx
git commit -m "feat: add navigable capture workspace"
```

---

## Task 11: End-To-End Manual Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Gerar Prisma se necessario**

Run:

```bash
npm run prisma:generate
```

Expected: exit code `0`.

- [ ] **Step 2: Subir ambiente**

Run:

```bash
npm run dev
```

Expected:

```text
@veridit/web: dev
@veridit/api-gateway: dev
@veridit/capture-service: dev
```

e servicos respondendo nas portas do repo.

- [ ] **Step 3: Verificar health**

Abrir:

```text
http://localhost:3001/capture/health
```

Expected:

```json
{ "service": "capture-service", "status": "ok" }
```

- [ ] **Step 4: Fluxo feliz com site publico**

No browser:

1. abrir `http://localhost:3000/dashboard`;
2. clicar `Nova Captura`;
3. informar `https://example.com`;
4. clicar `Abrir sessao de captura`;
5. confirmar que a pagina vai para `/captura/<recordId>`;
6. confirmar que o container mostra o conteudo de `example.com`;
7. clicar dentro do container;
8. clicar `Tirar print`;
9. clicar `Iniciar gravacao`;
10. rolar a pagina dentro do container;
11. clicar `Parar gravacao`;
12. clicar `Concluir captura`;
13. confirmar redirecionamento para `/captura/concluida?recordId=<recordId>`.

- [ ] **Step 5: Verificar banco**

No banco `veridit_capture`, confirmar:

```sql
select id, status, "siteUrl", "finishedAt" from "ContentRecord" order by "startedAt" desc limit 1;
select "recordId", type, "fileName", "fileSizeBytes" from "CaptureAsset" order by "createdAt" desc limit 5;
```

Expected:

- `ContentRecord.status = COMPLETED`;
- pelo menos um asset `IMAGE`;
- um asset `VIDEO` quando a gravacao foi iniciada e parada;
- `fileSizeBytes > 0`.

- [ ] **Step 6: Verificar storage**

Confirmar que existe diretorio:

```text
apps/capture-service/storage/captures/<recordId>
```

Expected:

- arquivo `.png` criado pelo print;
- arquivo `.webm` criado pelo video;
- ambos com tamanho maior que zero.

- [ ] **Step 7: Fluxo de URL bloqueada**

Na tela `/captura`, tentar:

```text
http://localhost:3000
```

Expected:

- nao abre sessao;
- mostra toast de URL invalida/bloqueada;
- nenhum browser remoto fica aberto.

- [ ] **Step 8: Verificar encerramento**

Depois de concluir a captura:

- chamar `GET /capture/records/:recordId/frame`;
- expected: `409` com mensagem `Sessao de captura nao esta ativa`.

- [ ] **Step 9: Rodar suite final**

Run:

```bash
npm --workspace @veridit/capture-service run test
npm --workspace @veridit/api-gateway run test
npm --workspace @veridit/web run build
npm run build
```

Expected: todos finalizam com exit code `0`.

- [ ] **Step 10: Commit de ajustes de verificacao**

Se a verificacao manual exigir pequenos ajustes, fazer commit separado:

```bash
git add <arquivos-ajustados>
git commit -m "fix: stabilize capture session flow"
```

---

## Acceptance Criteria

- `/captura` exibe uma tela simples para iniciar nova captura a partir de URL.
- Ao iniciar, o backend cria `ContentRecord` com status `STARTED`.
- O usuario e redirecionado para `/captura/<recordId>`.
- O container da sessao mostra frames reais do site aberto por Playwright.
- Clique, scroll, teclado e paste no container sao enviados para o navegador remoto.
- Botao `Tirar print` cria arquivo PNG e linha `CaptureAsset` tipo `IMAGE`.
- Botao `Iniciar gravacao` inicia gravacao da sessao remota.
- Botao `Parar gravacao` cria arquivo WEBM e linha `CaptureAsset` tipo `VIDEO`.
- Botao `Concluir captura` fecha navegador remoto, marca registro como `COMPLETED`, seta `finishedAt` e publica `capture.completed`.
- Frontend chama apenas `NEXT_PUBLIC_API_GATEWAY_URL`.
- URLs privadas, locais e protocolos nao HTTP(S) sao bloqueados por padrao.
- Build de `contracts`, `capture-service`, `api-gateway` e `web` passa.

## Risks And Controls

- **Sites com bot protection:** Playwright abre o site como navegador real, mas alguns sites podem bloquear automacao. O sistema deve mostrar erro claro quando `page.goto` falhar.
- **Latencia do polling:** 500 ms e suficiente para primeiro corte. Reduzir demais aumenta CPU e trafego por base64.
- **SSRF:** URL policy bloqueia host privado por padrao.
- **Memoria de sessoes:** sessoes ficam em memoria. TTL fecha sessoes esquecidas.
- **Arquivos locais:** storage local funciona para desenvolvimento. Deploy em producao deve mapear `CAPTURE_STORAGE_DIR` para volume persistente.

## Documentation Notes

Depois da implementacao, atualizar:

- `docs/04-servicos.md` com as novas rotas reais de captura.
- `docs/07-como-implementar-novas-features.md` removendo a pendencia generica de "captura real" ou apontando para o que ainda falta: relatorio real, ZIP e consumo de credito.
- `docs/02-como-rodar.md` com `playwright install chromium` e as variaveis `CAPTURE_*`.

## Self-Review

- Spec coverage: o plano cobre tela de URL, container navegavel, print do container, gravacao de video, persistencia de assets e conclusao basica do registro.
- Placeholder scan: o plano nao usa marcadores de trabalho indefinido nem passos sem criterio de conclusao.
- Type consistency: rotas, contratos e nomes de metodos usam `recordId`, `CaptureFrameResponse`, `BrowserInputRequest`, `CaptureAssetResponse` e `CompleteCaptureResponse` de forma consistente.
