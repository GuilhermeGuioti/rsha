# SRHA — Modelo Entidade-Relacionamento (MER)

Derivado de `prisma/schema.prisma`. Diagrama em `docs/SRHA-DER.pdf` (notação Chen —
entidades em retângulo, atributos em elipse, relacionamentos em losango com
cardinalidade).

---

## Usuario

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `nome` | `String` | obrigatório |
| `email` | `String` | único |
| `entraOid` | `String?` | único, opcional |
| `ativo` | `Boolean` | default `true` |
| `criadoEm` | `DateTime` | default `now()` |

## UsuarioPerfil

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `usuarioId` | `Int` | FK → `Usuario.id` |
| `perfil` | `Perfil` (enum) | `DOCENTE`, `COORDENADOR`, `SECRETARIA` |

Único: `(usuarioId, perfil)`.

## Curso

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `nome` | `String` | único |
| `ativo` | `Boolean` | default `true` |

## PeriodoLetivo

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `ano` | `Int` | obrigatório |
| `semestre` | `Int` | obrigatório |
| `aberturaSubmissao` | `DateTime` | obrigatório |
| `encerramentoSubmissao` | `DateTime` | obrigatório |

Único: `(ano, semestre)`.

## VinculoDocenteCurso

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `docenteId` | `Int` | FK → `Usuario.id` |
| `cursoId` | `Int` | FK → `Curso.id` |
| `periodoLetivoId` | `Int` | FK → `PeriodoLetivo.id` |

Único: `(docenteId, cursoId, periodoLetivoId)`.

## VinculoCoordenadorCurso

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `coordenadorId` | `Int` | FK → `Usuario.id` |
| `cursoId` | `Int` | FK → `Curso.id` |

Único: `(coordenadorId, cursoId)`.

## TipoAtividade

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `descricao` | `String` | único |
| `ativo` | `Boolean` | default `true` |

## Relatorio

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `docenteId` | `Int` | FK → `Usuario.id` |
| `cursoId` | `Int` | FK → `Curso.id` |
| `periodoLetivoId` | `Int` | FK → `PeriodoLetivo.id` |
| `situacao` | `SituacaoRelatorio` (enum) | default `RASCUNHO`; `AGUARDANDO_AVALIACAO`, `DEVOLVIDO_PARA_AJUSTE`, `APROVADO` |
| `cargaHorariaTotal` | `Decimal(6,2)` | default `0`; soma de `ItemAtividade.horas` |
| `criadoEm` | `DateTime` | default `now()` |
| `atualizadoEm` | `DateTime` | auto-atualizado |

Único: `(docenteId, cursoId, periodoLetivoId)`. Índice: `(situacao, cursoId)`.

## ItemAtividade

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `relatorioId` | `Int` | FK → `Relatorio.id`, `onDelete: Cascade` |
| `tipoAtividadeId` | `Int` | FK → `TipoAtividade.id` |
| `horas` | `Decimal(5,2)` | obrigatório |
| `diaSemana` | `DiaSemana` (enum) | `SEGUNDA` … `SABADO` |
| `horario` | `String` | obrigatório |
| `descricao` | `String` | obrigatório |

## EventoAuditoria

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `relatorioId` | `Int` | FK → `Relatorio.id` |
| `tipo` | `TipoEvento` (enum) | `CRIACAO`, `SUBMISSAO`, `APROVACAO`, `DEVOLUCAO` |
| `usuarioId` | `Int` | FK → `Usuario.id` |
| `ocorridoEm` | `DateTime` | default `now()` |
| `justificativa` | `String?` | opcional; obrigatória na aplicação quando `tipo = DEVOLUCAO` |

Índice: `(relatorioId, ocorridoEm)`.

---

## Relacionamentos (1:N)

| De | Para | Papel |
|---|---|---|
| Usuario | UsuarioPerfil | um usuário acumula vários perfis |
| Usuario | VinculoDocenteCurso | docente |
| Usuario | VinculoCoordenadorCurso | coordenador |
| Usuario | Relatorio | autor |
| Usuario | EventoAuditoria | ator que praticou o evento |
| Curso | VinculoDocenteCurso | — |
| Curso | VinculoCoordenadorCurso | — |
| Curso | Relatorio | — |
| PeriodoLetivo | VinculoDocenteCurso | — |
| PeriodoLetivo | Relatorio | — |
| TipoAtividade | ItemAtividade | classifica |
| Relatorio | ItemAtividade | contém |
| Relatorio | EventoAuditoria | gera |

`Usuario` × `Curso` é N:N nos dois papéis (docência e coordenação), cada um resolvido
por uma tabela associativa própria — `VinculoDocenteCurso` (datada por
`PeriodoLetivo`) e `VinculoCoordenadorCurso` (não datada).
