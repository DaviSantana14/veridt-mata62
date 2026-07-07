# API Gateway

Gateway NestJS consumido pelo frontend. Centraliza a superficie HTTP e WebSocket do produto para evitar que o browser conheca portas internas dos microsservicos.

## Responsabilidades

- expor health checks;
- encaminhar rotas de identidade, billing e captura;
- receber webhook Mercado Pago pelo caminho publico do produto;
- fazer proxy do WebSocket `/capture/preview` para o `capture-service`;
- manter o frontend desacoplado dos servicos internos.

## Variaveis importantes

- `IDENTITY_SERVICE_URL`
- `BILLING_SERVICE_URL`
- `CAPTURE_SERVICE_URL`
- `CAPTURE_SERVICE_WS_URL`
- `FRONTEND_ORIGIN`

Veja tambem `docs/02-como-rodar.md` e `docs/04-servicos.md`.
