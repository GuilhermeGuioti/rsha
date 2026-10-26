"use client";

import { useId, type ChangeEvent } from "react";
import { classeBotaoSecundario } from "./BotaoSecundario";

// Input nativo escondido atrás do rótulo com cara de botão; o anel de foco vai
// no rótulo, já que é o input que recebe o foco.
export function SeletorArquivo({
  rotulo,
  accept,
  arquivo,
  onSelecionar,
}: {
  rotulo: string;
  accept: string;
  arquivo: File | null;
  onSelecionar: (arquivo: File | null) => void;
}) {
  const id = useId();

  function selecionar(evento: ChangeEvent<HTMLInputElement>) {
    onSelecionar(evento.target.files?.[0] ?? null);
    // Sem isto, escolher de novo o mesmo arquivo depois de corrigi-lo não
    // dispara onChange.
    evento.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor={id}
        className={`${classeBotaoSecundario} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul-interativo`}
      >
        {rotulo}
        <input id={id} type="file" accept={accept} onChange={selecionar} className="sr-only" />
      </label>
      <span className="min-w-0 break-all font-mono text-[13px] text-tinta-suave">
        {arquivo ? arquivo.name : "Nenhum arquivo selecionado"}
      </span>
    </div>
  );
}
