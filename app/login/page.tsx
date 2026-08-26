import { acaoEntrar, acaoEntrarComEmail } from "./acoes";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-papel px-4 py-10 sm:px-6">
      <div className="w-full max-w-[1180px] overflow-hidden rounded-[10px] border border-borda bg-superficie shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="relative flex flex-col justify-between gap-10 overflow-hidden bg-azul-institucional px-8 py-9 text-white sm:px-11 sm:py-11">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-acento opacity-30"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-28 right-14 h-56 w-56 rounded-full bg-white opacity-10"
            />
            <div className="relative flex flex-col gap-5">
              <div
                aria-hidden
                className="flex h-28 w-28 items-center justify-center rounded-[10px] border-2 border-dashed border-white/40 text-center text-xs font-medium leading-tight text-white/70"
              >
                Brasão da instituição
              </div>
              <div>
                <p className="font-serif text-[22px] font-semibold leading-snug">
                  Centro Universitário
                  <br />
                  Barão de Mauá
                </p>
                <div className="mt-3 h-1 w-11 bg-acento" />
              </div>
            </div>
            <p className="relative max-w-[280px] text-sm leading-relaxed text-white/90">
              Sistema institucional de registro e avaliação das horas atividades docentes.
            </p>
          </div>

          <div className="flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-12">
            <p className="font-mono text-xs font-medium tracking-[0.16em] text-acento">
              SRHA · ACESSO INSTITUCIONAL
            </p>
            <h1 className="mt-4 font-serif text-[28px] font-semibold leading-tight text-azul-interativo">
              Relatório de Horas Atividades
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
              Entre com o e-mail{" "}
              <span className="font-mono font-medium text-tinta">@baraodemaua.br</span>. Não
              existe senha própria neste sistema.
            </p>

            <form action={acaoEntrar}>
              <button
                type="submit"
                className="mt-7 flex min-h-[52px] items-center justify-center rounded-md border border-azul-institucional bg-azul-institucional px-6 font-medium text-white transition-colors hover:bg-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
              >
                Entrar com a conta institucional
              </button>
            </form>

            <div className="mt-7 border-t border-borda pt-6">
              <p className="text-sm font-medium text-tinta-suave">
                Seu perfil é definido pelo vínculo cadastrado
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-2 rounded-full border border-[#b7dff3] bg-[#e9f6fc] px-3 py-1.5 text-sm font-medium text-azul-interativo">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-azul-institucional" />
                  Docente
                </span>
                <span className="flex items-center gap-2 rounded-full border border-[#a9e6db] bg-[#e7f8f5] px-3 py-1.5 text-sm font-medium text-[#00806b]">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-acento" />
                  Coordenação
                </span>
                <span className="flex items-center gap-2 rounded-full border border-borda bg-[#f3f5f8] px-3 py-1.5 text-sm font-medium text-tinta-suave">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-estado-rascunho" />
                  Secretaria
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm text-tinta-suave">
              Sem acesso? Procure a coordenação do seu curso.
            </p>

            {process.env.NODE_ENV === "development" && (
              <form
                action={acaoEntrarComEmail}
                className="mt-6 flex flex-col gap-2 border-t border-dashed border-borda pt-6 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <label htmlFor="email-dev" className="block text-xs font-medium text-tinta-suave">
                    Dev · entrar com outro e-mail cadastrado
                  </label>
                  <input
                    id="email-dev"
                    name="email"
                    type="email"
                    required
                    className="mt-1.5 flex min-h-[44px] w-full rounded-md border border-borda bg-superficie px-3 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
                  />
                </div>
                <button
                  type="submit"
                  className="flex min-h-[44px] items-center justify-center rounded-md border border-borda bg-[#f3f5f8] px-4 text-sm font-medium text-tinta transition-colors hover:bg-[#e9ecf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
                >
                  Entrar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
