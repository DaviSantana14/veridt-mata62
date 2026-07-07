# Capture Service

Microsservico NestJS responsavel por registros de conteudo, sessoes Playwright, screenshots, videos, assets e preview ao vivo.

## Responsabilidades

- criar registros reais de captura;
- controlar navegacao e entrada de texto durante a captura;
- gerar screenshots;
- iniciar e parar gravacao de video;
- expor assets reais para detalhe, relatorio e ZIP;
- publicar `capture.completed` quando o registro e concluido;
- fornecer WebSocket interno `/preview?recordId=<id>` para o API Gateway.

## Variaveis importantes

- `DATABASE_URL`
- `RABBITMQ_URL`
- `CAPTURE_BROWSER_HEADLESS`
- `CAPTURE_VIEWPORT_WIDTH`
- `CAPTURE_VIEWPORT_HEIGHT`
- `CAPTURE_FRAME_QUALITY`
- `CAPTURE_PREVIEW_FPS`
- `CAPTURE_PREVIEW_QUALITY`
- `CAPTURE_PREVIEW_MAX_WIDTH`
- `CAPTURE_PREVIEW_MAX_HEIGHT`
- `CAPTURE_PREVIEW_METADATA_INTERVAL_MS`

Veja tambem `docs/02-como-rodar.md` para ajustes de qualidade do preview.
