# Arquitetura

Fluxo principal:

```text
Next.js frontend -> API Gateway -> microsservicos NestJS
                                  -> PostgreSQL por servico
                                  -> RabbitMQ para eventos
```

## Regras

- O frontend nunca chama microsserviços diretamente.
- O frontend deve chamar apenas o API Gateway.
- O API Gateway fala com os servicos por HTTP.
- O preview de captura e a excecao: o frontend abre WebSocket no API Gateway, e o gateway faz proxy para o WebSocket interno do `capture-service`.
- Eventos assincronos passam pelo RabbitMQ, por exemplo, cadastro, recuperacao de senha, compra, captura e notificacao.
- Cada servico acessa somente o proprio banco.
- Nenhum servico deve importar Prisma Client de outro servico.
- Tipos e nomes de eventos compartilhados ficam em `packages/contracts`.

## Por que existe API Gateway

O Gateway centraliza a superfície HTTP do frontend. Isso evita que o browser conheça portas, URLs e detalhes internos dos microsserviços.

Para o preview ao vivo, ele tambem centraliza a superficie WebSocket:

```text
Next.js -> ws://api-gateway/capture/preview?recordId=...
        -> ws://capture-service/preview?recordId=...
        -> Playwright page.screencast
```

## Por que cada serviço tem banco próprio

Isso força o isolamento dos contextos. Um serviço pode guardar IDs externos, como `userId`, mas não deve fazer JOIN nem acessar tabelas de outro serviço.
