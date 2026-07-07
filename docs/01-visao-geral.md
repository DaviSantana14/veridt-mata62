# Visao Geral

O Veridit e um sistema para registrar evidencias de conteudo na internet. O PDF de requisitos `docs/veridit-req.pdf` define os REQ 01 a REQ 15: cadastro, recuperacao de senha, login, logout, compra e pagamento de creditos, notificacoes por email, captura de conteudo, listagem, detalhes, relatorio e ZIP do registro.

## Arquitetura do produto

- Frontend em Next.js.
- API Gateway em NestJS como unica superficie consumida pelo frontend.
- Microsservicos NestJS por contexto.
- PostgreSQL com banco separado por servico.
- Prisma ORM por servico.
- RabbitMQ para eventos assincronos.
- Playwright para navegacao/captura de conteudo.
- Mercado Pago para pagamento real em sandbox/producao.
- SMTP/Nodemailer para emails transacionais.

## Estado dos requisitos

| Requisito | Estado | Implementacao principal |
| --- | --- | --- |
| REQ 01 - Cadastrar usuario | Implementado | `identity-service`, API Gateway e telas de cadastro |
| REQ 02 - Recuperar senha | Implementado | `identity-service`, evento `identity.password_reset_requested` e email |
| REQ 03 - Logar no sistema | Implementado | login via API Gateway e sessao no frontend |
| REQ 04 - Sair do sistema | Implementado | limpeza da sessao local e redirecionamento |
| REQ 05 - Comprar creditos | Implementado | pacotes e compras no `billing-service` |
| REQ 06 - Efetuar pagamento de creditos | Implementado | Mercado Pago Checkout/Card/Pix conforme fluxo de pagamento |
| REQ 07 - Confirmar pagamento por email | Implementado | evento `billing.credit_purchased` consumido pelo `notification-service` |
| REQ 08 - Iniciar registro de conteudo | Implementado | `capture-service` cria sessao Playwright e registro |
| REQ 09 - Concluir gravacao de conteudo | Implementado | start/stop de video e persistencia de asset |
| REQ 10 - Confirmar gravacao por email | Implementado via conclusao de captura | email de conclusao pelo evento `capture.completed` |
| REQ 11 - Concluir captura de tela | Implementado | screenshot e persistencia de asset |
| REQ 11 - Confirmar captura de tela por email | Implementado via conclusao de captura | email de conclusao pelo evento `capture.completed` |
| REQ 12 - Listar registros realizados | Implementado | dashboard/lista por usuario |
| REQ 13 - Visualizar detalhes do registro | Implementado | pagina `/registros/:id` com dados reais do registro e usuario responsavel |
| REQ 14 - Gerar relatorio do registro | Implementado | pagina de relatorio e PDF com dados reais |
| REQ 15 - Gerar arquivo ZIP do registro | Implementado | rota server-side que baixa assets reais e monta ZIP |

## Fluxos principais

- Autenticacao: frontend -> API Gateway -> `identity-service`.
- Creditos e pagamento: frontend -> API Gateway -> `billing-service` -> Mercado Pago -> webhook -> RabbitMQ -> `notification-service`.
- Captura: frontend -> API Gateway -> `capture-service` -> Playwright -> storage local de assets -> RabbitMQ ao concluir.
- Preview ao vivo: frontend -> WebSocket no API Gateway -> WebSocket interno no `capture-service` -> `page.screencast`.
- Relatorio e ZIP: frontend/server routes -> API Gateway -> `capture-service` e `identity-service`, sem dados mockados.

## Observacoes

As rotas mock ainda existem para demos locais e testes legados, mas os fluxos principais de requisitos usam dados reais. O frontend deve continuar chamando apenas o API Gateway; portas internas dos microsservicos nao devem aparecer em chamadas de browser.
