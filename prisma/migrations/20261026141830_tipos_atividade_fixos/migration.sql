-- Tipos de atividade são lista fixa (decisão de 2026-10-26): não há cadastro
-- na aplicação. Mudar a lista é migration nova — e tipo retirado é inativado,
-- não excluído, porque item de relatório aprovado continua apontando para ele.
INSERT INTO "TipoAtividade" ("descricao") VALUES
  ('Estágio Supervisionado'),
  ('Núcleo Docente Estruturante'),
  ('Orientação de TCC'),
  ('Orientação Didático-Pedagógica'),
  ('Prática Supervisionada'),
  ('Projetos de Extensão'),
  ('Projetos Especiais');
