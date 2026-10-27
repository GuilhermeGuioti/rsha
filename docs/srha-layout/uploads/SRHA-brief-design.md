# SRHA — Brief de design das telas

## Quem usa, e em que estado de espírito

Um professor abre este sistema **duas vezes por ano**. Na segunda vez, ele esqueceu tudo o que aprendeu na primeira. Muitos são horistas, chegam à faculdade em dois dias da semana e vão preencher isso no celular, com pressa, perto do prazo. A faixa etária e o conforto com tecnologia variam bastante.

A coordenadora abre o sistema no fim do semestre com 30 relatórios para avaliar e uma pergunta na cabeça: **quem ainda não entregou?**

O sistema substitui um formulário de papel. O modelo mental do usuário é **documento**, não painel de controle.

**O teste da tela:** alguém que nunca viu o sistema consegue responder "o que eu devo e em que pé está?" em menos de três segundos, sem clicar em nada.

---

## Cores

> **Substitua pelos valores oficiais.** Não consegui confirmar os hexadecimais do manual da marca da Barão de Mauá. Os valores abaixo são um ponto de partida institucional plausível — pegue os corretos no manual ou com o conta-gotas no site da instituição e troque apenas estes tokens. O resto do design não muda.

```css
--azul-institucional: #0B3B6F;  /* barras, títulos de seção, botão primário */
--azul-interativo:    #1E6BB8;  /* links, foco, estados de hover */
--papel:              #F7F8FA;  /* fundo da aplicação */
--superficie:         #FFFFFF;  /* cartões e formulários */
--tinta:              #14181F;  /* texto principal */
--tinta-suave:        #5A6572;  /* rótulos, texto secundário */
--borda:              #DDE3EA;
```

Cores dos quatro estados do relatório — precisam ser distinguíveis entre si à primeira vista:

```css
--estado-rascunho:   #6B7683;  /* cinza  */
--estado-aguardando: #B26A00;  /* âmbar  */
--estado-devolvido:  #B3261E;  /* vermelho */
--estado-aprovado:   #1E7A46;  /* verde  */
```

**Cor nunca é o único portador da informação.** Todo indicador de estado combina cor + rótulo escrito por extenso + um marcador de forma à esquerda. Um usuário daltônico precisa distinguir "Devolvido para ajuste" de "Aprovado" sem depender do vermelho e do verde.

Use o azul institucional com disciplina: barra superior, títulos de seção e o botão primário de cada tela. Não pinte tudo de azul — o volume de azul é o que faz o sistema parecer institucional em vez de decorado.

---

## Tipografia

Superfamília **IBM Plex**, em três papéis. É uma escolha deliberada: tem figuras tabulares de verdade (essencial nas colunas de horas), carrega um tom técnico-institucional adequado, e as três variantes conversam entre si.

| Papel | Fonte | Uso |
|---|---|---|
| Títulos de documento | **IBM Plex Serif** SemiBold | Nome do relatório, títulos de página |
| Interface | **IBM Plex Sans** Regular / Medium | Todo o resto |
| Números | **IBM Plex Mono** Medium | Horas, totais, identificadores de relatório |

O serif nos títulos é intencional: evoca o documento formal que está sendo substituído, sem que a tela vire um fac-símile de papel.

**Números sempre em mono, com figuras tabulares.** Colunas de horas precisam alinhar por casa decimal. Isso não é preciosismo — é o que permite conferir uma coluna de valores com o olho, que é literalmente o trabalho do coordenador.

Escala: 32 / 24 / 18 / 15 / 13 px. Corpo em 15px, nunca abaixo de 13px em nada que o usuário precise ler.

---

## O elemento de assinatura: a trilha

O sistema inteiro existe porque hoje **não há rastreabilidade** — ninguém sabe quem aprovou o quê, quando, nem quantas vezes o documento foi devolvido.

Então a trilha de auditoria não pode ficar escondida atrás de um botão "ver histórico". Ela é **uma coluna permanente ao lado do relatório**, em formato de linha do tempo vertical, mostrando cada evento com autor, data e horário, e a justificativa por extenso quando houve devolução.

É o elemento que o usuário vai lembrar, e é onde a ousadia do design deve ser gasta. O resto da interface fica quieto.

No desktop: relatório à esquerda (dois terços), trilha à direita (um terço). No celular: trilha abaixo do relatório, sempre expandida, nunca colapsada.

---

## Telas

### 1. Entrada
Tela única, centrada, com o nome do sistema, o nome da instituição e **um único botão**: "Entrar com a conta institucional". Sem campo de e-mail, sem campo de senha, sem "esqueci minha senha" — não existe senha neste sistema.

Abaixo do botão, uma linha discreta: quem não tiver acesso deve procurar a coordenação.

### 2. Início do docente
A resposta à pergunta "o que eu devo". Um cartão por curso em que o docente atua no período aberto, cada um com: nome do curso, indicador de estado, total de horas declaradas e a ação disponível.

Se o docente atua em dois cursos, ele vê **dois cartões independentes**. Deixe visualmente óbvio que são documentos separados — é a confusão mais provável do sistema.

O prazo de entrega aparece fixo no topo, e ganha destaque quando faltarem menos de sete dias.

### 3. Formulário do relatório
Cabeçalho com curso, período e estado. Depois, a lista de itens de atividade, cada um com tipo, dia da semana, horário, horas e descrição.

**O total de horas é o elemento mais destacado da tela**, em mono, grande, atualizando a cada alteração. É o número que o docente confere antes de enviar e o primeiro que o coordenador procura.

Adicionar item não abre modal — a linha nova aparece direto na lista, com foco no primeiro campo.

Duas ações, com peso visual diferente: "Salvar rascunho" (secundária) e "Enviar para avaliação" (primária).

Quando o relatório voltou devolvido, a justificativa do coordenador aparece **no topo, dentro de um bloco destacado**, antes de qualquer campo. É a primeira coisa que o docente precisa ler.

### 4. Fila do coordenador
Lista agrupada por curso, ordenada com os que aguardam avaliação primeiro. Cada linha: docente, curso, total de horas, há quantos dias está esperando.

O contador de dias esperando é o que cria a sensação de fila viva e ajuda a coordenadora a priorizar.

### 5. Avaliação
O relatório em leitura, sem campos editáveis, com a trilha ao lado. Duas ações: "Aprovar" e "Devolver para ajuste".

Devolver abre um campo de justificativa **obrigatório**. O botão de confirmar fica desabilitado enquanto o campo estiver vazio, com a explicação visível do porquê — nunca deixe o usuário clicar e só então descobrir que faltava algo.

### 6. Acompanhamento
Uma linha por curso com a contagem em cada estado: não iniciados, em elaboração, aguardando, devolvidos, aprovados. Barra de proporção simples ao lado.

A informação que a coordenação realmente quer é **quem não entregou** — deixe essa contagem clicável, levando à lista de nomes.

### 7. Arquivo
Navegação em três níveis: Ano › Semestre › Curso, com trilha de navegação no topo. Visualmente parece pasta, mas é filtro — o usuário não precisa saber disso.

### 8. Administração
Telas de cadastro de cursos, usuários, vínculos e períodos letivos. Densidade alta, tabelas compactas: quem usa é a secretaria acadêmica, que faz isso com frequência e prefere ver muito de uma vez.

A tela de vínculos é a mais delicada: precisa deixar claro que **um docente pode estar em vários cursos e um coordenador pode responder por vários cursos**. Mostre os dois lados da relação.

---

## Estados que costumam ser esquecidos

**Vazio.** "Nenhum relatório aguardando avaliação" é um convite, não um lamento. Diga o que existe para fazer em seguida.

**Sem acesso.** Usuário autenticou na Microsoft mas não está cadastrado. Explique em uma frase o que aconteceu e o que fazer, sem jargão e sem culpar o usuário.

**Fora do prazo.** O período fechou. Mostre a data em que fechou e deixe a consulta ao histórico disponível.

**Carregando.** Esqueleto de conteúdo, não giro de spinner.

**Erro.** Diga o que houve e como resolver. Erros não pedem desculpa e nunca são vagos.

---

## Texto na interface

- **Voz ativa, e o botão diz o que acontece.** "Enviar para avaliação", não "Submeter". O nome se mantém em todo o fluxo: se o botão diz "Enviar para avaliação", a confirmação diz "Enviado para avaliação".
- **Vocabulário do usuário, não do banco de dados.** "Devolvido para ajuste", não "status DEVOLVIDO". "Horas atividades", não "carga horária total do registro".
- **Frase curta, sem enfeite.** O usuário está com pressa e cumprindo obrigação.

---

## Piso de qualidade

- Responsivo de verdade até 360px de largura — o fluxo inteiro precisa funcionar no celular
- Alvos de toque com no mínimo 44px
- Foco de teclado visível em tudo que é interativo
- Contraste mínimo AA
- `prefers-reduced-motion` respeitado
- Rótulo associado a cada campo de formulário; nunca use apenas placeholder como rótulo

---

## O que não fazer

- Nada de dashboard com cartões de métrica e gradiente. Isto é uma obrigação semestral, não um produto de análise de dados.
- Nada de esconder a trilha de auditoria atrás de aba ou modal.
- Nada de modal para adicionar item de atividade.
- Nada de ícone sem rótulo em ação destrutiva ou irreversível.
- Nada de cor como único indicador de estado.
