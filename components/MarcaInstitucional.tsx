import Image from "next/image";
import { classeSuperficie } from "./Cartao";

const tamanhos = {
  sm: { caixa: "h-11 w-11 rounded-xl p-1.5", pixels: 32 },
  md: { caixa: "h-12 w-12 rounded-xl p-2", pixels: 36 },
  lg: { caixa: "h-16 w-16 rounded-2xl p-2.5", pixels: 48 },
};

// O logo numa caixa branca. Decorativo: quem usa põe o nome por extenso ao
// lado (MarcaInstitucional) ou no aria-label do link.
export function LogoInstitucional({ tamanho }: { tamanho: keyof typeof tamanhos }) {
  const { caixa, pixels } = tamanhos[tamanho];
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center ${classeSuperficie} ${caixa}`}
    >
      <Image src="/logo-barao.png" alt="" width={pixels} height={pixels} className="h-full w-full object-contain" />
    </span>
  );
}

// Logo, nome da instituição e do sistema. "claro" é para o painel em
// gradiente do login; "escuro", para o papel.
export function MarcaInstitucional({
  tom = "escuro",
  tamanho = "md",
}: {
  tom?: "claro" | "escuro";
  tamanho?: keyof typeof tamanhos;
}) {
  const claro = tom === "claro";
  return (
    <div className="flex items-center gap-3.5">
      <LogoInstitucional tamanho={tamanho} />
      <div>
        <p className={`font-bold leading-tight ${claro ? "text-lg text-white" : "text-[15px] text-tinta"}`}>
          Centro Universitário Barão de Mauá
        </p>
        <p
          className={`mt-1 text-xs font-semibold tracking-[0.14em] uppercase ${claro ? "text-white/80" : "text-tinta-suave"}`}
        >
          Horas Atividades
        </p>
      </div>
    </div>
  );
}
