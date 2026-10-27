import { IconeBusca } from "./Icones";

export function CampoBusca({
  id,
  rotuloAcessivel,
  placeholder,
  valor,
  onChange,
}: {
  id: string;
  rotuloAcessivel: string;
  placeholder: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="relative flex w-full sm:w-80">
      <label htmlFor={id} className="sr-only">{rotuloAcessivel}</label>
      <IconeBusca className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-tinta-suave" />
      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-borda-campo bg-superficie pr-3 pl-10 text-[15px] shadow-cartao transition-colors placeholder:text-tinta-suave focus-visible:border-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
      />
    </div>
  );
}
