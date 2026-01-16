// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getProjects,
  getProjectStats,
  getProjectHistory,
  getMonthlyProgress,
} from '../api/projects.js';

import { getMyEvents } from '../api/events';

import EventProgressCard from "../components/EventProgressCard.jsx";
import ProjectComparisonChart from "../components/ProjectComparisonChart";
import WritingHeatmap from "../components/WritingHeatmap.jsx";
import TodayTargetCard from "../components/TodayTargetCard.jsx";
import RecentBadges from "../components/RecentBadges.jsx";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [heat, setHeat] = useState({
    loading: true,
    days: [],
    total: 0,
    streak: 0,
    today: 0,
  });

  const [monthly, setMonthly] = useState({ loading: true, total: 0 });

  const [myEvents, setMyEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  /* ===================== LOAD PROJETOS ===================== */
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
      setError(
        is401
          ? 'Sessão expirada. Faça login novamente.'
          : 'Erro ao carregar projetos'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ===================== META DO MÊS ===================== */
  useEffect(() => {
    (async () => {
      try {
        const data = await getMonthlyProgress();
        setMonthly({
          loading: false,
          total: Number(data?.total ?? 0),
        });
      } catch {
        setMonthly({ loading: false, total: 0 });
      }
    })();
  }, []);

  /* ===================== EVENTOS DO USUÁRIO ===================== */
  useEffect(() => {
    (async () => {
      try {
        const data = await getMyEvents();
        setMyEvents(Array.isArray(data) ? data : []);
      } catch {
        setMyEvents([]);
      } finally {
        setEventsLoading(false);
      }
    })();
  }, []);

  /* ===================== HEATMAP (ANO) ===================== */
  useEffect(() => {
    if (!projects?.length) {
      setHeat({ loading: false, days: [], total: 0, streak: 0, today: 0 });
      return;
    }

    (async () => {
      setHeat(h => ({ ...h, loading: true }));
      try {
        const end = new Date();
        end.setHours(0, 0, 0, 0);

        const start = new Date(end);
        start.setDate(end.getDate() - 370);

        const map = new Map();
        let total = 0;

        await Promise.all(
          projects.map(async (p) => {
            const pid = p.id ?? p.projectId;
            try {
              const hist = await getProjectHistory(pid);
              (hist || []).forEach((h) => {
                const d = new Date(
                  h.date || h.Date || h.createdAt || h.CreatedAt
                );
                if (d < start || d > end) return;

                const key = d.toISOString().slice(0, 10);
                const add = Number(
                  h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0
                ) || 0;

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
      } catch {
        setHeat({ loading: false, days: [], total: 0, streak: 0, today: 0 });
      }
    })();
  }, [projects]);

  if (loading) return <p>Carregando...</p>;

  /* ===================== PROJETO BASE ===================== */
  const first = projects?.[0] ?? null;
  const firstId = first?.id ?? first?.projectId ?? null;

  /* ===================== META DO MÊS ===================== */
  const MONTHLY_GOAL = 50000;
  const cur = monthly.total;
  const goalRaw = MONTHLY_GOAL;
  const goalMath = Math.max(1, goalRaw);
  const progressPct = Math.min(
    100,
    Math.max(0, (cur / goalMath) * 100)
  );

  /* ===================== DONUT ===================== */
  const Ring = ({ pct = 0, size = 120, stroke = 12, label = "concluído" }) => {
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    const offset = C - (p / 100) * C;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#0f3a5f"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          fontWeight="600" fontSize={Math.round(size * 0.22)}>
          {Math.round(p)}%
        </text>
        <text x="50%" y="50%" dy={Math.round(size * 0.18)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.round(size * 0.10)} fill="#6b7280">
          {label}
        </text>
      </svg>
    );
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen flex flex-col">
      <header className="hero">
        <div className="container hero-inner">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Bem vindo de volta, Escritor.</h1>
            <Link to="/projects/new" className="btn-primary">+ Novo projeto</Link>
          </div>

          {error && <p className="text-red-600 mt-2">{error}</p>}

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
                  {stats.bestDay?.date
                    ? new Date(stats.bestDay.date).toLocaleDateString('pt-BR')
                    : '—'}
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

      <main className="flex-grow dashboard-gap">
        {/* PROJETOS */}
        <div className="container grid">
          <section className="panel">
            <h2>Seus projetos</h2>
            {!projects.length ? (
              <div className="card card--lg text-center py-10 mt-3">
                <p className="meta">Você ainda não tem projetos.</p>
                <Link to="/projects/new" className="button">Criar primeiro projeto</Link>
              </div>
            ) : (
              <div className="proj-grid">
                {projects.map(p => {
                  const pid = p.id ?? p.projectId;
                  const pCur = Number(p.currentWordCount ?? 0);
                  const pGoal = Number(p.wordCountGoal ?? 0);
                  const pct = pGoal ? Math.round((pCur / pGoal) * 100) : 0;
                  return (
                    <Link key={pid} to={`/projects/${pid}`} className="no-underline">
                      <div className="proj">
                        <div className="kicker">{p.genre ?? 'Projeto'}</div>
                        <div className="title">{p.title}</div>
                        <p className="meta">
                          {pCur.toLocaleString('pt-BR')} / {pGoal.toLocaleString('pt-BR')} palavras
                        </p>
                        {pGoal > 0 && (
                          <div className="progress">
                            <div className="fill" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* META DO MÊS */}
          <aside className="panel">
            <h2>Meta do mês</h2>
            <p className="sub">Produção total no mês</p>

            {!monthly.loading ? (
              <div className="upperkpi">
                <Ring pct={progressPct} size={128} stroke={14} />
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
              <p className="text-muted mt-2">Carregando progresso mensal…</p>
            )}
          </aside>
        </div>

        {/* EVENTOS */}
        <section className="container mt-4">
          <div className="panel">
            <h2 className="section-title">Eventos em que você está participando</h2>

            {eventsLoading ? (
              <p className="text-sm text-muted mt-2">Carregando eventos…</p>
            ) : myEvents.length === 0 ? (
              <p className="text-sm text-muted mt-2">
                Você não está participando de nenhum evento no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {myEvents.map((ev) => (
                  <EventProgressCard
                    key={ev.eventId ?? ev.id}
                    projectId={ev.projectId ?? ev.project?.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* META DE HOJE */}
        {first && (
          <div className="container mt-4">
            <TodayTargetCard project={first} />
          </div>
        )}

        {/* HEATMAP */}
        <div className="container mt-4">
          <section className="panel">
            <h2 className="section-title">Seu ano de escrita</h2>
            {heat.loading ? (
              <p className="text-sm text-muted mt-2">Carregando histórico…</p>
            ) : (
              <>
                <WritingHeatmap data={heat.days} />
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

        {/* BADGES */}
        {firstId && (
          <div className="container mt-4">
            <RecentBadges projectId={firstId} take={6} />
          </div>
        )}

        {/* COMPARATIVO */}
        {projects.length > 1 && (
          <div className="container">
            <section className="panel2">
              <h2 className="section-title">Comparativo entre Projetos</h2>
              <ProjectComparisonChart projects={projects} />
            </section>
          </div>
        )}
      </main>

      <footer className="p-4 text-center text-sm text-gray-500">
        © 2025 PlanWriter — escreva com conforto
      </footer>
    </div>
  );
}
