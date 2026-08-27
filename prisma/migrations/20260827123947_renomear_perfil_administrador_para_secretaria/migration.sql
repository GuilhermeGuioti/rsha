-- Renomeia o valor do enum Perfil (ADMINISTRADOR -> SECRETARIA) em vez de
-- recriar o tipo: RENAME VALUE preserva as linhas de UsuarioPerfil que já
-- usam o valor antigo, sem exigir CAST nem perder dado.
ALTER TYPE "Perfil" RENAME VALUE 'ADMINISTRADOR' TO 'SECRETARIA';
