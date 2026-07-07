# RabbitMQ

RabbitMQ é usado para comunicação assíncrona entre serviços.

## Filas atuais

As filas ficam declaradas em `packages/contracts/src/index.ts`:

- `veridit.notifications`
- `veridit.reports`

## Eventos atuais

- `identity.user_registered`
- `identity.password_reset_requested`
- `billing.credit_purchased`
- `capture.completed`

## Fluxos implementados

Cadastro:

```text
api-gateway -> identity-service -> RabbitMQ -> notification-service
```

Recuperação de senha:

```text
api-gateway -> identity-service -> RabbitMQ -> notification-service
```

Compra de creditos paga:

```text
api-gateway -> billing-service -> Mercado Pago/webhook -> RabbitMQ -> notification-service
```

Captura concluida:

```text
api-gateway -> capture-service -> RabbitMQ -> notification-service
                                      -> report-service
```

O fluxo de compra tambem pode ser concluido pela rota de simulacao em desenvolvimento. O evento publicado e o mesmo: `billing.credit_purchased`.

Os dados exibidos ao usuario nao devem depender de eventos. Listagem, detalhe, relatorio e ZIP consultam dados sincronamente pelo API Gateway. RabbitMQ fica reservado para efeitos colaterais, como email e processamento assincrono.

## Como criar novo evento

1. Declare o nome do evento e o tipo do payload em `packages/contracts`.
2. Crie um publisher no serviço que produz o evento.
3. Crie um handler com `@EventPattern(...)` no serviço consumidor.
4. Não use evento para substituir consulta síncrona necessária ao usuário; use evento para efeitos colaterais e processamento assíncrono.
