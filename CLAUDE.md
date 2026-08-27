# SRHA — instruções do projeto

Sistema de Relatório de Horas Atividades. Substitui um formulário de papel: o docente
declara semestralmente as horas de atividades que não são aula, o coordenador aprova ou
devolve, e tudo fica registrado numa trilha de auditoria imutável.

Base: 302 docentes, 17 coordenadores, 25 cursos. O uso se concentra nos dias que
antecedem o prazo — o pico é o cenário que o sistema existe para resolver.

**Especificação completa em `docs/`. Onde este arquivo e `docs/` divergirem, pergunte;
não decida sozinho.**

---

## Regra zero

Não invente decisão de arquitetura. Se algo necessário não estiver definido aqui nem em
`docs/`, **pare e pergunte** em vez de escolher e seguir. Decisão errada tomada em
silêncio custa mais que uma pergunta.

---

## Stack

| Camada | Escolha |
|---|---|
| Aplicação | Next.js (App Router) + TypeScript, com Server Actions |
| Banco | PostgreSQL — **container Docker local no desenvolvimento**; provedor gerenciado a definir para produção |
| Acesso a dados | Prisma |
| Autenticação | Auth.js v5 (beta, versão exata fixada), provider Microsoft Entra ID |
| Interface | Tailwind + shadcn/ui |
| PDF | `@react-pdf/renderer` |
| CSV | `papaparse` (`parse` na importação, `unparse` na extração) |
| Testes | **Jest**, configurado via `next/jest` |
| Pacotes | **npm** |
| E-mail (RF13) | Microsoft Graph, mesmo tenant do Entra ID — passo 13 |
| Hospedagem | Vercel |

**Versões são as que estão no `package.json`, e elas são fixas — sem `^`, sem `~`.**
Não atualize, não instale major diferente, não misture padrão de versão antiga com o que
está instalado. Em dúvida sobre a API de uma biblioteca, leia o que está em
`node_modules` ou pergunte. Instalar dependência nova exige aprovação.

### Regras não negociáveis

1. **Sem API REST separada.** Formulário posta direto em Server Action.
   Não crie `/api/*`. Três exceções, e só três:
   - `app/api/auth/[...nextauth]/route.ts` — a Microsoft redireciona para URL fixa
   - `GET` de download de PDF (RF15)
   - `GET` de download de CSV (RF21)

   As duas últimas existem porque Server Action não devolve arquivo com
   `Content-Disposition`. Não contorne isso com base64 no cliente.

2. **Duas connection strings desde o primeiro dia**, mesmo que hoje apontem para o
   mesmo lugar:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // runtime — em produção, com pooler
     directUrl = env("DIRECT_URL")     // usada pelo migrate — sempre direta
   }
   ```
   Em desenvolvimento as duas apontam para o container local e são idênticas. A separação
   existe agora porque **em produção o runtime precisa passar por pooler** — sem isso o
   sistema cai no pico do fechamento de semestre, que é exatamente o RNF01 — e o
   `prisma migrate` **não funciona através de pooler em modo transaction**, porque precisa
   de DDL e advisory lock. Deixar a separação para depois significa descobrir isso no dia
   do deploy.

   Se uma migration falhar, **nunca** "resolva" apontando `DATABASE_URL` para a conexão
   direta.

6. **Nenhum código conhece o provedor de banco.** Não instale SDK de provedor
   (`@supabase/supabase-js`, `@neondatabase/serverless` ou equivalente), não use
   autenticação, storage, RLS ou funções de plataforma de ninguém. O acesso ao banco é
   Prisma e só Prisma; a diferença entre ambientes é a variável de ambiente e nada mais.
   Isso mantém a escolha de hospedagem em aberto e atende o RNF11.

   Em particular: **autenticação é Auth.js com Entra ID**. A §4.3 do documento de
   requisitos proíbe base de senhas própria — nenhum sistema de auth de provedor entra
   aqui, por mais conveniente que pareça.

3. **Nada de Puppeteer ou Chromium.** Não cabe em função serverless.

4. **Toda Server Action que altera dado chama `revalidatePath()`.** Sem isso o
   coordenador aprova e a tela continua mostrando "Aguardando Avaliação".

5. **Sem `localStorage` para estado de negócio.** A verdade está no banco.

---

## Autenticação e autorização

São coisas separadas. Confundi-las é o erro mais provável neste projeto.

- **A Microsoft responde apenas "quem é"**: nome, e-mail institucional e `oid`.
  Não sabe nada sobre cursos, perfis ou vínculos.
- **O banco responde "o que pode fazer"**: perfis, cursos, vínculos e quem avalia quem
  são cadastro interno mantido pelo administrador.

### Fluxo de login

1. Auth.js conduz o OIDC e devolve o profile.
2. Busca o usuário **por `entraOid` primeiro; se não achar, por e-mail**.
3. Se achou por e-mail e `entraOid` está vazio, **grave o `oid` agora**. Daí em diante a
   busca é por `oid` — e-mail muda (casamento, correção de grafia) e a pessoa perderia
   o vínculo com todo o histórico dela.
4. **Não achou de jeito nenhum: negue o acesso.** Nunca crie usuário automaticamente.
   Qualquer aluno com conta institucional passa pela Microsoft; é esta checagem que barra.
5. **Coloque apenas `usuarioId` no token da sessão.** Perfis e vínculos são carregados
   por requisição, com `cache()` do React para não repetir a query no mesmo render.

> O passo 5 diverge do que está em `docs/`, que manda colocar vínculos no token.
> Corrigido de propósito: o token é imutável até o próximo login, e num sistema usado
> duas vezes por ano a sessão está sempre velha. Vínculo novo cadastrado pelo admin
> não apareceria para o docente já logado.

### Login falso para desenvolvimento

Provider `Credentials` habilitado **só quando `NODE_ENV === "development"`**, com quatro
usuários fixos vindos do seed:

- um docente vinculado a dois cursos
- um coordenador de um curso
- um coordenador que também dá aula no próprio curso (para testar o RF22)
- um administrador

Um `if` na configuração decide qual provider sobe. Isso existe para o projeto não ficar
parado esperando a TI liberar o registro no Entra ID.

### Autorização

**Sempre no servidor, na primeira linha de cada Server Action e de cada page.**
Esconder botão na interface não é controle de acesso — a Server Action tem endpoint
público e é chamável com `curl`. O critério de aceitação do RF02 exige exatamente isso.

Helpers em `lib/auth/guards.ts`:

```ts
exigirSessao()
exigirPerfil(perfil)
exigirAcessoAoRelatorio(relatorioId, acao)  // valida vínculo, não só perfil
```

---

## Modelo de dados

Schema completo em `docs/SRHA-especificacao-desenvolvimento.md` §4. Copie de lá.

- Chaves primárias **sequenciais** (`autoincrement`), decisão expressa do cliente (RNF03).
- **`Int`, não `BigInt`** — evita dor de serialização em Server Action.
- **`Decimal` do Prisma não atravessa a fronteira servidor → cliente.** Serviços em
  `lib/services/` devolvem `number`. Converta antes de retornar, nunca vaze o objeto
  Decimal para um componente.

### Invariantes que o código precisa garantir

- **Um relatório por docente, curso e período** — garantido pelo `@@unique`.
- **A linha de `Relatorio` nasce sob demanda.** Só existe a partir da primeira escrita do
  próprio docente — abrir o formulário do curso e salvar rascunho, ou adicionar o primeiro
  item. **Não crie relatórios em lote ao cadastrar o período letivo**, nem em nenhum outro
  momento automático. É o que sustenta o invariante do painel de acompanhamento (RF18):
  "não iniciados" só existe porque a linha não existe. Criação antecipada no cadastro do
  período é evolução possível, não desta versão.
- **`cargaHorariaTotal` sempre igual à soma dos itens.** Recalcule dentro da mesma
  transação que altera itens. O cliente nunca envia o total.
- **Relatório aprovado e evento de auditoria não sofrem update nem delete.**
  Não exponha operação capaz disso em lugar nenhum (RNF09, retenção de 5 anos).
- **Inativar, nunca excluir** curso, usuário ou tipo de atividade já referenciado.

---

## Máquina de estados

```
RASCUNHO ──submeter──> AGUARDANDO_AVALIACAO ──aprovar──> APROVADO (terminal)
                              │      ▲
                       devolver│      │submeter
                              ▼      │
                     DEVOLVIDO_PARA_AJUSTE
```

Implementada em `lib/services/workflow.ts`, **fora dos componentes**. Os componentes
apenas chamam. É o que sustenta o RNF10 e o que permite testar sem subir tela.

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

**Nunca altere `situacao` fora dessas funções.**

### Regras do workflow

- **Roteamento automático.** O avaliador é o coordenador vinculado ao curso do relatório.
  O docente não escolhe destinatário.
- **Autoaprovação proibida (RF22).** Se o autor for o próprio coordenador do curso, vai
  para o `avaliadorAlternativo` cadastrado no curso. **Sem alternativo cadastrado,
  bloqueie a submissão** com mensagem clara, em vez de deixar o relatório órfão.
- **Devolução exige justificativa** não vazia.
- **Sem limite de devoluções.** Cada ciclo gera seu próprio evento.
- **Submissão fora do prazo é bloqueada**; consulta a período encerrado continua livre.

---

## Server Actions

Uma casca fina em volta do serviço. Sempre nesta ordem:

```ts
"use server"

export async function acaoSubmeter(relatorioId: number): Promise<Resultado<void>> {
  const sessao = await exigirSessao()                     // 1. guard
  const dados = SchemaSubmeter.parse({ relatorioId })     // 2. zod
  await submeter(dados.relatorioId, sessao.usuarioId)     // 3. serviço puro
  revalidatePath("/")                                      // 4. revalidação
  return { ok: true, dados: undefined }
}
```

**Formato de retorno único**, em `lib/tipos.ts`:

```ts
type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campo?: string }
```

Regra de negócio não mora na action. Mora no serviço. A action é guard + validação +
chamada + revalidação.

---

## Rotas

| Rota | Perfil | Conteúdo |
|---|---|---|
| `/login` | público | Botão único de entrada institucional |
| `/` | docente | Cursos do período aberto e situação do relatório de cada um |
| `/relatorios/[id]` | docente | Formulário com itens, total e ações |
| `/avaliacao` | coordenador | Fila agrupada por curso |
| `/avaliacao/[id]` | coordenador | Relatório em leitura + aprovar / devolver + histórico |
| `/acompanhamento` | coord./admin | Situação de entrega por curso no período corrente |
| `/arquivo` | todos | Navegação Ano › Semestre › Curso (filtro, não pasta) |
| `/admin/cursos` | admin | CRUD de cursos e avaliador alternativo |
| `/admin/usuarios` | admin | CRUD de usuários, perfis e importação CSV |
| `/admin/vinculos` | admin | Vínculos docente-curso e coordenador-curso — os dois lados da relação |
| `/admin/periodos` | admin | Períodos letivos e prazos |
| `/admin/auditoria/[id]` | admin | Trilha completa de um relatório |

---

## Duas simplificações deliberadas

**Não crie pastas no disco.** O arquivamento hierárquico Ano › Semestre › Curso (RF14) é
uma consulta com filtros. A tela navega como se fossem pastas, mas por baixo é
`WHERE ano = ? AND semestre = ? AND cursoId = ?`. Elimina storage, sincronização e
arquivo órfão.

**Não armazene PDF.** Gere sob demanda a partir dos dados. O relatório aprovado é imutável
porque o banco impede o update, não porque existe arquivo congelado.

---

## Armadilha do painel de acompanhamento (RF18)

A contagem de **"não iniciados" não sai da tabela `Relatorio`.** Se o docente nunca abriu
o sistema, não existe linha nenhuma.

```
não iniciados = vínculos docente-curso do período − relatórios existentes
```

Contar só as linhas da tabela faz o painel mostrar 100% entregue com metade dos docentes
sem ter começado — e "quem ainda não entregou" é a pergunta que a coordenação mais faz.

---

## Ambiente local

O banco de desenvolvimento roda em container, com `docker-compose.yml` na raiz:

```yaml
services:
  db:
    image: postgres:16
    container_name: srha-db
    environment:
      POSTGRES_USER: srha
      POSTGRES_PASSWORD: srha
      POSTGRES_DB: srha
    ports:
      - "5432:5432"
    volumes:
      - srha-dados:/var/lib/postgresql/data
volumes:
  srha-dados:
```

`.env` (nunca versionado; mantenha um `.env.example` com as chaves e valores vazios):

```
DATABASE_URL="postgresql://srha:srha@localhost:5432/srha"
DIRECT_URL="postgresql://srha:srha@localhost:5432/srha"
```

Iguais em desenvolvimento, diferentes em produção. Ver regra 2.

O volume nomeado preserva os dados entre `docker compose down` e `up`. Para começar do
zero, `docker compose down -v` e rode migrate e seed de novo — o seed é idempotente.

**Não use `prisma db push` nem em desenvolvimento.** Toda alteração de schema gera
migration versionada, desde a primeira. É o histórico que sustenta a retenção de cinco
anos do RNF09.

---

## Convenções

- Estrutura: `app/` (rotas), `lib/services/` (regras de negócio), `lib/auth/` (sessão e
  guards), `lib/db.ts` (cliente Prisma singleton), `components/`
- Nomes de domínio em **português** (`Relatorio`, `submeter`, `cargaHorariaTotal`);
  termos de framework em inglês
- **Zod em toda Server Action**, antes de tocar no banco
- Migrações com `prisma migrate`, **nunca `db push` em produção**
- Credenciais só em variável de ambiente, nunca no código
- Datas em UTC no banco, convertidas na exibição
- Commits pequenos, um assunto por commit, mensagem em português no imperativo

---

## Interface

**O layout já existe em `docs/layout/`. Use-o.** Não redesenhe, não invente componente
novo quando já houver equivalente, não troque paleta nem tipografia. Se faltar algo,
pergunte antes de criar.

Brief completo em `docs/SRHA-brief-design.md`. O que não pode ser violado:

- Responsivo real até **360px** — o fluxo inteiro precisa funcionar no celular
- Alvos de toque de no mínimo **44px**
- Foco de teclado visível em tudo que é interativo
- Contraste mínimo **AA**
- `prefers-reduced-motion` respeitado
- Rótulo associado a cada campo; **nunca placeholder como rótulo**
- **Cor nunca é o único portador de estado** — sempre cor + rótulo por extenso +
  marcador de forma
- Números sempre em **IBM Plex Mono com figuras tabulares** (colunas de horas alinham
  por casa decimal)
- A **trilha de auditoria é coluna permanente** ao lado do relatório, nunca escondida
  atrás de aba, modal ou botão "ver histórico"
- **Adicionar item de atividade não abre modal** — a linha nova aparece direto na lista

---

## Ordem de construção

1. Projeto, Prisma, migração inicial, seed
2. Cadastros do admin — comece por **importação CSV**, mais rápida que CRUD completo
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

Do 1 ao 7 o fluxo principal está fechado ponta a ponta. O que vier depois é melhoria,
não buraco.

**Um passo por vez.** Não adiante etapa. Ao terminar um passo, pare e relate o que foi
feito e como verificar.

---

## Testes obrigatórios

Jest configurado com `next/jest` — ele usa o SWC para transpilar TypeScript, o que evita
a configuração de `ts-jest` e o atrito de ESM. Não instale `ts-jest`.

Todos os testes ficam em `lib/services/__tests__/`, rodam sem subir tela e sem browser:

- Docente vinculado a dois cursos gera dois relatórios independentes, roteados a
  coordenadores diferentes
- Coordenador não consegue aprovar relatório do qual é autor
- Coordenador não enxerga relatório de curso que não é dele
- Submissão fora do prazo é bloqueada
- Devolução sem justificativa é bloqueada
- Após submeter → devolver → submeter → aprovar, a auditoria tem quatro eventos em
  ordem cronológica
- `cargaHorariaTotal` bate com a soma dos itens após adicionar e remover item
- Relatório aprovado não aceita alteração por nenhum caminho
