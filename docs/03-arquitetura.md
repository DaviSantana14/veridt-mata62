# Arquitetura

Fluxo principal:

```text
Next.js frontend -> API Gateway -> microsserviços NestJS
                                  -> PostgreSQL por serviço
                                  -> RabbitMQ para eventos
```

## Regras

- O frontend nunca chama microsserviços diretamente.
- O frontend deve chamar apenas o API Gateway.
- O API Gateway fala com os serviços por HTTP.
- Eventos assíncronos passam pelo RabbitMQ, por exemplo, cadastro, compra e notificação.
- Cada serviço acessa somente o próprio banco.
- Nenhum serviço deve importar Prisma Client de outro serviço.
- Tipos e nomes de eventos compartilhados ficam em `packages/contracts`.

## Por que existe API Gateway

O Gateway centraliza a superfície HTTP do frontend. Isso evita que o browser conheça portas, URLs e detalhes internos dos microsserviços.

## Por que cada serviço tem banco próprio

Isso força o isolamento dos contextos. Um serviço pode guardar IDs externos, como `userId`, mas não deve fazer JOIN nem acessar tabelas de outro serviço.
