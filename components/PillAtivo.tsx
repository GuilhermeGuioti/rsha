import { Pill } from "./Pill";

// Situação de cadastro (curso, usuário): inativar, nunca excluir.
export function PillAtivo({ ativo }: { ativo: boolean }) {
  return <Pill cor={ativo ? "aprovado" : "neutro"}>{ativo ? "Ativo" : "Inativo"}</Pill>;
}
