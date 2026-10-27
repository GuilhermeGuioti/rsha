import { classeCampoSelect } from "./Campo";

// Select de filtro numa barra de lista (período, tipo de atividade). O rótulo
// fica só para leitor de tela: a primeira opção já diz o que está filtrado.
export function SeletorFiltro({
  id,
  rotuloAcessivel,
  valor,
  onChange,
  opcoes,
}: {
  id: string;
  rotuloAcessivel: string;
  valor: string | number;
  onChange: (valor: string) => void;
  opcoes: { valor: string | number; rotulo: string }[];
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {rotuloAcessivel}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className={`${classeCampoSelect} shadow-cartao`}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </>
  );
}
