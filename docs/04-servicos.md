# Servicos

## `apps/web`

Frontend Next.js. Deve consumir somente o API Gateway, inclusive para relatorios, ZIP e preview ao vivo.

Fluxos principais:

- autenticacao e perfil;
- compra de creditos;
- captura de conteudo com preview WebSocket;
- dashboard/listagem de registros;
- detalhe do registro com usuario responsavel;
- relatorio em PDF;
- ZIP com assets reais do registro.

## `apps/api-gateway`

Entrada HTTP e WebSocket para o frontend. O browser nao deve chamar portas internas dos microsservicos.

Rotas HTTP atuais:

Identity:

- `GET /identity/health`
- `POST /identity/users`
- `GET /identity/users/:id`
- `PATCH /identity/users/:id`
- `PATCH /identity/users/:id/password`
- `POST /identity/auth/login`
- `POST /identity/auth/forgot-password`
- `POST /identity/auth/reset-password`
- `POST /identity/login` como alias legado

Billing:

- `GET /billing/health`
- `GET /billing/packages`
- `GET /billing/users/:userId/credits`
- `POST /billing/purchases`
- `POST /billing/purchases/card`
- `POST /billing/purchases/mock`
- `POST /billing/purchases/:purchaseId/mercado-pago/card-payment`
- `POST /billing/purchases/:purchaseId/simulate-payment`
- `POST /billing/payments/mercado-pago/webhook`

Capture:

- `GET /capture/health`
- `POST /capture/records`
- `POST /capture/records/mock`
- `GET /capture/records/:recordId`
- `GET /capture/users/:userId/records`
- `GET /capture/records/:recordId/assets`
- `GET /capture/records/:recordId/assets/:assetId/download`
- `GET /capture/records/:recordId/frame`
- `POST /capture/records/:recordId/input`
- `POST /capture/records/:recordId/navigate`
- `POST /capture/records/:recordId/screenshots`
- `POST /capture/records/:recordId/video/start`
- `POST /capture/records/:recordId/video/stop`
- `POST /capture/records/:recordId/complete`

Outras:

- `GET /health`

WebSocket:

- `/capture/preview?recordId=<id>`

## `apps/identity-service`

Responsavel por usuarios, perfis, login e recuperacao de senha. Fornece nome e email do usuario responsavel para o detalhe dos registros realizados.

Publica:

- `identity.user_registered` apos cadastro;
- `identity.password_reset_requested` apos solicitacao valida de recuperacao de senha.

## `apps/billing-service`

Responsavel por pacotes, creditos e compras.

A compra real cria uma preferencia Mercado Pago com `external_reference` apontando para a compra interna. O saldo so e creditado quando o webhook Mercado Pago informa pagamento aprovado, ou quando a rota de simulacao e usada em desenvolvimento.

O processamento e idempotente: webhooks duplicados nao duplicam creditos nem eventos `billing.credit_purchased`.

Rotas mock continuam disponiveis para demos locais e testes legados, mas nao sao a fonte de verdade dos requisitos.

## `apps/capture-service`

Responsavel por registros de conteudo, sessoes Playwright e assets capturados.

Ele atende os requisitos de captura e registro:

- REQ 08: iniciar registro de conteudo;
- REQ 09: concluir gravacao de conteudo;
- REQ 11: concluir captura de tela;
- REQ 12: listar registros realizados;
- REQ 13: fornecer dados reais do detalhe;
- REQ 14 e REQ 15: fornecer dados e assets reais usados pelo relatorio e ZIP.

Tambem expoe o WebSocket interno `/preview?recordId=<id>`, usado somente pelo API Gateway.

## `apps/notification-service`

Responsavel por notificacoes por email. Consome eventos pelo RabbitMQ, envia emails por SMTP via Gmail/Nodemailer e persiste o status da tentativa (`PENDING`, `SENT` ou `FAILED`).

Eventos consumidos:

- `identity.user_registered`;
- `identity.password_reset_requested`;
- `billing.credit_purchased`;
- `capture.completed`.

## `apps/report-service`

Servico auxiliar legado para eventos de relatorio. Hoje o fluxo principal dos REQ 14 e REQ 15 nao depende dele: o frontend/server route monta relatorio e ZIP a partir dos dados reais do API Gateway, que por sua vez consulta `capture-service` e `identity-service`.

Se o relatorio assincrono voltar a ser necessario, este servico deve ser atualizado para usar os mesmos dados reais do registro, sem gerar saida mockada.
