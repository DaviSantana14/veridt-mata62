# Notification Service

Microsservico NestJS responsavel por emails transacionais.

## Responsabilidades

- consumir eventos pelo RabbitMQ;
- enviar emails por SMTP via Nodemailer;
- registrar status da tentativa de notificacao;
- enviar emails de cadastro, recuperacao de senha, compra de creditos e conclusao de captura.

## Eventos consumidos

- `identity.user_registered`
- `identity.password_reset_requested`
- `billing.credit_purchased`
- `capture.completed`

## Variaveis importantes

- `DATABASE_URL`
- `RABBITMQ_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `FRONTEND_ORIGIN`

Veja tambem `docs/02-como-rodar.md` e `docs/06-rabbitmq.md`.
