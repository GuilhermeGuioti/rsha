# SRHA — Sistema de Relatório de Horas Atividades
## Especificação para desenvolvimento

> Este documento é a instrução de trabalho para construir o sistema. Ele resume o documento de requisitos formal e traduz os requisitos em decisões técnicas já tomadas. Onde houver conflito entre este arquivo e a sua intuição, siga este arquivo — as decisões aqui têm justificativa registrada.

---

## 1. Contexto em um parágrafo

Docentes de um centro universitário precisam declarar, a cada semestre, as horas dedicadas a atividades que não são aulas (orientação de TCC, supervisão de estágio, participação em NBE). Hoje isso é feito em papel: o docente imprime, preenche, assina, entrega ao coordenador, que assina ou devolve, e alguém digitaliza para guardar numa pasta em nuvem. O sistema substitui esse trâmite por um fluxo digital com trilha de auditoria. A base é de **302 docentes, 17 coordenadores e 25 cursos**, e o uso se concentra nos dias que antecedem o prazo de entrega.

**O que dá certo aqui:** o docente abre o sistema duas vezes por ano, tendo esquecido tudo, e consegue entregar o relatório sem ajuda de ninguém.

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Aplicação | Next.js (App Router) + TypeScript, com **Server Actions** |
| Banco | PostgreSQL gerenciado (Neon ou Supabase) |
| Acesso a dados | Prisma |
| Autenticação | Auth.js v5, provider Microsoft Entra ID |
| Interface | Tailwind + shadcn/ui |
| PDF | `@react-pdf/renderer` |
| Planilha | CSV gerado no servidor |
| Hospedagem | Vercel |

### Regras não negociáveis da stack

- **Sem API REST separada.** Formulários postam direto em Server Actions. Não crie `/api/*` exceto o handler do Auth.js.
- **Use a connection string com pooler**, nunca a conexão direta. Sem isso o sistema cai no pico de fechamento de semestre — que é exatamente o cenário que o sistema existe para resolver.
- **Não use Puppeteer/Chromium para PDF.** Não cabe bem em função serverless.
- **Toda Server Action que altera dados chama `revalidatePath()`.** Sem isso o coordenador aprova e a tela continua mostrando "Aguardando Avaliação".
- **Sem `localStorage` para estado de negócio.** A verdade está no banco.

---

## 3. Autenticação e autorização

São duas coisas separadas, e confundi-las é o erro mais provável neste projeto.

**A Microsoft responde apenas "quem é".** Ela devolve nome, e-mail institucional e `oid` (identificador da pessoa no diretório). Ela não sabe nada sobre cursos, perfis ou vínculos.

**O banco responde "o que pode fazer".** Perfis, cursos, vínculos e quem avalia quem são cadastro interno, mantido pela secretaria acadêmica.

### Fluxo obrigatório no login

1. Auth.js conduz o OIDC e devolve o profile.
2. Busca o usuário: **por `entraOid` primeiro; se não achar, por e-mail**.
3. Se achou por e-mail e o `entraOid` está vazio, **grave o `oid` agora**. Daí em diante a busca é por `oid`, porque e-mail muda (casamento, correção de grafia) e quando muda a pessoa perderia o vínculo com todo o histórico dela.
4. **Se não achou de jeito nenhum, negue o acesso.** Nunca crie usuário automaticamente — qualquer aluno com conta `@dominio.edu.br` passa pela Microsoft, e é essa checagem que o barra.
5. Carregue perfis e vínculos e coloque no token da sessão.

### Login falso para desenvolvimento

O registro da aplicação no Entra ID depende da equipe de TI da instituição e pode demorar. **Não deixe o projeto parado.**

Adicione um provider `Credentials` habilitado apenas quando `NODE_ENV === "development"`, com usuários fixos de teste: um docente vinculado a dois cursos, um coordenador de um curso, um coordenador que também dá aula no próprio curso (para testar o RF22) e uma pessoa da secretaria acadêmica. Um `if` na configuração decide qual provider sobe.

### Autorização

Verificação **sempre no servidor**, no início de cada Server Action e de cada page. Esconder botão na interface não é controle de acesso.

Crie helpers em `lib/auth/guards.ts`:

```ts
exigirSessao()
exigirPerfil(perfil)
exigirAcessoAoRelatorio(relatorioId, acao)  // valida vínculo, não só perfil
```

---

## 4. Modelo de dados

Chaves primárias **sequenciais** (`autoincrement`), decisão expressa do cliente para favorecer conferência e rastreabilidade. Use `Int`, não `BigInt` — evita dor de serialização em Server Actions e é folgado para a escala.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Perfil { DOCENTE COORDENADOR SECRETARIA }
enum SituacaoRelatorio { RASCUNHO AGUARDANDO_AVALIACAO DEVOLVIDO_PARA_AJUSTE APROVADO }
enum TipoEvento { CRIACAO SUBMISSAO APROVACAO DEVOLUCAO }
enum DiaSemana { SEGUNDA TERCA QUARTA QUINTA SEXTA SABADO }

model Usuario {
  id        Int      @id @default(autoincrement())
  nome      String
  email     String   @unique
  entraOid  String?  @unique
  ativo     Boolean  @default(true)
  criadoEm  DateTime @default(now())

  perfis                UsuarioPerfil[]
  vinculosDocente       VinculoDocenteCurso[]
  vinculosCoordenador   VinculoCoordenadorCurso[]
  relatorios            Relatorio[]
  eventos               EventoAuditoria[]
  cursosComoAlternativo Curso[] @relation("AvaliadorAlternativo")
}

model UsuarioPerfil {
  id        Int     @id @default(autoincrement())
  usuarioId Int
  perfil    Perfil
  usuario   Usuario @relation(fields: [usuarioId], references: [id])

  @@unique([usuarioId, perfil])
}

model Curso {
  id                     Int     @id @default(autoincrement())
  nome                   String  @unique
  ativo                  Boolean @default(true)
  avaliadorAlternativoId Int?

  avaliadorAlternativo Usuario? @relation("AvaliadorAlternativo", fields: [avaliadorAlternativoId], references: [id])
  docentes             VinculoDocenteCurso[]
  coordenadores        VinculoCoordenadorCurso[]
  relatorios           Relatorio[]
}

model PeriodoLetivo {
  id                    Int      @id @default(autoincrement())
  ano                   Int
  semestre              Int
  aberturaSubmissao     DateTime
  encerramentoSubmissao DateTime

  relatorios Relatorio[]
  vinculos   VinculoDocenteCurso[]

  @@unique([ano, semestre])
}

model VinculoDocenteCurso {
  id              Int @id @default(autoincrement())
  docenteId       Int
  cursoId         Int
  periodoLetivoId Int

  docente Usuario       @relation(fields: [docenteId], references: [id])
  curso   Curso         @relation(fields: [cursoId], references: [id])
  periodo PeriodoLetivo @relation(fields: [periodoLetivoId], references: [id])

  @@unique([docenteId, cursoId, periodoLetivoId])
}

model VinculoCoordenadorCurso {
  id            Int @id @default(autoincrement())
  coordenadorId Int
  cursoId       Int

  coordenador Usuario @relation(fields: [coordenadorId], references: [id])
  curso       Curso   @relation(fields: [cursoId], references: [id])

  @@unique([coordenadorId, cursoId])
}

model TipoAtividade {
  id        Int     @id @default(autoincrement())
  descricao String  @unique
  ativo     Boolean @default(true)

  itens ItemAtividade[]
}

model Relatorio {
  id                Int               @id @default(autoincrement())
  docenteId         Int
  cursoId           Int
  periodoLetivoId   Int
  situacao          SituacaoRelatorio @default(RASCUNHO)
  cargaHorariaTotal Decimal           @default(0) @db.Decimal(6, 2)
  criadoEm          DateTime          @default(now())
  atualizadoEm      DateTime          @updatedAt

  docente Usuario       @relation(fields: [docenteId], references: [id])
  curso   Curso         @relation(fields: [cursoId], references: [id])
  periodo PeriodoLetivo @relation(fields: [periodoLetivoId], references: [id])
  itens   ItemAtividade[]
  eventos EventoAuditoria[]

  @@unique([docenteId, cursoId, periodoLetivoId])
  @@index([situacao, cursoId])
}

model ItemAtividade {
  id              Int       @id @default(autoincrement())
  relatorioId     Int
  tipoAtividadeId Int
  horas           Decimal   @db.Decimal(5, 2)
  diaSemana       DiaSemana
  horario         String
  descricao       String

  relatorio     Relatorio     @relation(fields: [relatorioId], references: [id], onDelete: Cascade)
  tipoAtividade TipoAtividade @relation(fields: [tipoAtividadeId], references: [id])
}

model EventoAuditoria {
  id            Int        @id @default(autoincrement())
  relatorioId   Int
  tipo          TipoEvento
  usuarioId     Int
  ocorridoEm    DateTime   @default(now())
  justificativa String?

  relatorio Relatorio @relation(fields: [relatorioId], references: [id])
  usuario   Usuario   @relation(fields: [usuarioId], references: [id])

  @@index([relatorioId, ocorridoEm])
}
```

### Invariantes que o código precisa garantir

- **Um relatório por docente, curso e período.** Já garantido pelo `@@unique`.
- **`cargaHorariaTotal` sempre igual à soma dos itens.** Recalcule dentro da mesma transação que altera itens; nunca deixe o cliente enviar o total.
- **Relatório aprovado e evento de auditoria não sofrem update nem delete.** Não exponha operação capaz disso em lugar nenhum.
- **Inativar, nunca excluir** curso, usuário ou tipo de atividade que já tenha registro vinculado.

---

## 5. Máquina de estados

```
RASCUNHO ──submeter──> AGUARDANDO_AVALIACAO ──aprovar──> APROVADO (terminal)
                              │      ▲
                       devolver│      │submeter
                              ▼      │
                     DEVOLVIDO_PARA_AJUSTE
```

Implemente em `lib/services/workflow.ts`, **fora dos componentes**. Os componentes apenas chamam. Isso permite testar a máquina de estados sem subir tela, e é o que sustenta a exigência de manter a lógica desacoplada da apresentação.

```ts
submeter(relatorioId, usuarioId)
aprovar(relatorioId, usuarioId)
devolver(relatorioId, usuarioId, justificativa)
```

Cada função, dentro de **uma transação**:
1. valida que a transição é permitida a partir da situação atual;
2. valida que o usuário tem direito de praticá-la;
3. altera a situação;
4. grava o `EventoAuditoria`.

Nunca altere `situacao` fora dessas funções.

### Regras do workflow

- **Roteamento automático.** Ao submeter, o avaliador é o coordenador vinculado ao curso do relatório. O docente não escolhe destinatário.
- **Autoaprovação proibida.** Se o autor for o próprio coordenador do curso, o relatório vai para o `avaliadorAlternativo` cadastrado no curso. Se não houver alternativo cadastrado, bloqueie a submissão com mensagem clara em vez de deixar o relatório órfão.
- **Devolução exige justificativa** não vazia.
- **Sem limite de devoluções.** Cada ciclo gera seu próprio evento.
- **Submissão fora do prazo do período letivo é bloqueada**, mas consulta a períodos encerrados continua livre.

---

## 6. Telas

| Rota | Perfil | Conteúdo |
|---|---|---|
| `/login` | público | Botão único de entrada institucional |
| `/` | docente | Cursos do período aberto e situação do relatório de cada um |
| `/relatorios/[id]` | docente | Formulário com itens de atividade, total e ações |
| `/avaliacao` | coordenador | Fila de relatórios aguardando, agrupada por curso |
| `/avaliacao/[id]` | coordenador | Relatório em leitura + aprovar / devolver + histórico |
| `/acompanhamento` | coord./secretaria | Situação de entrega por curso no período corrente |
| `/arquivo` | todos | Navegação Ano › Semestre › Curso (filtro, não pasta) |
| `/admin/cursos` | secretaria | CRUD de cursos e avaliador alternativo |
| `/admin/usuarios` | secretaria | CRUD de usuários, perfis e vínculos + importação CSV |
| `/admin/periodos` | secretaria | Períodos letivos e prazos |
| `/admin/auditoria/[id]` | secretaria | Trilha completa de um relatório |

---

## 7. Duas simplificações deliberadas

**Não crie pastas no disco.** O arquivamento hierárquico Ano › Semestre › Curso é uma **consulta com filtros**. A tela navega como se fossem pastas, mas por baixo é `WHERE ano = ? AND semestre = ? AND cursoId = ?`. Isso elimina storage, sincronização e arquivo órfão.

**Não armazene PDF.** Gere sob demanda a partir dos dados. O relatório aprovado é imutável porque o banco impede o update, não porque existe um arquivo congelado.

---

## 8. Ordem de construção

1. Projeto, Prisma, migração inicial, seed com dados de teste
2. Cadastros da secretaria — comece por **importação CSV**, que é mais rápida que telas de CRUD completas
3. Auth.js com o provider falso de desenvolvimento
4. Formulário do relatório: itens, total, rascunho
5. Submissão e roteamento
6. Fila do coordenador: aprovar e devolver
7. Auditoria e exibição do histórico
8. Arquivo com filtros
9. PDF
10. Painel de acompanhamento
11. Extração CSV
12. Auth.js com Entra ID real
13. Notificações por e-mail

Do item 1 ao 7 você tem o fluxo principal fechado de ponta a ponta. O que vier depois é melhoria, não buraco.

---

## 9. Convenções

- Estrutura: `app/` (rotas), `lib/services/` (regras de negócio), `lib/auth/` (sessão e guards), `lib/db.ts` (cliente Prisma singleton), `components/`
- Nomes de domínio em **português** (`Relatorio`, `submeter`, `cargaHorariaTotal`); termos de framework em inglês
- Validação de entrada com **Zod** em toda Server Action, antes de tocar no banco
- Migrações versionadas com `prisma migrate`, nunca `db push` em produção
- Credenciais só em variáveis de ambiente, nunca no código
- Datas em UTC no banco, convertidas na exibição

---

## 10. Testes que valem a pena

Priorize estes, que cobrem onde os erros doem:

- Docente vinculado a dois cursos gera dois relatórios independentes, roteados a coordenadores diferentes
- Coordenador não consegue aprovar relatório do qual é autor
- Coordenador não enxerga relatório de curso que não é dele
- Submissão fora do prazo é bloqueada
- Devolução sem justificativa é bloqueada
- Após submeter → devolver → submeter → aprovar, a auditoria tem quatro eventos em ordem cronológica
- `cargaHorariaTotal` bate com a soma dos itens após adicionar e remover item
- Relatório aprovado não aceita alteração por nenhum caminho
