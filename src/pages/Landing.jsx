import { useState } from "react";
import LoginModal from "../components/LoginModal";

export default function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* HERO */}
      <header className="hero">
        <div className="container hero-inner">
          <h1 className="text-3xl md:text-4xl font-semibold">PlanWriter</h1>
          <p className="mt-3 max-w-3xl">
            Foco, consistência e ritmo para seu livro. Defina metas, acompanhe seu progresso com estatísticas claras
            e desbloqueie conquistas — tudo em uma interface simples e agradável.
          </p>
          <div className="mt-4">
            <button className="btn-primary" onClick={() => setOpen(true)}>Começar agora</button>
          </div>
        </div>
      </header>

      {/* BENEFÍCIOS + DESTAQUES */}
      <main className="flex-grow">
        <div className="container grid">
          <section className="panel">
            <h2>Por que usar o PlanWriter?</h2>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Defina metas de palavras por projeto (NaNoWriMo-style).</li>
              <li>Registre sessões e visualize estatísticas diárias, semanais e mensais.</li>
              <li>Conquistas (badges) para manter a motivação e celebrar marcos.</li>
              <li>Interface responsiva, leve e agradável para longas jornadas de escrita.</li>
            </ul>
            <div className="mt-4">
              <button className="button" onClick={() => setOpen(true)}>Entrar para começar</button>
            </div>
          </section>

          <aside className="panel">
            <h2>Destaques</h2>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>📈 <strong>Estatísticas detalhadas</strong>: melhor dia, média/dia e sequência de escrita.</p>
              <p>🧭 <strong>Organização por projetos e gêneros</strong>: cada livro com sua meta.</p>
              <p>🏅 <strong>Conquistas</strong>: complete metas, ganhe badges e mantenha o ritmo.</p>
              <p>☁️ <strong>Experiência limpa</strong>: escrita em primeiro lugar, sem distrações.</p>
            </div>
          </aside>
        </div>

        {/* COMO FUNCIONA + PRINTS (placeholder) */}
        <div className="container grid">
          <section className="panel">
            <h2>Como funciona</h2>
            <ol className="list-decimal pl-6 space-y-2 mt-3">
              <li>Crie um projeto com sua meta de palavras.</li>
              <li>Registre suas sessões de escrita — com data, palavras e notas.</li>
              <li>Acompanhe seu progresso e desbloqueie conquistas.</li>
            </ol>
            <div className="mt-4">
              <button className="btn-primary" onClick={() => setOpen(true)}>Fazer login</button>
            </div>
          </section>

          <aside className="panel">
            <h2>Depoimentos</h2>
            <div className="mt-3 space-y-3 text-sm">
              <blockquote>
                “Finalmente bati minha meta mensal! O gráfico e as badges me mantiveram no ritmo.”
                <div className="text-muted mt-1">— Ana, autora independente</div>
              </blockquote>
              <blockquote>
                “Perfeito para NaNoWriMo e para escrever o resto do ano. Simples e direto.”
                <div className="text-muted mt-1">— Rafael, roteirista</div>
              </blockquote>
            </div>
          </aside>
        </div>

        {/* FAQ */}
        <div className="container">
          <section className="panel">
            <h2>Perguntas frequentes</h2>
            <div className="mt-3 space-y-3 text-sm">
              <details>
                <summary>Preciso criar conta?</summary>
                <p>Sim, faça login para salvar seus projetos e progresso com segurança.</p>
              </details>
              <details>
                <summary>Posso editar metas depois?</summary>
                <p>Sim, você pode ajustar metas e prazos a qualquer momento.</p>
              </details>
              <details>
                <summary>Funciona no celular?</summary>
                <p>Sim, a interface se adapta a telas menores para você registrar de qualquer lugar.</p>
              </details>
            </div>
          </section>
        </div>
      </main>

      <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} PlanWriter
      </footer>

      <LoginModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
