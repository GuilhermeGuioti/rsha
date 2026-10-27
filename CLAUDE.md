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
| Interface | Tailwind, com componentes próprios em `components/` (sem biblioteca de componentes) |
| PDF | `@react-pdf/renderer` |
| CSV | `papaparse` (`parse` na importação, `unparse` na extração) |
| Testes | **Jest**, configurado via `next/jest` |
| Pacotes | **npm** |
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
   mesmo lugar. No Prisma 7 nenhuma delas fica no `schema.prisma`:
   - `DATABASE_URL` — runtime, lida em `lib/db.ts` pelo adapter `@prisma/adapter-pg`.
     Em produção, com pooler.
   - `DIRECT_URL` — usada pelo `prisma migrate`, em `prisma.config.ts`. Sempre direta.

   Em desenvolvimento as duas apontam para o container local e são idênticas. A separação
   existe agora porque **em produção o runtime precisa passar por pooler** — sem isso o
   sistema cai no pico do fechamento de semestre, que é exatamente o RNF01 — e o
   `prisma migrate` **não funciona através de pooler em modo transaction**, porque precisa
   de DDL e advisory lock. Deixar a separação para depois significa descobrir isso no dia
   do deploy.

   Se uma migration falhar, **nunca** "resolva" apontando `DATABASE_URL` para a conexão
   direta.

3. **Nenhum código conhece o provedor de banco.** Não instale SDK de provedor
   (`@supabase/supabase-js`, `@neondatabase/serverless` ou equivalente), não use
   autenticação, storage, RLS ou funções de plataforma de ninguém. O acesso ao banco é
   Prisma e só Prisma; a diferença entre ambientes é a variável de ambiente e nada mais.
   Isso mantém a escolha de hospedagem em aberto e atende o RNF11.

   Em particular: **autenticação é Auth.js com Entra ID**. A §4.3 do documento de
   requisitos proíbe base de senhas própria — nenhum sistema de auth de provedor entra
   aqui, por mais conveniente que pareça.

4. **Nada de Puppeteer ou Chromium.** Não cabe em função serverless.

5. **Toda Server Action que altera dado chama `revalidatePath()`.** Sem isso o
   coordenador aprova e a tela continua mostrando "Aguardando Avaliação".

6. **Sem `localStorage` para estado de negócio.** A verdade está no banco.

---

## Autenticação e autorização

São coisas separadas. Confundi-las é o erro mais provável neste projeto.

- **A Microsoft responde apenas "quem é"**: nome, e-mail institucional e `oid`.
  Não sabe nada sobre cursos, perfis ou vínculos.
- **O banco responde "o que pode fazer"**: perfis, cursos, vínculos e quem avalia quem
  são cadastro interno mantido pela secretaria acadêmica.

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
   `ativo` também: usuário inativado pela secretaria perde o acesso na requisição
   seguinte, não quando a sessão expirar.

E-mail é gravado e comparado em minúsculas — o `@unique` do banco diferencia caixa.

> O passo 5 diverge do que está em `docs/`, que manda colocar vínculos no token.
> Corrigido de propósito: o token é imutável até o próximo login, e num sistema usado
> duas vezes por ano a sessão está sempre velha. Vínculo novo cadastrado pela secretaria
> não apareceria para o docente já logado.

### Login falso para desenvolvimento

Provider `Credentials` habilitado **só quando `NODE_ENV === "development"`**, com quatro
usuários fixos vindos do seed:

- um docente vinculado a dois cursos
- um coordenador de um curso
- um coordenador que também dá aula no próprio curso (para testar a autoaprovação)
- uma pessoa da secretaria acadêmica

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

Quem enxerga o quê (`exigirAcessoAoRelatorio`):

- **autor** lê sempre e edita enquanto a situação e o prazo permitirem;
- **rascunho é visível só ao autor e à secretaria** (RF07, quadro 10) — a coordenação
  enxerga o relatório a partir da primeira submissão;
- **qualquer coordenador do curso lê**; só o avaliador aprova ou devolve;
- **secretaria lê tudo** e não edita nem avalia (RF17).

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
  O próprio Postgres recusa, por triggers (migration `imutabilidade_aprovado_e_auditoria`),
  que também travam incluir, alterar ou remover item de relatório aprovado.
- **Inativar, nunca excluir** curso, usuário ou tipo de atividade já referenciado.
- **Tipos de atividade são lista fixa**, gravada pela migration `tipos_atividade_fixos` —
  sem tela de cadastro nem importação (decisão de 2026-10-26; diverge do RF03 do
  `docs/srha-docreq.pdf`, que previa cadastrar, alterar e inativar). Mudar a lista é
  migration nova; tipo retirado é inativado, não excluído. O item guarda só o
  `tipoAtividadeId` — não copie o nome para o item.
- **Vínculo docente-curso com relatório não pode ser removido.** Arquivo e painel partem
  dos vínculos — sem ele, o relatório (mesmo aprovado) sumiria da consulta.
- **Sempre há ao menos uma secretaria ativa.** Inativar ou tirar o perfil da última é
  recusado — sem ela, ninguém mais cadastra nem reativa.
- **Horas em múltiplos de 0,5**, no máximo 999,5 por item (zod da action, igual ao
  `step` do campo). O total é somado em centésimos no serviço.

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

- **Roteamento automático.** O avaliador é o primeiro coordenador **ativo** vinculado ao
  curso do relatório (ordem de cadastro do vínculo). Coordenador inativado sai da fila e o
  próximo ativo assume. O docente não escolhe destinatário.
- **Autoaprovação permitida, de propósito.** Se o autor for o próprio coordenador do
  curso, ele mesmo é o avaliador — não existe mais avaliador alternativo (decisão
  revisada; diverge do RF22 original do `docs/srha-docreq.pdf`, que marcava a
  autoaprovação como proibida e "Essencial"). **Sem coordenador vinculado ao curso,
  bloqueie a submissão** com mensagem clara, em vez de deixar o relatório órfão. O mesmo
  vale quando nenhum coordenador do curso está ativo.
- **Submissão exige ao menos um item** (RF05) — no serviço, não só no botão da tela.
- **Devolução exige justificativa** não vazia.
- **Sem limite de devoluções.** Cada ciclo gera seu próprio evento.
- **Prazo de entrega.** Criar relatório, editar rascunho e submeter só valem entre
  `aberturaSubmissao` e `encerramentoSubmissao`; a mensagem de bloqueio indica a data
  limite (RF19). Consulta a período encerrado continua livre, e a avaliação (aprovar,
  devolver) não tem prazo.
- **Devolvido ganha prazo extra.** Pode ser corrigido e reenviado até o maior entre o
  encerramento do período e a última devolução + 7 dias (`DIAS_PRAZO_APOS_DEVOLUCAO` e
  `prazoDeEntrega` em `lib/services/workflow.ts`). Sem isso, devolução depois do
  encerramento travava o relatório. Decisão de 2026-10-19 — o RF19 original só fala do
  prazo do período. A home do docente lista esses devolvidos de períodos encerrados.

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
| `/validar` | público | Validação de autenticidade do PDF — ver §Carimbo de autenticidade |
| `/` | todos | Conteúdo por perfil — ver nota abaixo da tabela |
| `/relatorios/[id]` | docente | Formulário com itens, total e ações |
| `/avaliacao` | coordenador | Fila agrupada por curso |
| `/avaliacao/[id]` | coordenador | Relatório em leitura + aprovar / devolver + histórico |
| `/acompanhamento` | coord./secretaria | Situação de entrega por curso no período corrente |
| `/arquivo` | todos | Navegação Ano › Semestre › Curso (filtro, não pasta) |
| `/admin/cursos` | secretaria | CRUD de cursos |
| `/admin/usuarios` | secretaria | CRUD de usuários, perfis e importação CSV |
| `/admin/vinculos` | secretaria | Vínculos docente-curso e coordenador-curso — os dois lados da relação |
| `/admin/periodos` | secretaria | Períodos letivos e prazos |

Não existe tela própria de auditoria. A secretaria consulta a trilha de qualquer relatório
(RF17, UC11) em `/relatorios/[id]`, onde ela já é coluna permanente — a rota
`/admin/auditoria/[id]` da especificação original foi descartada em 2026-10-22 por
repetir os mesmos dados.

`/` não é uma tela única — é um roteador por perfil (`app/(private)/(dashboard)/page.tsx`),
porque quem não é docente não tem relatório nenhum pra ver ali:

- **docente** → `HomeDocente`: cursos do período aberto e situação do relatório de cada um,
  mais os devolvidos de períodos encerrados que ainda estão no prazo extra.
  Prioridade sobre os outros perfis por ser o caso mais comum (302 vs. 17 coordenadores) —
  quem acumula docente + coordenador no mesmo curso cai aqui e chega na fila pelo nav.
- **coordenador** (sem ser também docente) → `redirect("/avaliacao")`: a fila é trabalho
  pendente, não faz sentido logar numa tela vazia.
- **secretaria** (sem ser também docente) → `HomeSecretaria`: atalhos grandes para
  `/admin/*`, já que a secretaria não preenche nem avalia relatório.
- **sem perfil algum** → mensagem pedindo pra procurar a secretaria. Não deveria acontecer
  em uso normal, mas pode existir entre o cadastro do usuário e o primeiro vínculo.

*Route groups* em `app/` — nenhum aparece na URL, servem só para deixar claro, olhando
a pasta, o que precisa de login e o que não precisa: `app/(public)/...` e
`app/(private)/...`, lado a lado.

- **`(public)`** — sem guard. Hoje `/login` e `/validar`.
- **`(private)`** — exige sessão (`exigirSessaoPagina`). Hoje só o subgrupo
  `(dashboard)` aninhado dentro dele — não sobrou rota solta direto em `(private)`.
- **`(private)/(dashboard)`** — é `(private)`, então já exige sessão; além disso
  desenha a barra superior (mockup: "Horas Atividades" + navegação + crachá de
  perfil + Sair), em `app/(private)/(dashboard)/layout.tsx`. Hoje `/`, `/relatorios`,
  `/avaliacao` e `/admin/*`.

Todas as rotas de `(private)` usam a mesma barra no mockup — só mudam os links e o
crachá conforme o perfil. Uma rota nova nasce direto em `(private)` (sem barra) até
ganhar tela própria — só então migra pra dentro de `(dashboard)`.

**Cada page continua fazendo seu próprio `exigirPerfil` (ou equivalente) na primeira
linha**, dentro ou fora do `(dashboard)` — o layout dele só evita duplicar a barra e
a busca do usuário logado; não substitui a autorização por perfil, que é sempre da
page ou da Server Action.

---

## Duas simplificações deliberadas

**Não crie pastas no disco.** O arquivamento hierárquico Ano › Semestre › Curso (RF14) é
uma consulta com filtros. A tela navega como se fossem pastas, mas por baixo é
`WHERE ano = ? AND semestre = ? AND cursoId = ?`. Elimina storage, sincronização e
arquivo órfão.

**Não armazene PDF.** Gere sob demanda a partir dos dados. O relatório aprovado é imutável
porque o banco impede o update, não porque existe arquivo congelado.

---

## Carimbo de autenticidade

Decisão de 2026-10-26, fora do `docs/`. Todo PDF de relatório aprovado sai com um
**código de autenticidade**: no quadro da validação eletrônica, no rodapé de cada página e
nos metadados do arquivo (campo Keywords, prefixo `SRHA-AUTENTICIDADE:`). Em `/validar`,
pública e sem login, quem recebeu o papel anexa o PDF ou digita o código. Se o código for
válido, a tela mostra o resumo oficial: docente, curso, período, total de horas e
aprovação — sem e-mail, itens nem trilha (LGPD). Há atalho para ela no `/login` (para
quem não tem conta) e no início da secretaria (decisão de 2026-10-27).

- **O código é HMAC-SHA256**, com chave que só o servidor conhece (`lib/services/autenticidade.ts`).
  Nada é gravado: conferir é recalcular e comparar. Mesmo código a cada download.
- **O código não prova o conteúdo do papel — ele destrava a conferência.** Quem valida
  compara o resumo com o documento em mãos. O segredo existe para ninguém adivinhar o
  código de outro relatório: o `REL-…` é sequencial, e a página é pública.
- **Chaves em `CHAVES_CARIMBO`**, no formato `"1:<base64>,2:<base64>"`. A de maior versão
  assina, e todas conferem. A versão viaja dentro do código.
  **Nunca remova nem altere uma versão em produção**: todo papel impresso com ela passa
  a dar como inválido, e a retenção é de cinco anos (RNF09). Para trocar a chave,
  acrescente uma versão nova. Guarde cópia das chaves fora da Vercel.
- **A assinatura cobre o id e o instante da aprovação** (imutável pelo trigger). Com isso,
  relatório de mesmo id em outra base não confere com papel antigo.
- **Sem chave configurada o PDF não é emitido**: uma via sem carimbo não teria como ser
  conferida depois.
- **Ler o código do PDF anexado dispensa biblioteca de PDF**: o react-pdf grava os
  metadados como texto puro. PDF escaneado ou salvo de novo por outro programa perde
  esse campo; nesse caso a tela pede o código digitado.

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
      - "5433:5432"
    volumes:
      - srha-dados:/var/lib/postgresql/data
volumes:
  srha-dados:
```

`.env` (nunca versionado; mantenha um `.env.example` com as chaves e valores vazios):

```
DATABASE_URL="postgresql://srha:srha@localhost:5433/srha"
DIRECT_URL="postgresql://srha:srha@localhost:5433/srha"
CHAVES_CARIMBO="1:<saída de openssl rand -base64 32>"
```

Iguais em desenvolvimento, diferentes em produção. Ver regra 2.

No host o container fica na **5433**, não na 5432 padrão: assim não disputa a porta com
outro Postgres rodando na máquina. Dentro do container continua 5432.

O seed cria a secretaria inicial. Fora de produção é `admin@srha.dev` (a conta do login
falso). Em produção — seed rodado com `NODE_ENV=production` — vem de
`SECRETARIA_INICIAL_EMAIL` (e, opcional, `SECRETARIA_INICIAL_NOME`), porque o login é
pelo Entra ID e precisa ser uma conta institucional real; sem a variável, o seed falha.

O volume nomeado preserva os dados entre `docker compose down` e `up`. Para começar do
zero, `docker compose down -v` e rode migrate e seed de novo — o seed é idempotente.

**Não use `prisma db push` nem em desenvolvimento.** Toda alteração de schema gera
migration versionada, desde a primeira. É o histórico que sustenta a retenção de cinco
anos do RNF09.

---

## Convenções

- Estrutura: `app/` (rotas — só o que for rota, mais layout/globals/favicon; dentro
  dele, `(public)` e `(private)` conforme exige sessão, com `(dashboard)` aninhado em
  `(private)` para quem também tem a barra compartilhada — ver §Rotas),
  `lib/services/` (regras de negócio), `lib/auth/`
  (sessão, guards e a action de sair — não é rota, por isso não mora em `app/`),
  `lib/db.ts` (cliente Prisma singleton), `components/`, `generated/prisma` (saída
  do `prisma generate`, fora de `app/` de propósito — não é rota nem código que se
  escreve à mão)
- Nomes de domínio em **português** (`Relatorio`, `submeter`, `cargaHorariaTotal`);
  termos de framework em inglês
- **Zod em toda Server Action**, antes de tocar no banco
- Migrações com `prisma migrate`, **nunca `db push` em produção**
- Credenciais só em variável de ambiente, nunca no código
- Datas em UTC no banco, convertidas na exibição — sempre para `America/Sao_Paulo`, pelos
  helpers de `lib/formato.ts`. Nunca `toLocale*` direto: na Vercel o servidor roda em UTC
- Commits pequenos, um assunto por commit, mensagem em português no imperativo
- **Sempre modularizar componentes.** JSX que se repete em duas ou mais telas vira
  componente compartilhado em `components/` assim que aparecer pela segunda vez —
  botão, campo de formulário, cabeçalho de tela, linha vazia de tabela, célula de
  ação, o que for. Não deixe a mesma classe Tailwind copiada em três arquivos.
  Não crie componente para algo usado uma vez só — isso é a abstração especulativa
  que o resto deste documento pede pra evitar.

---

## Interface

**O layout já existe em `docs/srha-layout/` (`SRHA Telas.dc.html`). Use-o.** Não redesenhe, não invente componente
novo quando já houver equivalente, não troque paleta nem tipografia. Se faltar algo,
pergunte antes de criar.

**Acabamento revisado a pedido (decisão de 2026-10-26)**, tendo como referência o painel
web do App do Dono. A estrutura do mockup continua valendo (telas, fluxo, o que aparece
em cada uma); mudou o acabamento, e ele diverge do `docs/` nestes pontos:

- **Tipografia:** Inter na interface e nos títulos, no lugar de IBM Plex Sans e Serif.
  Números continuam em IBM Plex Mono com figuras tabulares. O PDF não mudou e segue com
  as fontes Plex de `lib/pdf/fontes`.
- **Paleta:** continua sendo o azul e o verde-água do logo, mas os tokens que valem são os
  de `app/globals.css`, não os do brief. O `--azul-institucional` (#0086cc) dá 4:1 sobre
  branco e não serve para texto: texto, link e botão primário usam o `--azul-interativo`.
  O `--estado-aguardando` foi escurecido para #9a5b00, porque o âmbar do brief não
  passava AA no selo.
- **Superfícies:** barra superior branca, com o menu da conta em popover nativo
  (`components/Nav.tsx`); cabeçalho de cada tela em cartão (`CabecalhoAdmin`, nível 1);
  todo bloco de conteúdo é cartão (`components/Cartao.tsx`, ou `classeCartao` quando o
  elemento é `<Link>`, `<nav>` ou tabela); estado vazio de tela inteira em
  `components/AvisoVazio.tsx`.
- **Identidade própria (2026-10-27):** o que era cópia direta do App do Dono deu lugar
  a elementos do SRHA, sem mexer em paleta, tipografia nem estrutura. Barra superior
  com fio azul + verde-água no topo (`--faixa-marca`) e página atual sublinhada em
  `--acento-forte`; relatório aprovado com carimbo no cabeçalho
  (`components/Carimbo.tsx`, sem o código de autenticidade, que fica só no papel);
  início da secretaria como índice em lista por grupo, não mosaico de cartões.

Paleta e tipografia são estas daqui em diante. Não troque de novo sem pedido.

Fora do mockup, a pedido (2026-10-26): a tela pública **`/validar`** (§Carimbo de
autenticidade), montada com os componentes existentes no visual da `/login`, e o
**botão "Voltar" em toda tela do `(dashboard)`**
menos o início do perfil — `components/BotaoVoltar.tsx`, desenhado no layout. Volta
pelo histórico só quando a tela anterior é do próprio sistema; página aberta direto
vai para a tela-mãe.

Brief completo em `docs/srha-layout/uploads/SRHA-brief-design.md`. O que não pode ser violado:

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
2. Cadastros da secretaria — comece por **importação CSV**, mais rápida que CRUD completo
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

Do 1 ao 7 o fluxo principal está fechado ponta a ponta. O que vier depois é melhoria,
não buraco.

**Fora da versão inicial** (decisões de 2026-10-22 — não implemente):

- **Notificações por e-mail (RF13)** — aviso de relatório recebido para avaliação,
  devolvido, aprovado e de prazo perto do fim. O RF13 do `docs/srha-docreq.pdf` é
  "Desejável".
- **Expiração de sessão por inatividade** (parte do RNF07) — fica o padrão do Auth.js,
  30 dias sem uso. Diverge do RNF07, marcado "Essencial"; o resto dele (canal cifrado,
  acesso por perfil, LGPD) continua valendo.
- **Reuso do relatório do período anterior (RF20)** — importar os itens do aprovado no
  período anterior como base do novo. O RF20 é "Desejável".

**Um passo por vez.** Não adiante etapa. Ao terminar um passo, pare e relate o que foi
feito e como verificar.

---

## Testes obrigatórios

Jest configurado com `next/jest` — ele usa o SWC para transpilar TypeScript, o que evita
a configuração de `ts-jest` e o atrito de ESM. Não instale `ts-jest`.

Todos os testes ficam em `lib/services/__tests__/`, rodam sem subir tela e sem browser:

- Docente vinculado a dois cursos gera dois relatórios independentes, roteados a
  coordenadores diferentes
- Coordenador consegue aprovar relatório do qual é autor (autoaprovação permitida)
- Coordenador não enxerga relatório de curso que não é dele
- Submissão fora do prazo é bloqueada
- Devolução sem justificativa é bloqueada
- Após submeter → devolver → submeter → aprovar, a auditoria tem quatro eventos em
  ordem cronológica
- `cargaHorariaTotal` bate com a soma dos itens após adicionar e remover item
- Relatório aprovado não aceita alteração por nenhum caminho
