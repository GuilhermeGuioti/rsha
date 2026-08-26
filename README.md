# SRHA — Sistema de Relatório de Horas Atividades

Next.js (App Router) + TypeScript + Prisma + PostgreSQL. Ver `CLAUDE.md` para as
regras do projeto e `docs/` para a especificação completa.

## Ambiente local

```bash
docker compose up -d        # sobe o Postgres em container
cp .env.example .env        # preencha DATABASE_URL e DIRECT_URL
npx prisma migrate dev      # aplica as migrations
npx tsx prisma/seed.ts      # popula os cadastros fixos de desenvolvimento
npm run dev
```

## Testes

```bash
npm test
```

Usa o banco definido em `.env.test` (idealmente um banco `_test` separado).
