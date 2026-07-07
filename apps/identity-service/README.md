# Identity Service

Microsservico NestJS responsavel por usuarios, perfil, login e recuperacao de senha.

## Responsabilidades

- cadastrar usuarios;
- autenticar login;
- expor dados do usuario responsavel por um registro;
- atualizar perfil e senha;
- gerar fluxo de recuperacao de senha;
- publicar eventos para emails transacionais.

## Eventos publicados

- `identity.user_registered`
- `identity.password_reset_requested`

## Variaveis importantes

- `DATABASE_URL`
- `RABBITMQ_URL`
- `JWT_SECRET`

Veja tambem `docs/04-servicos.md` e `docs/06-rabbitmq.md`.
