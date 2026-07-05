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
FRONTEND_ORIGIN=http://localhost:3000
```

Use senha de app, não a senha normal da conta Google. Essa configuração é indicada para localhost e demo pequena, não para produção.
O `FRONTEND_ORIGIN` é usado nos botões dos emails transacionais.

## Mercado Pago sandbox

O frontend e o API Gateway devem abrir localmente durante o desenvolvimento:

```env
# apps/api-gateway/.env
FRONTEND_ORIGIN=http://localhost:3000

# apps/web/.env.local
API_GATEWAY_URL=http://localhost:3001
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001
```

Configure o billing-service para criar preferências reais no sandbox:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_WEBHOOK_URL=https://<tunnel>/billing/payments/mercado-pago/webhook
FRONTEND_SUCCESS_URL=http://localhost:3000/pagamento/retorno?status=success
FRONTEND_FAILURE_URL=http://localhost:3000/pagamento/retorno?status=failure
FRONTEND_PENDING_URL=http://localhost:3000/pagamento/retorno?status=pending
```

Nunca commite tokens `TEST`, segredos de webhook ou URLs temporárias de tunnel.

O Mercado Pago precisa alcançar `MERCADO_PAGO_WEBHOOK_URL` por HTTPS. Para testar em localhost, use Cloudflare Tunnel, ngrok ou equivalente. A recomendação desta implementação é expor o gateway:

```bash
cloudflared tunnel --url http://localhost:3001
```

Depois configure o webhook no Mercado Pago com:

```text
https://<tunnel>/billing/payments/mercado-pago/webhook
```

Se optar por chamar o billing diretamente, aponte o tunnel para `http://localhost:3102` e use `/payments/mercado-pago/webhook`, mas o fluxo padrão do frontend continua passando pelo API Gateway.

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
