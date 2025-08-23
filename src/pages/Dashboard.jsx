import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getProjects,
  getProjectStats,
  getProjectBadges
} from '../api/projects.js'

import ProgressStats from "../components/ProgressStats";
import WeeklyProgressChart from "../components/WeeklyProgressChart";
import WritingStats from "../components/WritingStats";
import ProjectComparisonChart from "../components/ProjectComparisonChart";
import BadgesList from "../components/BadgesList"; // ⬅️ NOVO

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]); // ⬅️ NOVO
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects()
      .then(async data => {
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0) {
            const firstId = data[0].id;
            try {
              const s = await getProjectStats(firstId);
              const b = await getProjectBadges(firstId);
              setStats(s);
              setBadges(b); // ⬅️ NOVO
            } catch (err) {
              console.warn("Erro ao carregar estatísticas ou badges:", err);
            }
          }
        } else {
          console.error("Resposta inesperada da API:", data);
          setProjects([]);
        }
      })
      .catch(() => setError('Erro ao carregar projetos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Seus projetos</h1>
        <Link to="/projects/new" className="button">+ Novo projeto</Link>
      </div>

      {!projects?.length ? (
        <div className="card text-center py-10">
          <p className="text-gray-600 mb-4">Você ainda não tem projetos.</p>
          <Link to="/projects/new" className="button">Criar primeiro projeto</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pid = p.id ?? p.projectId;
            return (
              <Link key={pid} to={`/projects/${pid}`} className="card block">
                <h2 className="font-semibold">{p.title ?? p.name}</h2>
                {p.description && <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>}
                {p.wordCountGoal ? (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-gray-800 h-2 rounded" style={{ width: `${Math.min(100, p.progressPercent ?? 0)}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {(p.currentWordCount ?? 0)} / {p.wordCountGoal} palavras
                    </p>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">Resumo Geral</h2>
            <ProgressStats stats={stats} />
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">Progresso Semanal</h2>
            <WeeklyProgressChart history={stats.history ?? []} />
          </div>
        </div>
      )}

      {stats && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold mb-2">Estatísticas Detalhadas</h2>
          <WritingStats stats={stats} />
        </div>
      )}

      {projects.length > 1 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold mb-2">Comparativo entre Projetos</h2>
          <ProjectComparisonChart projects={projects} />
        </div>
      )}

      {badges.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold mb-2">Conquistas Desbloqueadas</h2>
          <BadgesList badges={badges} />
        </div>
      )}
    </div>
  );
}
