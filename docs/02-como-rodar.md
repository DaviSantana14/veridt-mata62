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

## Variáveis de ambiente

Copie os exemplos de ambiente antes de rodar Prisma ou iniciar os apps:

```powershell
Copy-Item apps/api-gateway/.env.example apps/api-gateway/.env
Copy-Item apps/identity-service/.env.example apps/identity-service/.env
Copy-Item apps/billing-service/.env.example apps/billing-service/.env
Copy-Item apps/capture-service/.env.example apps/capture-service/.env
Copy-Item apps/notification-service/.env.example apps/notification-service/.env
Copy-Item apps/report-service/.env.example apps/report-service/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Esses arquivos `.env` ficam fora do Git. Ajuste os valores quando trocar portas, bancos ou integrações externas.

## Email local com Gmail

O `notification-service` envia emails por SMTP usando Gmail. Para testar localmente:

1. Ative a verificação em duas etapas na conta Google.
2. Gere uma senha de app no Google.
3. Preencha no `apps/notification-service/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua_senha_de_app_do_google
EMAIL_FROM="Veridit <seuemail@gmail.com>"
```

Use senha de app, não a senha normal da conta Google. Essa configuração é indicada para localhost e demo pequena, não para produção.

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
