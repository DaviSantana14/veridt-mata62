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
- `GET /billing/health`
- `GET /billing/packages`
- `POST /billing/purchases/mock`
- `GET /capture/health`
- `POST /capture/records/mock`

## `apps/identity-service`

Responsável por usuários, perfis e recuperação de senha. Publica `identity.user_registered` após o cadastro e `identity.password_reset_requested` após solicitação válida de recuperação para disparar emails sem bloquear a resposta ao usuário.

## `apps/billing-service`

Responsável por pacotes, créditos e compras. Hoje cria uma compra mock, atualiza saldo local e publica `billing.credit_purchased`.

## `apps/capture-service`

Responsável por registros de conteúdo e assets capturados. Hoje cria uma captura mock e publica `capture.completed`.

## `apps/notification-service`

Responsável por notificações. Consome `identity.user_registered`, `identity.password_reset_requested` e `billing.credit_purchased`, envia emails por SMTP via Gmail/Nodemailer e persiste o status da tentativa (`PENDING`, `SENT` ou `FAILED`).

## `apps/report-service`

Responsável por relatórios e arquivos gerados. Hoje consome `capture.completed` e persiste um relatório mock.
