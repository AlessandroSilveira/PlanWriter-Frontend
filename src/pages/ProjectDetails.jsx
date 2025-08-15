import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getProjectHistory, addProgress, deleteProgress } from '../api/projects.js'

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [history, setHistory] = useState([])
  const [wordsWritten, setWordsWritten] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [p, h] = await Promise.all([getProject(id), getProjectHistory(id)])
      setProject(p)
      setHistory(h)
    } catch {
      setError('Falha ao carregar o projeto.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const submitProgress = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await addProgress(id, { wordsWritten: Number(wordsWritten), date: new Date(date).toISOString() })
      setWordsWritten('')
      await load()
    } catch {
      setError('Falha ao adicionar progresso.')
    }
  }

  const removeProgress = async (progressId) => {
    try {
      await deleteProgress(progressId)
      await load()
    } catch {
      setError('Falha ao excluir progresso.')
    }
  }

  if (loading) return <p>Carregando...</p>
  if (!project) return <p>Projeto não encontrado.</p>

  return (
    <div className="space-y-6">
      <div className="card">
        <button onClick={() => navigate(-1)} className="mb-3">← Voltar</button>
        <h1 className="text-xl font-semibold">{project.title}</h1>
        <p className="text-gray-600">{project.description}</p>
        <p className="mt-2"><b>{project.currentWordCount}</b> / {project.wordCountGoal ?? '—'} palavras</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Adicionar progresso</h2>
        <form className="grid md:grid-cols-4 gap-3 items-end" onSubmit={submitProgress}>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Palavras escritas</label>
            <input type="number" min="1" value={wordsWritten} onChange={e => setWordsWritten(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Data/Hora</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="md:col-span-4">
            <button type="submit">Adicionar</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Histórico</h2>
        {!history?.length ? <p className="text-sm text-gray-600">Sem entradas ainda.</p> : (
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.id} className="flex items-center justify-between">
                <span>{new Date(h.date).toLocaleString()} — <b>{h.wordsWritten}</b> palavras</span>
                <button onClick={() => removeProgress(h.id)}>Excluir</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
