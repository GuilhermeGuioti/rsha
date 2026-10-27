import type { ReactNode } from "react";

type PropsIcone = { className?: string };

// Traço único em todos os ícones: mesma espessura e cantos, para conviverem
// lado a lado na barra, nos atalhos e nas ações de tabela.
function Icone({ className, espessura = 1.6, children }: PropsIcone & { espessura?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconeEditar({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <path d="M4 20L6 15L17 4L19 6L8 17Z" />
    </Icone>
  );
}

export function IconeChevron({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={2}>
      <path d="M9 5l7 7-7 7" />
    </Icone>
  );
}

export function IconeRemover({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <line x1="5" y1="7" x2="19" y2="7" />
      <path d="M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Icone>
  );
}

export function IconeMais({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={2}>
      <path d="M12 5v14M5 12h14" />
    </Icone>
  );
}

export function IconeBusca({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={1.8}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Icone>
  );
}

export function IconeFechar({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={1.8}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icone>
  );
}

export function IconeSair({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={1.8}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </Icone>
  );
}

export function IconeRelogio({ className }: PropsIcone) {
  return (
    <Icone className={className} espessura={1.8}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icone>
  );
}

export function IconeDocumento({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icone>
  );
}

export function IconeCursos({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <path d="M3 9l9-4.5L21 9l-9 4.5z" />
      <path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11M21 9v5" />
    </Icone>
  );
}

export function IconeUsuarios({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.8 3.1 2.6 3.5 5.2" />
    </Icone>
  );
}

export function IconeVinculos({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Icone>
  );
}

export function IconeCalendario({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icone>
  );
}

export function IconeAcompanhamento({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icone>
  );
}

export function IconeArquivo({ className }: PropsIcone) {
  return (
    <Icone className={className}>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
    </Icone>
  );
}
