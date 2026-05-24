# Veridit

Boilerplate colaborativo para o trabalho academico Veridit.

Este repositorio usa Turborepo com npm workspaces, Next.js no frontend, NestJS no API Gateway e nos microsservicos, Prisma ORM com PostgreSQL e RabbitMQ para eventos assíncronos.

## Primeiros passos

```bash
npm install
docker compose -f infra/docker-compose.yml up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Scripts principais

- `npm run dev`: compila o pacote de contratos e inicia os apps em modo desenvolvimento.
- `npm run build`: compila todos os workspaces.
- `npm run lint`: roda lint nos workspaces.
- `npm run prisma:generate`: gera os Prisma Clients dos serviços.
- `npm run prisma:migrate`: executa as migrations iniciais dos serviços com banco.

## Documentação

Leia os arquivos em [`docs`](docs) antes de implementar novas funcionalidades:

- [`01-visao-geral.md`](docs/01-visao-geral.md)
- [`02-como-rodar.md`](docs/02-como-rodar.md)
- [`03-arquitetura.md`](docs/03-arquitetura.md)
- [`04-servicos.md`](docs/04-servicos.md)
- [`05-banco-e-prisma.md`](docs/05-banco-e-prisma.md)
- [`06-rabbitmq.md`](docs/06-rabbitmq.md)
- [`07-como-implementar-novas-features.md`](docs/07-como-implementar-novas-features.md)
