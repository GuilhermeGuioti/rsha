import Image from "next/image";
import { classeBotaoPrimario } from "../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../components/BotaoSecundario";
import { classeCampo } from "../../../components/Campo";
import { MensagemErro } from "../../../components/MensagemErro";
import { Pill } from "../../../components/Pill";
import { acaoEntrar, acaoEntrarComEmail } from "./acoes";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const erro = searchParams.erro === "1";

  return (
    <main className="flex flex-1">
      {/* Painel da marca, como o do App do Dono. Só aparece do lg para cima —
          abaixo disso ele espremeria o cartão; a marca vai para o topo dele. */}
      <section className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-12 text-white [background-image:var(--gradiente-marca)] lg:flex">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/[.06]" />
        <div aria-hidden className="pointer-events-none absolute bottom-16 -left-16 h-60 w-60 rounded-full bg-white/[.05]" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-12 h-44 w-44 rounded-full bg-acento/25" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-white p-2.5 shadow-flutuante">
            <Image src="/logo-barao.png" alt="" width={48} height={48} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">Centro Universitário Barão de Mauá</p>
            <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Horas Atividades</p>
          </div>
        </div>

        {/* Sempre em três linhas: a caixa é medida em em (de 12em a 18em a
            frase cabe em três) e a fonte acompanha a largura do painel — 45vw
            menos o p-12 —, então a quebra não muda de uma tela para outra. */}
        <div className="relative">
          <p className="max-w-[14em] text-[clamp(26px,calc((45vw-96px)/14),44px)] font-bold leading-[1.2] tracking-tight">
            As horas atividades do semestre, declaradas e avaliadas em um só lugar.
          </p>
          <div className="mt-5 h-1 w-12 rounded-full bg-acento" />
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
            Cada curso tem seu relatório, cada decisão fica registrada com autor e horário.
          </p>
        </div>

        <p className="relative text-[13px] text-white/75">
          © {new Date().getFullYear()} Centro Universitário Barão de Mauá
        </p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center bg-papel px-4 py-10 sm:px-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-borda bg-superficie p-2.5 shadow-cartao">
            <Image src="/logo-barao.png" alt="" width={48} height={48} className="h-full w-full object-contain" />
          </div>
          <p className="text-[15px] font-bold leading-snug">Centro Universitário Barão de Mauá</p>
        </div>

        <div className="w-full max-w-[540px] rounded-3xl bg-superficie px-6 py-8 shadow-flutuante sm:px-10 sm:py-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-azul-interativo uppercase">
            SRHA · Acesso institucional
          </p>
          {/* Uma linha só a partir do sm: o cartão de 540px deixa 460px de
              conteúdo, e o título pede 389px. */}
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:whitespace-nowrap">
            Relatório de Horas Atividades
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
            Entre com o e-mail{" "}
            <span className="font-mono font-medium text-tinta">@baraodemaua.br</span>. Não
            existe senha própria neste sistema.
          </p>

          {erro && (
            <div className="mt-5">
              <MensagemErro>Não foi possível entrar com esse e-mail. Confira se está cadastrado e ativo.</MensagemErro>
            </div>
          )}

          <form action={acaoEntrar}>
            <button type="submit" className={`${classeBotaoPrimario} mt-7 min-h-[52px] w-full text-base`}>
              Entrar com a conta institucional
            </button>
          </form>

          <div className="mt-7 border-t border-borda pt-6">
            <p className="text-[13px] font-semibold text-tinta-suave">Seu perfil é definido pelo vínculo cadastrado</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill cor="interativo">Docente</Pill>
              <Pill cor="aprovado" forma="quadrado">Coordenação</Pill>
              <Pill cor="neutro" forma="circulo-vazado">Secretaria</Pill>
            </div>
          </div>

          <p className="mt-6 text-[13px] text-tinta-suave">Sem acesso? Procure a coordenação do seu curso.</p>

          {process.env.NODE_ENV === "development" && (
            <form
              action={acaoEntrarComEmail}
              className="mt-6 flex flex-col gap-2 rounded-2xl border border-dashed border-borda-campo bg-superficie-sutil p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor="email-dev" className="block text-[13px] font-semibold text-tinta-suave">
                  Dev · entrar com outro e-mail cadastrado
                </label>
                <input id="email-dev" name="email" type="email" required className={`${classeCampo} mt-1.5 w-full`} />
              </div>
              <BotaoSecundario type="submit">Entrar</BotaoSecundario>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
