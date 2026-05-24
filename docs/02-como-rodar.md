# Como Rodar

## Requisitos locais

- Node.js 20 ou superior;
- npm;
- Docker;
- Docker Compose.

## Instalação

Na raiz do projeto:

```bash
npm install
```

## Infraestrutura

Suba PostgreSQL e RabbitMQ:

```bash
docker compose -f infra/docker-compose.yml up -d
```

O RabbitMQ Management fica em:

```text
http://localhost:15672
usuario: guest
senha: guest
```

## Prisma

Gere os clients:

```bash
npm run prisma:generate
```

Execute as migrations iniciais:

```bash
npm run prisma:migrate
```

## Desenvolvimento

```bash
npm run dev
```

Portas padrão:

- frontend: `http://localhost:3000`
- api-gateway: `http://localhost:3001`
- identity-service: `http://localhost:3101`
- billing-service: `http://localhost:3102`
- capture-service: `http://localhost:3103`
- notification-service: `http://localhost:3104`
- report-service: `http://localhost:3105`

## Verificações úteis

```bash
npm run lint
npm run build
```
