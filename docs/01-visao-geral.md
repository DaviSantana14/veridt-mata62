# Visão Geral

O Veridit é um sistema para registrar evidências de conteúdo na internet. O PDF de requisitos lista cadastro e login de usuários, recuperação de senha, compra de créditos, pagamento, confirmação por email, captura de conteúdo, listagem de registros, detalhes, relatório e arquivo ZIP.

Este repositório não implementa o produto completo. Ele entrega uma fundação para o grupo trabalhar em paralelo:

- frontend em Next.js;
- API Gateway em NestJS;
- microsserviços NestJS por contexto;
- PostgreSQL com um banco separado por serviço;
- Prisma ORM por serviço;
- RabbitMQ para eventos assíncronos;
- adapters mock para integrações externas futuras.

## O que já funciona

- O frontend consulta somente o API Gateway.
- O API Gateway roteia chamadas HTTP para serviços internos.
- Os serviços têm health check.
- Os serviços com banco têm Prisma configurado.
- `billing-service` publica um evento de compra mock, necessário fazer uma implementação real.
- `notification-service` consome esse evento, envia email de confirmação por SMTP via Gmail/Nodemailer e persiste o status da tentativa.
- `capture-service` publica um evento de captura mock, necessário fazer uma implementação real.
- `report-service` consome esse evento e persiste um relatório mock, necessário fazer uma implementação real.

## O que ainda será implementado

- autenticação JWT completa;
- recuperação real de senha;
- integração com Mercado Pago;
- geração real de Pix;
- envio real de email com provedor de produção;
- captura real de tela ou vídeo;
- geração real de relatório e ZIP;
- telas completas do produto.
