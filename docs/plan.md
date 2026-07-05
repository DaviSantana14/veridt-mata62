# Mercado Pago Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o fluxo de compra real em sandbox com Mercado Pago: o usuário cria uma preferência pelo frontend, é redirecionado ao checkout sandbox, retorna para o app, e o pagamento aprovado credita saldo via webhook.

**Architecture:** O frontend continua consumindo somente o API Gateway. O API Gateway encaminha criação de compra e webhook para o billing-service. O billing-service continua dono da regra de créditos, do banco, da criação de preferência no Mercado Pago e do processamento idempotente de webhooks.

**Tech Stack:** Next.js App Router, NestJS, Prisma, PostgreSQL, Mercado Pago Node.js SDK (`mercadopago`), Jest, npm workspaces.

---

## Referências Técnicas Confirmadas

- O SDK oficial `mercadopago` cria preferências com `Preference.create({ body, requestOptions })`.
- `body.back_urls` aceita `success`, `pending` e `failure`.
- `body.notification_url` deve apontar para uma URL HTTPS acessível pelo Mercado Pago.
- `body.external_reference` deve carregar o `purchaseId` interno para reconciliar pagamento com compra.
- `requestOptions.idempotencyKey` é suportado na criação da preferência.
- O pagamento pode ser consultado pelo SDK com `Payment.get({ id })`.
- A validação de webhook usa headers `x-signature` e `x-request-id`; o manifesto da assinatura é `id:{data.id};request-id:{x-request-id};ts:{ts};`.

## Estado Atual do Código

- `apps/billing-service` já cria compras pendentes, cria preferência no Mercado Pago, persiste `providerPreferenceId` e `checkoutUrl`, consulta pagamentos por webhook e credita saldo uma única vez.
- `apps/api-gateway` já expõe `POST /billing/purchases`, mas ainda não expõe proxy para `POST /billing/payments/mercado-pago/webhook`.
- `apps/web` ainda usa `createMockPurchase()` e chama `/billing/purchases/mock` na tela de pagamento.
- `apps/web` usa planos `initial`, `professional`, `enterprise`; o backend aceita `basic`, `medium`, `premium`.
- `apps/billing-service/.env.example` possui variáveis do Mercado Pago, mas os redirects default apontam para rotas que não existem.
- A suíte do `api-gateway` está bloqueada por divergência de TypeScript: build resolve TypeScript 6 no workspace, Jest resolve TypeScript 5.9 na raiz e rejeita `ignoreDeprecations: "6.0"`.

## Estrutura de Arquivos

- Modify: `apps/api-gateway/package.json`  
  Alinhar TypeScript do gateway com a raiz para estabilizar build e Jest.

- Modify: `apps/api-gateway/tsconfig.json`  
  Remover configuração aceita só por TypeScript 6 se o gateway voltar a usar TypeScript 5.9.

- Modify: `package-lock.json`  
  Refletir alterações de dependência/configuração.

- Modify: `apps/api-gateway/src/app.controller.ts`  
  Adicionar endpoint público de webhook do Mercado Pago sob o namespace do billing.

- Modify: `apps/api-gateway/src/app.service.ts`  
  Encaminhar payload, query e headers relevantes do webhook para o billing-service.

- Modify: `apps/api-gateway/src/app.controller.spec.ts`  
  Cobrir rejeição/encaminhamento do webhook pelo controller.

- Modify: `apps/api-gateway/src/app.service.spec.ts`  
  Cobrir proxy do webhook para `billing-service`.

- Modify: `apps/billing-service/src/payments/mercado-pago-payment.provider.ts`  
  Tornar sandbox explícito, preferir `sandbox_init_point` quando o ambiente for sandbox, e centralizar URLs de retorno.

- Create: `apps/billing-service/src/payments/mercado-pago-webhook-signature.ts`  
  Validar assinatura HMAC do webhook quando `MERCADO_PAGO_WEBHOOK_SECRET` estiver configurado.

- Modify: `apps/billing-service/src/app.controller.ts`  
  Ler headers `x-signature` e `x-request-id` e repassar ao service.

- Modify: `apps/billing-service/src/app.service.ts`  
  Validar assinatura antes de consultar o pagamento, mantendo comportamento idempotente.

- Modify: `apps/billing-service/src/app.service.spec.ts`  
  Cobrir webhooks válidos, assinatura ausente quando segredo está configurado, assinatura inválida e ausência de segredo em sandbox local.

- Modify: `apps/billing-service/.env.example`  
  Documentar ambiente sandbox, segredo de webhook e URLs finais.

- Modify: `apps/web/src/lib/gateway.ts`  
  Adicionar client para `POST /billing/purchases` com `Idempotency-Key`.

- Modify: `apps/web/src/lib/mock-data.ts`  
  Mapear cada plano visual para o pacote do backend.

- Modify: `apps/web/src/components/veridit/payment-client.tsx`  
  Trocar a ação da aba Mercado Pago para criar preferência real e redirecionar ao checkout sandbox.

- Create: `apps/web/src/app/pagamento/retorno/page.tsx`  
  Mostrar retorno de sucesso, pendência ou falha após o checkout.

- Modify: `apps/web/src/app/creditos/page.tsx`  
  Ajustar copy para indicar checkout sandbox real via Mercado Pago.

- Modify: `docs/02-como-rodar.md`  
  Documentar configuração sandbox, tunnel HTTPS e teste manual.

- Modify: `docs/04-servicos.md`  
  Atualizar rotas e responsabilidade do billing.

---

## Task 1: Estabilizar Tooling do API Gateway

**Files:**
- Modify: `apps/api-gateway/package.json`
- Modify: `apps/api-gateway/tsconfig.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Reproduzir a falha atual do Jest**

Run:

```bash
npm --workspace @veridit/api-gateway test -- --runInBand
```

Expected: FAIL com `TS5103: Invalid value for '--ignoreDeprecations'`.

- [ ] **Step 2: Alinhar TypeScript do gateway com a raiz**

Alterar `apps/api-gateway/package.json`:

```json
"typescript": "5.9.2"
```

Remover de `apps/api-gateway/tsconfig.json`:

```json
"ignoreDeprecations": "6.0"
```

Racional: a raiz já usa TypeScript 5.9.2, e `ts-jest` está resolvendo essa versão durante testes.

- [ ] **Step 3: Atualizar lockfile**

Run:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --fund=false
```

Expected: `package-lock.json` atualizado sem reinstalar scripts.

- [ ] **Step 4: Verificar build e testes do gateway**

Run:

```bash
npm --workspace @veridit/api-gateway run build
npm --workspace @veridit/api-gateway test -- --runInBand
```

Expected: ambos exit code 0.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/api-gateway/package.json apps/api-gateway/tsconfig.json package-lock.json
git commit -m "chore: align api gateway typescript tooling"
```

---

## Task 2: Expor Webhook do Mercado Pago Pelo API Gateway

**Files:**
- Modify: `apps/api-gateway/src/app.controller.ts`
- Modify: `apps/api-gateway/src/app.service.ts`
- Modify: `apps/api-gateway/src/app.controller.spec.ts`
- Modify: `apps/api-gateway/src/app.service.spec.ts`

- [ ] **Step 1: Escrever teste de controller para webhook**

Adicionar caso em `apps/api-gateway/src/app.controller.spec.ts`:

```ts
it('forwards Mercado Pago webhook payloads', async () => {
  await controller.handleMercadoPagoWebhook(
    { type: 'payment', data: { id: 'payment-1' } },
    { 'x-request-id': 'request-1' },
    {},
  );
});
```

Expected behavior: o controller chama `appService.handleMercadoPagoWebhook(...)` com `body`, `headers` e `query`.

- [ ] **Step 2: Escrever teste de service para proxy**

Adicionar caso em `apps/api-gateway/src/app.service.spec.ts`:

```ts
await service.handleMercadoPagoWebhook(
  { type: 'payment', data: { id: 'payment-1' } },
  { 'x-request-id': 'request-1' },
  {},
);
```

Expected fetch:

```text
POST http://localhost:3102/payments/mercado-pago/webhook
```

Headers esperados:

```text
content-type: application/json
x-request-id: request-1
```

- [ ] **Step 3: Rodar testes e confirmar falha**

Run:

```bash
npm --workspace @veridit/api-gateway test -- --runInBand
```

Expected: FAIL porque `handleMercadoPagoWebhook` ainda não existe.

- [ ] **Step 4: Implementar controller**

Adicionar em `apps/api-gateway/src/app.controller.ts`:

```ts
@Post('billing/payments/mercado-pago/webhook')
handleMercadoPagoWebhook(...) {
  return this.appService.handleMercadoPagoWebhook(body, headers, query);
}
```

Usar `@Body()`, `@Headers()` e `@Query()` para preservar os dados enviados pelo Mercado Pago.

- [ ] **Step 5: Implementar service**

Adicionar em `apps/api-gateway/src/app.service.ts`:

```ts
handleMercadoPagoWebhook(body, headers, query) {
  return this.postToService('billing-service', this.urls.billing, '/payments/mercado-pago/webhook', mergedPayload, filteredHeaders);
}
```

Filtrar e repassar apenas estes headers externos:

```text
x-signature
x-request-id
```

- [ ] **Step 6: Rodar testes do gateway**

Run:

```bash
npm --workspace @veridit/api-gateway test -- --runInBand
npm --workspace @veridit/api-gateway run build
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/api-gateway/src/app.controller.ts apps/api-gateway/src/app.service.ts apps/api-gateway/src/app.controller.spec.ts apps/api-gateway/src/app.service.spec.ts
git commit -m "feat: proxy mercado pago webhook through gateway"
```

---

## Task 3: Fechar Comportamento Sandbox no Billing Provider

**Files:**
- Modify: `apps/billing-service/src/payments/mercado-pago-payment.provider.ts`
- Create: `apps/billing-service/src/payments/mercado-pago-payment.provider.spec.ts`
- Modify: `apps/billing-service/.env.example`

- [ ] **Step 1: Escrever testes do provider**

Criar `apps/billing-service/src/payments/mercado-pago-payment.provider.spec.ts` cobrindo:

- sandbox usa `sandbox_init_point`;
- production usa `init_point`;
- preference recebe `external_reference`, `notification_url`, `back_urls` e `requestOptions.idempotencyKey`;
- erro claro quando `MERCADO_PAGO_ACCESS_TOKEN` ou `MERCADO_PAGO_WEBHOOK_URL` está vazio.

Snippet de expectativa:

```ts
expect(result.checkoutUrl).toBe('https://sandbox.mercadopago.test/checkout');
expect(preferenceCreate).toHaveBeenCalledWith(expect.objectContaining({
  requestOptions: { idempotencyKey: 'key-1' },
}));
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run:

```bash
npm --workspace @veridit/billing-service test -- --runInBand mercado-pago-payment.provider.spec.ts
```

Expected: FAIL porque a seleção explícita de sandbox ainda não existe.

- [ ] **Step 3: Adicionar variável de ambiente de modo**

Adicionar em `apps/billing-service/.env.example`:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_WEBHOOK_SECRET=
```

Manter `MERCADO_PAGO_ACCESS_TOKEN` vazio no exemplo para evitar commit de segredo.

- [ ] **Step 4: Implementar seleção de checkout URL**

No provider, criar função curta:

```ts
function selectCheckoutUrl(response) {
  return isSandbox() ? response.sandbox_init_point : response.init_point;
}
```

Regras:

- `MERCADO_PAGO_ENVIRONMENT=sandbox` usa `sandbox_init_point`;
- `MERCADO_PAGO_ENVIRONMENT=production` usa `init_point`;
- valor ausente usa `sandbox`;
- se a URL esperada vier vazia, lançar `ServiceUnavailableException`.

- [ ] **Step 5: Ajustar defaults dos back_urls**

Trocar defaults para rotas existentes após Task 5:

```text
http://localhost:3000/pagamento/retorno?status=success
http://localhost:3000/pagamento/retorno?status=failure
http://localhost:3000/pagamento/retorno?status=pending
```

- [ ] **Step 6: Rodar testes do billing**

Run:

```bash
npm --workspace @veridit/billing-service test -- --runInBand
npm --workspace @veridit/billing-service run build
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/billing-service/src/payments/mercado-pago-payment.provider.ts apps/billing-service/src/payments/mercado-pago-payment.provider.spec.ts apps/billing-service/.env.example
git commit -m "feat: make mercado pago sandbox checkout explicit"
```

---

## Task 4: Validar Assinatura do Webhook no Billing

**Files:**
- Create: `apps/billing-service/src/payments/mercado-pago-webhook-signature.ts`
- Modify: `apps/billing-service/src/app.controller.ts`
- Modify: `apps/billing-service/src/app.service.ts`
- Modify: `apps/billing-service/src/app.service.spec.ts`

- [ ] **Step 1: Escrever testes de assinatura**

Adicionar casos em `apps/billing-service/src/app.service.spec.ts`:

- processa webhook sem segredo configurado;
- rejeita webhook com segredo configurado e `x-signature` ausente;
- rejeita webhook com `v1` inválido;
- aceita webhook com HMAC correto.

Expected rejection:

```ts
await expect(service.handleMercadoPagoWebhook(payload, headers)).rejects.toThrow(BadRequestException);
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run:

```bash
npm --workspace @veridit/billing-service test -- --runInBand
```

Expected: FAIL porque `handleMercadoPagoWebhook` ainda não recebe headers nem valida assinatura.

- [ ] **Step 3: Criar helper de assinatura**

Criar `apps/billing-service/src/payments/mercado-pago-webhook-signature.ts` com responsabilidade única:

```ts
export function verifyMercadoPagoWebhookSignature({ dataId, requestId, signature, secret }) { ... }
```

Regra de manifesto:

```text
id:{dataId};request-id:{requestId};ts:{ts};
```

Usar `crypto.createHmac('sha256', secret)` e comparação segura com `timingSafeEqual`.

- [ ] **Step 4: Repassar headers no controller**

Alterar `apps/billing-service/src/app.controller.ts` para chamar:

```ts
this.appService.handleMercadoPagoWebhook(payload, {
  xSignature: headers['x-signature'],
  xRequestId: headers['x-request-id'],
});
```

- [ ] **Step 5: Validar antes de consultar pagamento**

No início de `handleMercadoPagoWebhook`, quando `MERCADO_PAGO_WEBHOOK_SECRET` estiver preenchido:

- extrair `data.id` do body/query mesclado;
- exigir `x-signature`;
- exigir `x-request-id`;
- validar HMAC;
- lançar `BadRequestException` se qualquer verificação falhar.

- [ ] **Step 6: Rodar testes do billing**

Run:

```bash
npm --workspace @veridit/billing-service test -- --runInBand
npm --workspace @veridit/billing-service run build
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/billing-service/src/payments/mercado-pago-webhook-signature.ts apps/billing-service/src/app.controller.ts apps/billing-service/src/app.service.ts apps/billing-service/src/app.service.spec.ts
git commit -m "feat: validate mercado pago webhook signature"
```

---

## Task 5: Conectar Frontend ao Checkout Real

**Files:**
- Modify: `apps/web/src/lib/gateway.ts`
- Modify: `apps/web/src/lib/mock-data.ts`
- Modify: `apps/web/src/components/veridit/payment-client.tsx`
- Modify: `apps/web/src/app/creditos/page.tsx`

- [ ] **Step 1: Adicionar client real no gateway**

Em `apps/web/src/lib/gateway.ts`, criar:

```ts
export function createCreditPurchase(payload, idempotencyKey) {
  return requestGateway('/billing/purchases', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}
```

Tipo de retorno:

```ts
{ purchaseId: string; status: 'PENDING' | 'PAID' | 'CANCELED'; checkoutUrl: string; providerPreferenceId: string }
```

- [ ] **Step 2: Mapear planos do front para pacotes do backend**

Em `apps/web/src/lib/mock-data.ts`, adicionar em cada plano:

```ts
gatewayPackageName: 'basic' | 'medium' | 'premium'
```

Mapeamento:

```text
initial -> basic
professional -> medium
enterprise -> premium
```

- [ ] **Step 3: Alterar estado da tela de pagamento**

Em `apps/web/src/components/veridit/payment-client.tsx`, adicionar:

```ts
const [paymentMethod, setPaymentMethod] = useState<'pix' | 'mercado-pago'>('pix');
```

Usar `onValueChange` no `Tabs` para controlar o método selecionado.

- [ ] **Step 4: Implementar ação Mercado Pago**

Quando `paymentMethod === 'mercado-pago'`:

- gerar `idempotencyKey` com `crypto.randomUUID()`;
- chamar `createCreditPurchase`;
- se `result.ok`, redirecionar com `window.location.assign(result.data.checkoutUrl)`;
- se falhar, exibir `toast.error` com a mensagem do gateway;
- não chamar `createMockPurchase`.

- [ ] **Step 5: Manter Pix como simulação separada**

Quando `paymentMethod === 'pix'`:

- manter `createMockPurchase` por enquanto;
- ajustar texto do botão para `Confirmar Pix simulado`;
- ajustar texto da aba Mercado Pago para `Ir para checkout sandbox`.

- [ ] **Step 6: Atualizar copy da página de créditos**

Em `apps/web/src/app/creditos/page.tsx`, substituir texto que diz apenas “fluxo demonstrativo” por:

```text
Pix demonstrativo ou Mercado Pago sandbox.
```

- [ ] **Step 7: Verificar frontend**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected: exit code 0.

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/src/lib/gateway.ts apps/web/src/lib/mock-data.ts apps/web/src/components/veridit/payment-client.tsx apps/web/src/app/creditos/page.tsx
git commit -m "feat: connect web checkout to mercado pago sandbox"
```

---

## Task 6: Criar Página de Retorno do Checkout

**Files:**
- Create: `apps/web/src/app/pagamento/retorno/page.tsx`
- Modify: `apps/billing-service/.env.example`

- [ ] **Step 1: Criar página de retorno**

Criar `apps/web/src/app/pagamento/retorno/page.tsx`.

Ela deve ler `searchParams.status` e renderizar três estados:

```text
success -> pagamento recebido pelo Mercado Pago; saldo será confirmado pelo webhook
pending -> pagamento em análise ou aguardando confirmação
failure -> pagamento não concluído
```

Adicionar botões:

```text
Voltar para dashboard -> /dashboard
Comprar créditos -> /creditos
```

- [ ] **Step 2: Atualizar URLs no env example**

Em `apps/billing-service/.env.example`:

```env
FRONTEND_SUCCESS_URL=http://localhost:3000/pagamento/retorno?status=success
FRONTEND_FAILURE_URL=http://localhost:3000/pagamento/retorno?status=failure
FRONTEND_PENDING_URL=http://localhost:3000/pagamento/retorno?status=pending
```

- [ ] **Step 3: Verificar build web**

Run:

```bash
npm --workspace @veridit/web run build
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

Run:

```bash
git add apps/web/src/app/pagamento/retorno/page.tsx apps/billing-service/.env.example
git commit -m "feat: add mercado pago checkout return page"
```

---

## Task 7: Documentar Sandbox e URLs Públicas

**Files:**
- Modify: `docs/02-como-rodar.md`
- Modify: `docs/04-servicos.md`

- [ ] **Step 1: Atualizar docs de ambiente**

Em `docs/02-como-rodar.md`, adicionar seção “Mercado Pago sandbox” com:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_WEBHOOK_URL=https://<tunnel>/billing/payments/mercado-pago/webhook
FRONTEND_SUCCESS_URL=http://localhost:3000/pagamento/retorno?status=success
FRONTEND_FAILURE_URL=http://localhost:3000/pagamento/retorno?status=failure
FRONTEND_PENDING_URL=http://localhost:3000/pagamento/retorno?status=pending
```

Incluir regra explícita:

```text
Nunca commitar tokens TEST ou segredos reais.
```

- [ ] **Step 2: Documentar tunnel HTTPS**

Ainda em `docs/02-como-rodar.md`, explicar:

- Mercado Pago precisa alcançar `MERCADO_PAGO_WEBHOOK_URL` via HTTPS;
- para localhost, usar Cloudflare Tunnel, ngrok ou equivalente;
- se o webhook passar pelo gateway, o tunnel deve apontar para `http://localhost:3001`;
- se o webhook passar direto no billing, o tunnel deve apontar para `http://localhost:3102`.

Escolha recomendada para esta implementação:

```text
Gateway público -> /billing/payments/mercado-pago/webhook
```

- [ ] **Step 3: Atualizar lista de rotas**

Em `docs/04-servicos.md`, adicionar:

```text
POST /billing/purchases
POST /billing/payments/mercado-pago/webhook
```

Atualizar descrição do billing para dizer que:

- compra real cria preferência Mercado Pago;
- compra mock continua disponível para Pix/demo;
- saldo só é creditado após webhook aprovado.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/02-como-rodar.md docs/04-servicos.md
git commit -m "docs: document mercado pago sandbox flow"
```

---

## Task 8: Verificação Manual de Sandbox

**Files:**
- No code files.
- Use local `.env` files only; these files stay outside Git.

- [ ] **Step 1: Preparar ambientes**

Preencher `apps/billing-service/.env`:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=<token TEST do Mercado Pago>
MERCADO_PAGO_WEBHOOK_SECRET=<segredo da aplicação Mercado Pago>
MERCADO_PAGO_WEBHOOK_URL=https://<tunnel>/billing/payments/mercado-pago/webhook
```

- [ ] **Step 2: Subir infra e apps**

Run:

```bash
docker compose -f infra/docker-compose.yml up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Expected:

```text
frontend em http://localhost:3000
api-gateway em http://localhost:3001
billing-service em http://localhost:3102
```

- [ ] **Step 3: Criar tunnel HTTPS para o gateway**

Exemplo com Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3001
```

Configurar `MERCADO_PAGO_WEBHOOK_URL` com a URL pública gerada:

```text
https://<tunnel>/billing/payments/mercado-pago/webhook
```

- [ ] **Step 4: Executar compra sandbox pelo navegador**

Fluxo:

1. Abrir `http://localhost:3000/pagamento`.
2. Selecionar aba `Mercado Pago`.
3. Clicar no botão de checkout sandbox.
4. Confirmar que a URL aberta contém domínio do Mercado Pago sandbox.
5. Pagar com usuário/cartão de teste do Mercado Pago.
6. Confirmar retorno em `/pagamento/retorno?status=success` ou `pending`.

- [ ] **Step 5: Confirmar efeitos no banco**

Conferir no banco `veridit_billing`:

```sql
SELECT id, status, "providerPreferenceId", "providerPaymentId", "paidAt"
FROM "CreditPurchase"
ORDER BY "createdAt" DESC
LIMIT 3;

SELECT "userId", credits
FROM "UserCreditBalance"
ORDER BY "updatedAt" DESC
LIMIT 3;
```

Expected:

```text
CreditPurchase.status = PAID depois do webhook aprovado
UserCreditBalance.credits incrementado uma única vez
```

- [ ] **Step 6: Reenviar webhook duplicado**

Usar a ferramenta de teste do Mercado Pago ou reenviar a mesma notificação capturada.

Expected:

```text
CreditPurchase permanece PAID
UserCreditBalance não recebe créditos duplicados
```

---

## Task 9: Verificação Automatizada Final

**Files:**
- All modified files from previous tasks.

- [ ] **Step 1: Rodar testes unitários focados**

Run:

```bash
npm --workspace @veridit/api-gateway test -- --runInBand
npm --workspace @veridit/billing-service test -- --runInBand
```

Expected: all test suites pass.

- [ ] **Step 2: Rodar geração Prisma e builds**

Run:

```bash
npm --workspace @veridit/billing-service run prisma:generate
npm --workspace @veridit/contracts run build
npm --workspace @veridit/api-gateway run build
npm --workspace @veridit/billing-service run build
npm --workspace @veridit/web run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Checar conflitos e whitespace**

Run:

```bash
rg -n "<<<<<<<|=======|>>>>>>>" .
git diff --check
```

Expected:

```text
rg exits with no matches
git diff --check exits 0
```

- [ ] **Step 4: Revisar Git antes do commit final**

Run:

```bash
git status --short
git diff --stat
```

Expected:

```text
somente arquivos do plano de Mercado Pago aparecem alterados
arquivos .env locais não aparecem
```

- [ ] **Step 5: Commit final de integração**

Run:

```bash
git add apps docs package-lock.json
git commit -m "feat: complete mercado pago sandbox checkout"
```

---

## Critérios de Aceite

- Usuário consegue iniciar compra Mercado Pago no frontend sem usar `/billing/purchases/mock`.
- API Gateway encaminha `POST /billing/purchases` e `POST /billing/payments/mercado-pago/webhook`.
- Billing cria preferência com `external_reference = purchaseId`.
- Sandbox usa `sandbox_init_point`.
- Mercado Pago consegue chamar webhook público HTTPS.
- Webhook aprovado muda compra para `PAID` e incrementa créditos.
- Webhook duplicado não duplica créditos.
- Return page informa `success`, `pending` e `failure`.
- Documentação ensina configurar token TEST, webhook secret, tunnel e URLs.
- Nenhum segredo é commitado.
- Builds e testes focados passam.

## Self-Review

- Spec coverage: frontend real, gateway webhook, billing sandbox, assinatura, return pages, docs e verificação manual estão cobertos.
- Placeholder scan: o plano não usa marcadores de trabalho indefinido.
- Type consistency: nomes usados no plano batem com os nomes atuais: `CreateCreditPurchaseResponse`, `createCreditPurchase`, `handleMercadoPagoWebhook`, `providerPreferenceId`, `checkoutUrl`, `MERCADO_PAGO_WEBHOOK_URL`.
