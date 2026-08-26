-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('DOCENTE', 'COORDENADOR', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "SituacaoRelatorio" AS ENUM ('RASCUNHO', 'AGUARDANDO_AVALIACAO', 'DEVOLVIDO_PARA_AJUSTE', 'APROVADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CRIACAO', 'SUBMISSAO', 'APROVACAO', 'DEVOLUCAO');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "entraOid" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioPerfil" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "perfil" "Perfil" NOT NULL,

    CONSTRAINT "UsuarioPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avaliadorAlternativoId" INTEGER,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoLetivo" (
    "id" SERIAL NOT NULL,
    "ano" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "aberturaSubmissao" TIMESTAMP(3) NOT NULL,
    "encerramentoSubmissao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoLetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinculoDocenteCurso" (
    "id" SERIAL NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "periodoLetivoId" INTEGER NOT NULL,

    CONSTRAINT "VinculoDocenteCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinculoCoordenadorCurso" (
    "id" SERIAL NOT NULL,
    "coordenadorId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,

    CONSTRAINT "VinculoCoordenadorCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAtividade" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relatorio" (
    "id" SERIAL NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "periodoLetivoId" INTEGER NOT NULL,
    "situacao" "SituacaoRelatorio" NOT NULL DEFAULT 'RASCUNHO',
    "cargaHorariaTotal" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAtividade" (
    "id" SERIAL NOT NULL,
    "relatorioId" INTEGER NOT NULL,
    "tipoAtividadeId" INTEGER NOT NULL,
    "horas" DECIMAL(5,2) NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horario" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "ItemAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAuditoria" (
    "id" SERIAL NOT NULL,
    "relatorioId" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justificativa" TEXT,

    CONSTRAINT "EventoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_entraOid_key" ON "Usuario"("entraOid");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPerfil_usuarioId_perfil_key" ON "UsuarioPerfil"("usuarioId", "perfil");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_nome_key" ON "Curso"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoLetivo_ano_semestre_key" ON "PeriodoLetivo"("ano", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "VinculoDocenteCurso_docenteId_cursoId_periodoLetivoId_key" ON "VinculoDocenteCurso"("docenteId", "cursoId", "periodoLetivoId");

-- CreateIndex
CREATE UNIQUE INDEX "VinculoCoordenadorCurso_coordenadorId_cursoId_key" ON "VinculoCoordenadorCurso"("coordenadorId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAtividade_descricao_key" ON "TipoAtividade"("descricao");

-- CreateIndex
CREATE INDEX "Relatorio_situacao_cursoId_idx" ON "Relatorio"("situacao", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Relatorio_docenteId_cursoId_periodoLetivoId_key" ON "Relatorio"("docenteId", "cursoId", "periodoLetivoId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_relatorioId_ocorridoEm_idx" ON "EventoAuditoria"("relatorioId", "ocorridoEm");

-- AddForeignKey
ALTER TABLE "UsuarioPerfil" ADD CONSTRAINT "UsuarioPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_avaliadorAlternativoId_fkey" FOREIGN KEY ("avaliadorAlternativoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDocenteCurso" ADD CONSTRAINT "VinculoDocenteCurso_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDocenteCurso" ADD CONSTRAINT "VinculoDocenteCurso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDocenteCurso" ADD CONSTRAINT "VinculoDocenteCurso_periodoLetivoId_fkey" FOREIGN KEY ("periodoLetivoId") REFERENCES "PeriodoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoCoordenadorCurso" ADD CONSTRAINT "VinculoCoordenadorCurso_coordenadorId_fkey" FOREIGN KEY ("coordenadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoCoordenadorCurso" ADD CONSTRAINT "VinculoCoordenadorCurso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_periodoLetivoId_fkey" FOREIGN KEY ("periodoLetivoId") REFERENCES "PeriodoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAtividade" ADD CONSTRAINT "ItemAtividade_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "Relatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAtividade" ADD CONSTRAINT "ItemAtividade_tipoAtividadeId_fkey" FOREIGN KEY ("tipoAtividadeId") REFERENCES "TipoAtividade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAuditoria" ADD CONSTRAINT "EventoAuditoria_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "Relatorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAuditoria" ADD CONSTRAINT "EventoAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
