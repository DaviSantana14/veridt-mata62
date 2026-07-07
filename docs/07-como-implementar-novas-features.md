# Como Implementar Novas Features

## Passo recomendado

1. Identifique qual servico e dono da regra.
2. Crie ou ajuste DTOs no servico.
3. Se o contrato for compartilhado, atualize `packages/contracts`.
4. Se precisar persistir dados, altere somente o Prisma schema do servico dono.
5. Adicione a rota HTTP ou WebSocket no servico dono.
6. Exponha a rota pelo API Gateway se ela for usada pelo frontend.
7. Atualize o helper do frontend que chama o gateway.
8. Use RabbitMQ apenas para efeitos assincronos.
9. Atualize `.env.example` quando adicionar variavel de ambiente.
10. Atualize os docs afetados.
11. Rode as verificacoes relevantes.

## Ao alterar fluxo usado pelo frontend

O frontend deve chamar apenas o API Gateway.

Ordem pratica:

1. Ajuste o servico dono.
2. Ajuste ou crie testes no servico dono.
3. Exponha a rota no API Gateway.
4. Ajuste tipos/contratos compartilhados, se existirem.
5. Ajuste `apps/web/src/lib/gateway.ts` ou o helper equivalente.
6. Ajuste a tela ou server route do Next.js.
7. Rode o teste de arquitetura do frontend para garantir que nenhuma chamada direta a microsservico apareceu.

## Ao alterar captura

Servico dono: `capture-service`.

Cuidados:

- preserve a fonte de verdade no banco e nos assets reais do registro;
- mantenha o browser falando somente com o API Gateway;
- se alterar preview, atualize `CAPTURE_PREVIEW_*` em `.env.example` e em `docs/02-como-rodar.md`;
- se alterar formato de assets, confira detalhes, relatorio e ZIP;
- se alterar conclusao da captura, confira o evento `capture.completed` e o email de notificacao.

## Ao alterar pagamento

Servico dono: `billing-service`.

Cuidados:

- mantenha idempotencia no webhook;
- nao credite saldo antes de pagamento aprovado;
- mantenha `external_reference` apontando para a compra interna;
- publique `billing.credit_purchased` somente quando o saldo for efetivamente creditado;
- rotas mock podem existir para demo local, mas nao devem virar fonte de verdade do fluxo principal.

## Ao alterar relatorio ou ZIP

Os REQ 14 e REQ 15 devem usar dados reais do registro.

Checklist:

- buscar registro pelo API Gateway;
- buscar usuario responsavel por `userId`;
- usar assets reais do `capture-service`;
- tratar registro sem assets de forma clara;
- evitar dados mockados em PDF, ZIP ou tela.

## Ao alterar eventos

1. Declare o nome do evento e o tipo do payload em `packages/contracts`.
2. Crie ou ajuste o publisher no servico produtor.
3. Crie ou ajuste o handler com `@EventPattern(...)` no consumidor.
4. Garanta que o evento represente um fato ja persistido.
5. Nao use evento para substituir consulta sincrona necessaria para resposta ao usuario.

## Antes de abrir PR ou entregar parte do trabalho

```bash
npm run prisma:generate
npm run lint
npm run build
```
