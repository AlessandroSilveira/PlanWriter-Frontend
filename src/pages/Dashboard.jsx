// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, getProjectStats, getProjectHistory } from '../api/projects.js';
import EventProgressCard from "../components/EventProgressCard.jsx";
import ProjectComparisonChart from "../components/ProjectComparisonChart";
import WritingHeatmap from "../components/WritingHeatmap.jsx";
import TodayTargetCard from "../components/TodayTargetCard.jsx";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heat, setHeat] = useState({ loading: true, days: [], total: 0, streak: 0, today: 0 });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProjects();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0) {
          try {
            const s = await getProjectStats(data[0].id ?? data[0].projectId);
            setStats(s);
          } catch (err) {
            console.warn("Erro ao carregar estatísticas:", err);
          }
        }
      } else {
        setProjects([]);
      }
    } catch (e) {
      const is401 = e?.response?.status === 401;
      setError(is401 ? 'Sessão expirada. Faça login novamente.' : 'Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ===== Heatmap (últimos ~53*7 dias) somando todos os projetos =====
  useEffect(() => {
    if (!projects?.length) {
      setHeat({ loading: false, days: [], total: 0, streak: 0, today: 0 });
      return;
    }
    (async () => {
      setHeat((h) => ({ ...h, loading: true }));
      try {
        const end = new Date(); end.setHours(0, 0, 0, 0);
        const start = new Date(end); start.setDate(end.getDate() - 370);
        const map = new Map(); // "YYYY-MM-DD" -> total
        let total = 0;

        await Promise.all(
          projects.map(async (p) => {
            const pid = p.id ?? p.projectId;
            try {
              const hist = await getProjectHistory(pid);
              (hist || []).forEach((h) => {
                const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
                if (d < start || d > end) return;
                const key = d.toISOString().slice(0, 10);
                const add = Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0) || 0;
                if (add > 0) {
                  map.set(key, (map.get(key) || 0) + add);
                  total += add;
                }
              });
            } catch {
              /* ignora falhas individuais */
            }
          })
        );

        const weeks = 53;
        const totalDays = weeks * 7;
        const gridStart = new Date(end);
        gridStart.setDate(end.getDate() - (totalDays - 1));
        const days = [];
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(gridStart);
          d.setDate(gridStart.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, value: map.get(key) || 0 });
        }

        // streak a partir de hoje (dias consecutivos > 0)
        const todayKey = end.toISOString().slice(0, 10);
        let streak = 0;
        const probe = new Date(end);
        while (true) {
          const k = probe.toISOString().slice(0, 10);
          const v = map.get(k) || 0;
          if (v > 0) {
            streak++;
            probe.setDate(probe.getDate() - 1);
          } else break;
        }

        const today = map.get(todayKey) || 0;
        setHeat({ loading: false, days, total, streak, today });
      } catch (e) {
        setHeat({ loading: false, days: [], total: 0, streak: 0, today: 0 });
      }
    })();
  }, [projects]);

  if (loading) return <p>Carregando...</p>;

  // ===== Donut SVG centralizado =====
  const Ring = ({
    pct = 0,
    size = 120,
    stroke = 12,
    color = "#0f3a5f",
    track = "rgba(0,0,0,0.12)",
    label = "concluído",
  }) => {
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    const offset = C - (p / 100) * C;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 300ms ease" }}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="central"
          fontWeight="600" fontSize={Math.round(size * 0.22)} fill="currentColor"
        >
          {Math.round(p)}%
        </text>
        <text
          x="50%" y="50%" dy={Math.round(size * 0.18)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.round(size * 0.10)} fill="#6b7280"
        >
          {label}
        </text>
      </svg>
    );
  };

  const first = projects[0];
  const cur = Number(first?.currentWordCount ?? 0);
  const goalRaw = Number(first?.wordCountGoal ?? 0);
  const goalMath = Math.max(1, goalRaw);
  const progressPct = Math.min(100, Math.max(0, (cur / goalMath) * 100));

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="hero">
        <div className="container hero-inner">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Bem vindo de volta, Escritor.</h1>
            <Link to="/projects/new" className="btn-primary">+ Novo projeto</Link>
          </div>

          {error && (
            <div className="mt-2">
              <p className="text-red-600">{error}</p>
              {error.includes('Sessão expirada') && <Link to="/login" className="button mt-2">Ir para login</Link>}
            </div>
          )}

          {!error && stats && (
            <div className="summary">
              <div className="kpi">
                <div className="label">Total</div>
                <div className="value">{(stats.totalWords ?? 0).toLocaleString('pt-BR')}</div>
                <div className="hint">palavras</div>
              </div>
              <div className="kpi">
                <div className="label">Média/dia</div>
                <div className="value">{Math.round(stats.averagePerDay ?? 0)}</div>
                <div className="hint">últimos dias</div>
              </div>
              <div className="kpi">
                <div className="label">Melhor dia</div>
                <div className="value">{stats.bestDay?.words?.toLocaleString('pt-BR') ?? 0}</div>
                <div className="hint">
                  {stats.bestDay?.date ? new Date(stats.bestDay.date).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Sequência</div>
                <div className="value">{stats.activeDays ?? 0}</div>
                <div className="hint">dias consecutivos</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-grow dashboard-gap">
        <div className="container grid">
          <section className="panel">
            <h2>Seus projetos</h2>

            {!projects?.length ? (
              <div className="card card--lg text-center py-10 mt-3">
                <p className="meta">Você ainda não tem projetos.</p>
                <Link to="/projects/new" className="button">Criar primeiro projeto</Link>
              </div>
            ) : (
              <div className="proj-grid">
                {projects.map((p) => {
                  const pid = p.id ?? p.projectId;
                  const pCur = Number(p?.currentWordCount ?? 0);
                  const pGoalDisplay = Number(p?.wordCountGoal ?? 0);
                  const pGoalMath = Math.max(1, pGoalDisplay);
                  const pct = Math.min(100, Math.max(0, Math.round((pCur / pGoalMath) * 100)));

                  return (
                    <Link key={pid} to={`/projects/${pid}`} className="no-underline">
                      <div className="proj">
                        <div className="kicker">{p?.genre ?? 'Projeto'}</div>
                        <div className="title">{p.title ?? p.name}</div>
                        {p.description && <p className="meta">{p.description}</p>}
                        <p className="meta">
                          {pCur.toLocaleString('pt-BR')} /{" "}
                          {pGoalDisplay ? pGoalDisplay.toLocaleString('pt-BR') : 0} palavras
                        </p>
                        {pGoalDisplay ? (
                          <div className="progress">
                            <div className="fill" style={{ width: `${pct}%` }} />
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="panel">
            <h2>Meta do mês</h2>
            <p className="sub">Progresso no projeto selecionado</p>
            {first ? (
              <div className="upperkpi">
                <Ring pct={progressPct} size={128} stroke={14} label="concluído" />
                <div>
                  <div className="kpi">
                    <div className="label">Atual</div>
                    <div className="value">{cur.toLocaleString('pt-BR')}</div>
                    <div className="hint">palavras</div>
                  </div>
                  <div className="kpi kpi--lg">
                    <div className="label">Meta</div>
                    <div className="value">{goalRaw.toLocaleString('pt-BR')}</div>
                    <div className="hint">palavras</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted mt-2">Crie um projeto para acompanhar a meta.</div>
            )}
          </aside>
        </div>

        {/* Meta de hoje (prioriza evento; fallback projeto) */}
        {projects.length > 0 && (
          <div className="container mt-4">
            <TodayTargetCard project={first} />
          </div>
        )}

        {/* Card de Meta do Evento (NaNo/Camp/Custom) */}
        {projects.length > 0 && (
          <div className="container mt-4">
            <EventProgressCard projectId={first?.id ?? first?.projectId} />
          </div>
        )}

        {/* Heatmap anual + streak */}
        <div className="container mt-4">
          <section className="panel">
            <h2 className="section-title">Seu ano de escrita</h2>
            {heat.loading ? (
              <p className="text-sm text-muted mt-2">Carregando histórico…</p>
            ) : (
              <>
                <div className="mt-3">
                  <WritingHeatmap data={heat.days} />
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="kpi">
                    <div className="label">Sequência atual</div>
                    <div className="value">{heat.streak}</div>
                    <div className="hint">dias</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Hoje</div>
                    <div className="value">{heat.today.toLocaleString('pt-BR')}</div>
                    <div className="hint">palavras</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Últimos 365 dias</div>
                    <div className="value">{heat.total.toLocaleString('pt-BR')}</div>
                    <div className="hint">palavras</div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {projects.length > 1 && (
          <div className="container">
            <section className="panel2">
              <h2 className="section-title">Comparativo entre Projetos</h2>
              <div className="mt-3">
                <ProjectComparisonChart projects={projects} />
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        © 2025 PlanWriter — escreva com conforto
      </footer>
    </div>
  );
}
