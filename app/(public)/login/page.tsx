import { classeBotaoPrimario } from "../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../components/BotaoSecundario";
import { classeCampo } from "../../../components/Campo";
import { CartaoPublico } from "../../../components/CartaoPublico";
import { MarcaInstitucional } from "../../../components/MarcaInstitucional";
import { LinkTexto } from "../../../components/LinkTexto";
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

        <div className="relative">
          <MarcaInstitucional tom="claro" tamanho="lg" />
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
        <CartaoPublico
          marcaSoNoCelular
          sobretitulo="SRHA · Acesso institucional"
          titulo="Relatório de Horas Atividades"
          descricao={
            <>
              Entre com o e-mail <span className="font-mono font-medium text-tinta">@baraodemaua.br</span>. Não
              existe senha própria neste sistema.
            </>
          }
        >

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
          {/* Para quem recebeu o papel e não tem conta no sistema. A linha
              tem 44px de altura para o link ser alvo de toque inteiro. */}
          <p className="flex min-h-11 flex-wrap items-center gap-x-1.5 text-[13px] text-tinta-suave">
            Recebeu um relatório impresso?
            <LinkTexto href="/validar" className="inline-flex min-h-11 items-center">
              Validar documento
            </LinkTexto>
          </p>

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
        </CartaoPublico>
      </section>
    </main>
  );
}
