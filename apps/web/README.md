# Web

Frontend Next.js do Veridit.

## Responsabilidades

- telas de autenticacao, cadastro, perfil e recuperacao de senha;
- compra de creditos;
- captura de conteudo com preview ao vivo;
- dashboard de registros;
- detalhe do registro com usuario responsavel;
- relatorio em PDF;
- download de ZIP com assets reais.

## Regra de integracao

O frontend deve chamar apenas o API Gateway. Nao use URLs de microsservicos internos no browser.

Variaveis principais:

- `API_GATEWAY_URL`
- `NEXT_PUBLIC_API_GATEWAY_URL`
- `NEXT_PUBLIC_API_GATEWAY_WS_URL`

Se `NEXT_PUBLIC_API_GATEWAY_WS_URL` nao estiver definida, o frontend deriva a URL WebSocket a partir de `NEXT_PUBLIC_API_GATEWAY_URL`.

Veja tambem `docs/02-como-rodar.md`, `docs/03-arquitetura.md` e `docs/04-servicos.md`.
