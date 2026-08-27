import { Fragment, type Key, type ReactNode } from "react";
import { TabelaAdmin } from "./TabelaAdmin";
import { LinhaVazia } from "./LinhaVazia";

export type ColunaTabela<T> = {
  cabecalho: ReactNode;
  alinhado?: "direita";
  classeCelula?: string;
  largura?: string;
  render: (linha: T) => ReactNode;
};

export function Tabela<T>({
  colunas,
  linhas,
  chave,
  minWidthPx,
  vazio,
  linhaExtra,
}: {
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chave: (linha: T) => Key;
  minWidthPx: number;
  vazio: ReactNode;
  linhaExtra?: (linha: T) => ReactNode;
}) {
  const layoutFixo = colunas.some((coluna) => coluna.largura);

  return (
    <TabelaAdmin minWidthPx={minWidthPx} layoutFixo={layoutFixo}>
      <thead>
        <tr className="border-b border-borda text-[13px] text-tinta-suave">
          {colunas.map((coluna, indice) => (
            <th
              key={indice}
              scope="col"
              style={coluna.largura ? { width: coluna.largura } : undefined}
              className={`px-4 py-2.5 font-medium ${coluna.alinhado === "direita" ? "text-right" : ""}`}
            >
              {coluna.cabecalho}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.length === 0 && <LinhaVazia colSpan={colunas.length}>{vazio}</LinhaVazia>}
        {linhas.map((linha) => (
          <Fragment key={chave(linha)}>
            <tr className="border-b border-[#f0f3f6] last:border-0">
              {colunas.map((coluna, indice) => (
                <td
                  key={indice}
                  className={`px-4 py-3 ${coluna.alinhado === "direita" ? "text-right" : ""} ${coluna.classeCelula ?? ""}`}
                >
                  {coluna.render(linha)}
                </td>
              ))}
            </tr>
            {linhaExtra?.(linha)}
          </Fragment>
        ))}
      </tbody>
    </TabelaAdmin>
  );
}
