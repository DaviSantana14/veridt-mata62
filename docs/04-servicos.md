# Serviços

## `apps/web`

Frontend Next.js. Deve consumir somente o API Gateway. A tela inicial mostra o status do gateway e os serviços configurados.

## `apps/api-gateway`

Entrada HTTP para o frontend. Rotas atuais:

- `GET /health`
- `GET /identity/health`
- `POST /identity/users`
- `POST /identity/auth/login`
- `POST /identity/auth/forgot-password`
- `POST /identity/auth/reset-password`
- `GET /identity/users/:id`
- `GET /billing/health`
- `GET /billing/packages`
- `POST /billing/purchases/mock`
- `POST /billing/purchases`
- `POST /billing/payments/mercado-pago/webhook`
- `GET /capture/health`
- `POST /capture/records/mock`
- `GET /capture/records/:recordId`
- `GET /capture/users/:userId/records`

## `apps/identity-service`

Responsável por usuários, perfis e recuperação de senha. Fornece nome e email do usuário responsável para a tela de detalhes dos registros realizados. Publica `identity.user_registered` após o cadastro e `identity.password_reset_requested` após solicitação válida de recuperação para disparar emails sem bloquear a resposta ao usuário.

## `apps/billing-service`

Responsável por pacotes, créditos e compras. A compra real em `POST /purchases` cria uma preferência Mercado Pago com `external_reference` apontando para a compra interna. A compra mock continua disponível em `POST /purchases/mock` para Pix demonstrativo e demos locais.

O saldo só é creditado quando o webhook Mercado Pago informa pagamento aprovado. O processamento é idempotente: webhooks duplicados não duplicam créditos nem eventos `billing.credit_purchased`.

## `apps/capture-service`

Responsável por registros de conteúdo, sessões de captura e assets capturados. Também lista os registros realizados por usuário para atender o REQ 12 e fornece os metadados, status e contagens usados no detalhe do registro do REQ 13.

## `apps/notification-service`

Responsável por notificações. Consome `identity.user_registered`, `identity.password_reset_requested` e `billing.credit_purchased`, envia emails por SMTP via Gmail/Nodemailer e persiste o status da tentativa (`PENDING`, `SENT` ou `FAILED`).

## `apps/report-service`

Responsável por relatórios e arquivos gerados. Hoje consome `capture.completed` e persiste um relatório mock.
