// src/pages/WinnerGoodies.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getProject, getProjectHistory } from "../api/projects";

const fmt = (n) => (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Gera uma imagem social simples (canvas) com título, meta e um selo “Winner” */
function SocialPreview({ title, goal, unitLabel }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    const ctx = c.getContext("2d");

    // fundo
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fillRect(0,0,c.width,c.height);

    // faixa
    ctx.fillStyle = "#14b8a6"; // teal-500
    ctx.fillRect(0, 480, c.width, 150);

    // textos
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("PlanWriter Winner!", 60, 140);

    ctx.font = "bold 48px system-ui, -apple-system, Segoe UI, Roboto";
    const t = (title || "Projeto vencedor").slice(0, 36);
    ctx.fillText(t, 60, 230);

    ctx.font = "32px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(`Meta alcançada: ${fmt(goal)} ${unitLabel}`, 60, 300);

    // selo simples
    ctx.beginPath();
    ctx.arc(1020, 180, 110, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e"; // green-500
    ctx.fill();
    ctx.fillStyle = "#0b1020";
    ctx.font = "bold 60px system-ui";
    ctx.fillText("WIN", 960, 170);
    ctx.fillText("NER", 960, 230);

    setUrl(c.toDataURL("image/png"));
  }, [title, goal, unitLabel]);

  if (!url) return null;
  return (
    <div className="space-y-2">
      <img src={url} alt="Social preview" className="w-full rounded-lg border border-black/10 dark:border-white/10" />
      <a className="btn-primary inline-block" href={url} download="planwriter-winner.png">Baixar imagem</a>
    </div>
  );
}

export default function WinnerGoodies() {
  const q = useQuery();
  const navigate = useNavigate();
  const projectId = q.get("projectId");

  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const unit = useMemo(() => {
    const u = project?.goalUnit ?? project?.GoalUnit;
    if (typeof u === "string") return u;
    if (typeof u === "number") return u === 1 ? "Minutes" : u === 2 ? "Pages" : "Words";
    return "Words";
  }, [project]);

  const unitLabel = unit === "Minutes" ? "min" : unit === "Pages" ? "páginas" : "palavras";
  const goal = Number(project?.goalAmount ?? project?.GoalAmount ?? project?.wordCountGoal ?? 0) || 0;

  useEffect(() => {
    (async () => {
      if (!projectId) { setLoading(false); return; }
      try {
        const [p, h] = await Promise.all([
          getProject(projectId),
          getProjectHistory(projectId)
        ]);
        setProject(p);
        setHistory(Array.isArray(h) ? h : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const total = useMemo(() => {
    const map = new Map();
    history.forEach(h => {
      const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
      const key = startOfDay(d).toISOString().slice(0,10);
      const add =
        unit === "Minutes" ? Number(h.minutes ?? h.Minutes ?? 0)
      : unit === "Pages"   ? Number(h.pages ?? h.Pages ?? 0)
      : Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0);
      map.set(key, (map.get(key) || 0) + add);
    });
    let sum = 0;
    for (const v of map.values()) sum += v;
    return sum;
  }, [history, unit]);

  const won = goal > 0 && total >= goal;

  if (loading) return <div className="p-4">Carregando…</div>;
  if (!projectId) {
    return (
      <div className="container container--wide py-6">
        <section className="panel section-panel">
          <h2 className="section-title">Winner goodies</h2>
          <p className="meta">Passe um <b>projectId</b> na URL, por ex.: <code>/goodies?projectId=...</code></p>
        </section>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="container container--wide">
        <section className="panel section-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Winner goodies</h2>
              <p className="meta">
                Projeto: <b>{project?.title ?? "Projeto"}</b> — Meta: <b>{fmt(goal)} {unitLabel}</b> — Total: <b>{fmt(total)} {unitLabel}</b>
              </p>
              {!won && (
                <div className="mt-2 text-amber-700 dark:text-amber-400">
                  Você ainda não alcançou a meta. Conclua para liberar os goodies!
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button className="button" onClick={() => navigate(`/projects/${projectId}`)}>Voltar ao projeto</button>
            </div>
          </div>
        </section>
      </div>

      {/* Seções de conteúdo estático */}
      <div className="container container--wide">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Certificado */}
          <section className="panel">
            <h3 className="text-base font-semibold mb-1">Certificado</h3>
            <p className="text-sm text-muted mb-3">
              Gere seu certificado oficial com nome e projeto.
            </p>
            <button
              className="btn-primary w-full"
              disabled={!won}
              onClick={() => navigate(`/certificate?projectId=${projectId}`)}
              title={won ? "Abrir certificado" : "Conclua a meta para liberar"}
            >
              {won ? "Ver certificado" : "Bloqueado até concluir"}
            </button>
          </section>

          {/* Badge para perfil / site */}
          <section className="panel">
            <h3 className="text-base font-semibold mb-1">Badge de vencedor</h3>
            <p className="text-sm text-muted mb-3">
              Baixe o selo para usar nas redes, site ou avatar.
            </p>
            <div className="flex items-center gap-3">
              <div className="text-5xl">🏆</div>
              <div className="text-sm">
                <div><b>PlanWriter Winner</b></div>
                <div>PNG transparente em alta resolução</div>
              </div>
            </div>
            <div className="mt-3">
              <a
                className="btn-primary"
                href="/goodies/winner-badge.png"
                download
                onClick={(e) => { if (!won) e.preventDefault(); }}
                title={won ? "Baixar badge" : "Conclua a meta para liberar"}
              >
                {won ? "Baixar badge" : "Bloqueado"}
              </a>
            </div>
          </section>

          {/* Imagem social */}
          <section className="panel">
            <h3 className="text-base font-semibold mb-1">Imagem para compartilhar</h3>
            <p className="text-sm text-muted mb-3">
              Geramos uma imagem pronta para X/Instagram/LinkedIn.
            </p>
            {won ? (
              <SocialPreview title={project?.title} goal={goal} unitLabel={unitLabel} />
            ) : (
              <div className="text-sm text-muted">Disponível após concluir a meta.</div>
            )}
          </section>
        </div>

        {/* Extras estáticos simples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <section className="panel">
            <h3 className="text-base font-semibold mb-1">Banner para impressão</h3>
            <p className="text-sm text-muted mb-3">Um PDF simples com “Winner!” para sua parede.</p>
            <a
              className="btn-primary"
              href="/goodies/winner-banner.pdf"
              download
              onClick={(e) => { if (!won) e.preventDefault(); }}
              title={won ? "Baixar banner" : "Conclua a meta para liberar"}
            >
              {won ? "Baixar banner (PDF)" : "Bloqueado"}
            </a>
          </section>

          <section className="panel">
            <h3 className="text-base font-semibold mb-1">Textos sugeridos</h3>
            <p className="text-sm text-muted mb-3">Copie e cole nas redes:</p>
            <div className="rounded-md bg-black/5 dark:bg-white/10 p-3 text-sm space-y-2">
              <div>
                <b>PT-BR</b><br />
                Concluí minha meta no PlanWriter! {fmt(goal)} {unitLabel} — foco, consistência e ritmo. #PlanWriter #Winner
              </div>
              <div>
                <b>EN</b><br />
                I hit my PlanWriter goal! {fmt(goal)} {unitLabel}. #PlanWriter #Winner
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
