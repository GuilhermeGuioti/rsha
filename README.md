# SRHA — Sistema de Relatório de Horas Atividades

Next.js (App Router) + TypeScript + Prisma + PostgreSQL. Ver `CLAUDE.md` para as
regras do projeto e `docs/` para a especificação completa.

## Ambiente local

```bash
docker compose up -d        # sobe o Postgres em container
docker exec srha-db psql -U srha -c "CREATE DATABASE srha_test;"   # banco dos testes, uma vez só
cp .env.example .env        # preencha DATABASE_URL, DIRECT_URL e AUTH_SECRET
cp .env.test.example .env.test   # as mesmas chaves, apontando para o banco srha_test
npx prisma migrate dev      # aplica as migrations no banco de desenvolvimento
npx tsx prisma/seed.ts      # popula os cadastros fixos de desenvolvimento
npm run dev
```

`AUTH_SECRET` pode ser gerado com `openssl rand -base64 32`. Em desenvolvimento,
`DATABASE_URL` e `DIRECT_URL` são iguais (ver regra 2 do `CLAUDE.md`).

## Testes

```bash
(set -a; . ./.env.test; set +a; npx prisma migrate deploy)   # migrations no srha_test
npm test
```

Usa o banco definido em `.env.test` — nunca o de desenvolvimento, porque cada suíte
faz `TRUNCATE` antes de cada teste. Rode o `migrate deploy` acima sempre que entrar
migration nova.

## Seed em produção

Rode com `NODE_ENV=production` e `SECRETARIA_INICIAL_EMAIL` (opcionalmente
`SECRETARIA_INICIAL_NOME`) com a conta institucional de quem vai administrar o
sistema. Sem a variável, o seed falha em vez de criar uma conta que não existe no
Entra ID.
