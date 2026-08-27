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
    <label htmlFor={id} className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        className="h-5 w-5 rounded border-borda focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
      />
      <span className="text-[15px]">{rotulo}</span>
    </label>
  );
}
