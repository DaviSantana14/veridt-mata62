# RabbitMQ

RabbitMQ é usado para comunicação assíncrona entre serviços.

## Filas atuais

As filas ficam declaradas em `packages/contracts/src/index.ts`:

- `veridit.notifications`
- `veridit.reports`

## Eventos atuais

- `identity.user_registered`
- `billing.credit_purchased`
- `capture.completed`

## Fluxos implementados

Cadastro:

```text
api-gateway -> identity-service -> RabbitMQ -> notification-service
```

Compra mock:

```text
api-gateway -> billing-service -> RabbitMQ -> notification-service
```

Captura mock:

```text
api-gateway -> capture-service -> RabbitMQ -> report-service
```

## Como criar novo evento

1. Declare o nome do evento e o tipo do payload em `packages/contracts`.
2. Crie um publisher no serviço que produz o evento.
3. Crie um handler com `@EventPattern(...)` no serviço consumidor.
4. Não use evento para substituir consulta síncrona necessária ao usuário; use evento para efeitos colaterais e processamento assíncrono.
