import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects } from '../api/projects.js'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getProjects()
      .then(data => setProjects(data || []))
      .catch(() => setError('Erro ao carregar projetos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Carregando...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Meus Projetos</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="grid md:grid-cols-2 gap-3">
        {projects.map(p => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card block">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="text-sm text-gray-600">{p.description}</p>
            <div className="mt-2 text-sm">
              <p><b>{p.currentWordCount}</b> / {p.wordCountGoal ?? '—'} palavras</p>
              {p.wordCountGoal ? (
                <div className="w-full bg-gray-200 rounded h-2 mt-1">
                  <div className="bg-gray-800 h-2 rounded" style={{ width: `${Math.min(100, Math.round(p.progressPercent ?? 0))}%` }} />
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
