# Banco e Prisma

Existe um único container PostgreSQL local, mas cada serviço usa seu próprio banco:

- `veridit_identity`
- `veridit_billing`
- `veridit_capture`
- `veridit_notification`
- `veridit_report`

## Regra de isolamento

Cada serviço só pode acessar o próprio banco. Se `billing-service` precisa associar uma compra a um usuário, ele grava apenas o `userId`. Ele não acessa a tabela `User` do `identity-service`.

## Onde ficam os schemas

Cada serviço com banco tem:

```text
apps/<servico>/prisma/schema.prisma
apps/<servico>/prisma.config.ts
apps/<servico>/src/prisma/prisma.module.ts
apps/<servico>/src/prisma/prisma.service.ts
```

## Comandos

Gerar todos os clients:

```bash
npm run prisma:generate
```

Migrar todos os bancos:

```bash
npm run prisma:migrate
```

Rodar em um serviço específico:

```bash
npm --workspace @veridit/identity-service run prisma:generate
npm --workspace @veridit/identity-service run prisma:migrate
```

## Como adicionar model

1. Edite o `schema.prisma` do serviço dono do dado.
2. Rode `npm --workspace @veridit/<servico> run prisma:migrate`.
3. Rode `npm --workspace @veridit/<servico> run prisma:generate`.
4. Use o Prisma Client gerado apenas dentro desse serviço.
