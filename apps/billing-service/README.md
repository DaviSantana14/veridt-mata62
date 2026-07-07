# Billing Service

Microsservico NestJS responsavel por pacotes, compras, creditos e integracao Mercado Pago.

## Responsabilidades

- listar pacotes de creditos;
- criar compras;
- criar preferencia ou pagamento Mercado Pago;
- processar webhook Mercado Pago;
- creditar saldo somente apos pagamento aprovado;
- garantir idempotencia no processamento de pagamentos;
- publicar `billing.credit_purchased` quando creditos forem efetivamente adicionados.

## Rotas de desenvolvimento

As rotas mock e de simulacao existem para demo local e testes legados. O fluxo principal de requisitos deve usar compra real e confirmacao de pagamento.

## Variaveis importantes

- `DATABASE_URL`
- `RABBITMQ_URL`
- `MERCADO_PAGO_ENVIRONMENT`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_WEBHOOK_URL`
- `FRONTEND_SUCCESS_URL`
- `FRONTEND_FAILURE_URL`
- `FRONTEND_PENDING_URL`

Veja tambem `docs/02-como-rodar.md`.
