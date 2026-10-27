export function CampoCheckbox({
  id,
  rotulo,
  checked,
  onChange,
  className,
}: {
  id: string;
  rotulo: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={`flex min-h-11 items-center gap-3 ${className ?? ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        className="h-5 w-5 rounded accent-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
      />
      <span className="text-[15px]">{rotulo}</span>
    </label>
  );
}
