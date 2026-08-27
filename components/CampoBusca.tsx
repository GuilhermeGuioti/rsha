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
    <>
      <label htmlFor={id} className="sr-only">{rotuloAcessivel}</label>
      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-md border border-borda bg-superficie px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo sm:w-80"
      />
    </>
  );
}
