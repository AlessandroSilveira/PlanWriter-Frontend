import { useEffect, useState } from 'react'
import { getProjectHistory } from '../api/projects'

export default function ProgressStats({ projectId }) {
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    getProjectHistory(projectId)
      .then(setHistory)
      .catch(err => {
        console.error("Erro ao carregar histórico para estatísticas:", err)
        setError('Erro ao carregar histórico')
      })
  }, [projectId])

  if (error) return <p className="text-red-500">{error}</p>
  if (!history || history.length === 0) return <p>Nenhum progresso registrado ainda.</p>

  const totalWords = history.reduce((sum, h) => sum + h.wordCount, 0)
  const days = [...new Set(history.map(h => h.date))].length
  const avg = days > 0 ? Math.round(totalWords / days) : 0
  const best = history.reduce((max, h) => h.wordCount > max.wordCount ? h : max, { wordCount: 0 })

  return (
    <div className="space-y-1">
      <p>Total de palavras: <strong>{totalWords.toLocaleString('pt-BR')}</strong></p>
      <p>Média por dia: <strong>{avg}</strong></p>
      <p>Melhor dia: <strong>{best.date ?? '-'} ({best.wordCount ?? 0} palavras)</strong></p>
    </div>
  )
}
