// src/pages/Projects.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../api/projects.js";
import { isOngoing } from "../utils/overviewAggregation";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setError("");
      try {
        const data = await getProjects();
        if (!alive) return;
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setError("Falha ao carregar projetos");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  if (loading) return <p className="p-4">Carregando…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  const active = projects.filter(isOngoing);
  const completed = projects.filter(p => !isOngoing(p));

  const ProjectCard = ({ p }) => {
    const pid = p.id ?? p.projectId;
    const pct = Math.min(
      100,
      Math.round(p?.progressPercent ?? ((p?.currentWordCount ?? 0) / (p?.wordCountGoal || 1)) * 100)
    );
    return (
      <Link to={`/projects/${pid}`} className="no-underline">
        <div className="proj">
          <div className="kicker">{p?.genre ?? "Projeto"}</div>
          <div className="title">{p.title ?? p.name}</div>
          {p.description && <p className="meta">{p.description}</p>}
          <p className="meta">
            {(p.currentWordCount ?? 0).toLocaleString("pt-BR")} /{" "}
            {p.wordCountGoal?.toLocaleString("pt-BR")} palavras
          </p>
          {p.wordCountGoal ? (
            <div className="progress">
              <div className="fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </div>
      </Link>
    );
  };

  // 👇 container com largura de 1600px
  return (
    <header className="hero">
      <div className="container hero-inner">
      <section className="panel">
        <div className="flex items-center justify-between">
          <h1 className="section-title">Seus projetos</h1>
          <Link to="/projects/new" className="btn-primary">+ Novo projeto</Link>
        </div>

        <div className="mt-4 space-y-8">
          {/* Ativos */}
          <div>
            <h2 className="kicker">Ativos</h2>
            {active.length === 0 ? (
              <div className="text-muted mt-2">Nenhum projeto ativo.</div>
            ) : (
              <div className="proj-grid">
                {active.map(p => (
                  <ProjectCard key={p.id ?? p.projectId} p={p} />
                ))}
              </div>
            )}
          </div>

          <hr className="my-2 border-[color:var(--line)]" />

          {/* Concluídos */}
          <div>
            <h2 className="kicker">Concluídos</h2>
            {completed.length === 0 ? (
              <div className="text-muted mt-2">Nenhum projeto concluído.</div>
            ) : (
              <div className="proj-grid">
                {completed.map(p => (
                  <ProjectCard key={p.id ?? p.projectId} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </header>

  );
}
