-- Relatório aprovado e evento de auditoria não sofrem update nem delete
-- (RNF09, retenção de cinco anos). O workflow já recusa essas operações; aqui
-- quem recusa é o banco, inclusive para quem acessar o Postgres sem passar
-- pela aplicação. TRUNCATE não dispara trigger de linha — a limpeza dos
-- testes e o "docker compose down -v" continuam funcionando.

-- Evento de auditoria: só INSERT.
CREATE FUNCTION "srha_recusar_alteracao_evento"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Evento de auditoria é imutável (RNF09).';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "EventoAuditoria_imutavel"
BEFORE UPDATE OR DELETE ON "EventoAuditoria"
FOR EACH ROW EXECUTE FUNCTION "srha_recusar_alteracao_evento"();

-- Relatório: a aprovação em si é um UPDATE vindo de AGUARDANDO_AVALIACAO e
-- passa; depois que a linha está APROVADO, nada mais a altera ou remove.
CREATE FUNCTION "srha_proteger_relatorio_aprovado"() RETURNS trigger AS $$
BEGIN
  IF OLD."situacao" = 'APROVADO' THEN
    RAISE EXCEPTION 'Relatório aprovado é imutável (RNF09).';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Relatorio_aprovado_imutavel"
BEFORE UPDATE OR DELETE ON "Relatorio"
FOR EACH ROW EXECUTE FUNCTION "srha_proteger_relatorio_aprovado"();

-- Itens: o conteúdo declarado faz parte do relatório aprovado. Bloqueia
-- incluir, alterar ou remover item de relatório APROVADO — dos dois lados de
-- um UPDATE que troque o item de relatório.
CREATE FUNCTION "srha_proteger_itens_de_aprovado"() RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF EXISTS (SELECT 1 FROM "Relatorio" WHERE "id" = OLD."relatorioId" AND "situacao" = 'APROVADO') THEN
      RAISE EXCEPTION 'Itens de relatório aprovado são imutáveis (RNF09).';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF EXISTS (SELECT 1 FROM "Relatorio" WHERE "id" = NEW."relatorioId" AND "situacao" = 'APROVADO') THEN
      RAISE EXCEPTION 'Itens de relatório aprovado são imutáveis (RNF09).';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ItemAtividade_de_aprovado_imutavel"
BEFORE INSERT OR UPDATE OR DELETE ON "ItemAtividade"
FOR EACH ROW EXECUTE FUNCTION "srha_proteger_itens_de_aprovado"();
