import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, getProjectStats } from '../api/projects.js';
import WritingStats from "../components/WritingStats";
import ProjectComparisonChart from "../components/ProjectComparisonChart";
import RecentBadges from "../components/RecentBadges.jsx";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <p>Carregando...</p>;

  // Anel de progresso visual
  const Ring = ({ pct = 0 }) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    return (
      <div className="ring2">
        {clamped}%<small> concluído</small>
      </div>
    );
  };

  const first = projects[0];
  const progressPercent = Math.min(
    100,
    Math.round(first?.progressPercent ?? ((first?.currentWordCount ?? 0) / (first?.wordCountGoal || 1)) * 100)
  );

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
                  const pct = Math.min(
                    100,
                    Math.round(p?.progressPercent ?? ((p?.currentWordCount ?? 0) / (p?.wordCountGoal || 1)) * 100)
                  );

                  return (
                    <Link key={pid} to={`/projects/${pid}`} className="no-underline">
                      <div className="proj">
                        <div className="kicker">{p?.genre ?? 'Projeto'}</div>
                        <div className="title">{p.title ?? p.name}</div>
                        {p.description && <p className="meta">{p.description}</p>}
                        <p className="meta">
                          {(p.currentWordCount ?? 0).toLocaleString('pt-BR')} /{" "}
                          {p.wordCountGoal?.toLocaleString('pt-BR')} palavras
                        </p>
                        {p.wordCountGoal ? (
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
                <Ring pct={progressPercent} />
                <div>
                  <div className="kpi">
                    <div className="label">Atual</div>
                    <div className="value">
                      {(first.currentWordCount ?? 0).toLocaleString('pt-BR')}
                    </div>
                    <div className="hint">palavras</div>
                  </div>
                  <div className="kpi kpi--lg">
                    <div className="label">Meta</div>
                    <div className="value">
                      {(first.wordCountGoal ?? 0).toLocaleString('pt-BR')}
                    </div>
                    <div className="hint">palavras</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted mt-2">Crie um projeto para acompanhar a meta.</div>
            )}
          </aside>
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
