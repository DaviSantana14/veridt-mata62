# Report Service

Microsservico auxiliar para eventos de relatorio.

## Estado atual

O fluxo principal dos REQ 14 e REQ 15 nao depende deste servico. Relatorio e ZIP sao montados a partir dos dados reais expostos pelo API Gateway, consultando `capture-service` e `identity-service`.

Este servico ainda pode consumir `capture.completed` para processamento assincrono legado. Se voltar a fazer parte do fluxo principal, deve usar os mesmos dados reais do registro e nao gerar saida mockada.

## Variaveis importantes

- `DATABASE_URL`
- `RABBITMQ_URL`

Veja tambem `docs/04-servicos.md` e `docs/06-rabbitmq.md`.
