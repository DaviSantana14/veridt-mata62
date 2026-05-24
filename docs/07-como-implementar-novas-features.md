# Como Implementar Novas Features

## Passo recomendado

1. Identifique qual serviço é dono da regra.
2. Crie ou ajuste DTOs no serviço.
3. Se o contrato for compartilhado, atualize `packages/contracts`.
4. Se precisar persistir dados, altere somente o Prisma schema do serviço dono.
5. Adicione a rota HTTP no serviço.
6. Exponha a rota pelo API Gateway se ela for usada pelo frontend.
7. Use RabbitMQ apenas para efeitos assíncronos.
8. Rode lint, build, Prisma generate e migrations.

## Exemplo: cadastro com senha

Serviço dono: `identity-service`.

Alterações esperadas:

- adicionar `password` ao DTO de entrada;
- gerar hash da senha no service;
- preencher `passwordHash`;
- criar rota de login;
- retornar token JWT depois de configurar autenticação.

O `billing-service` não deve consultar a tabela de usuários. Ele deve receber `userId` pelo gateway ou por evento.

## Exemplo: compra real de créditos

Serviço dono: `billing-service`.

Alterações esperadas:

- criar uma interface para provedor de pagamento;
- trocar o adapter mock por Mercado Pago ou Pix;
- manter o evento `billing.credit_purchased` para notificação;
- persistir o status real da compra.

## Exemplo: captura real

Serviço dono: `capture-service`.

Alterações esperadas:

- criar uma interface para captura de tela/vídeo;
- implementar adapter real depois;
- persistir assets capturados;
- publicar `capture.completed` quando a captura terminar.

## Antes de abrir PR ou entregar parte do trabalho

```bash
npm run prisma:generate
npm run lint
npm run build
```
