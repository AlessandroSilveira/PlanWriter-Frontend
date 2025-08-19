import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function WeeklyProgressChart({ history = [] }) {
  if (!Array.isArray(history) || history.length === 0) {
    return <p className="text-gray-600 text-sm">Sem progresso suficiente para exibir o gráfico.</p>
  }

  const grouped = history.reduce((acc, h) => {
    const date = new Date(h.date).toLocaleDateString('pt-BR')
    acc[date] = (acc[date] || 0) + h.wordCount
    return acc
  }, {})

  const labels = Object.keys(grouped)
  const data = Object.values(grouped)

  return (
    <div className="p-2">
      <Bar
        data={{
          labels,
          datasets: [{
            label: 'Palavras escritas',
            data,
            backgroundColor: '#3d6d8e'
          }]
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }}
      />
    </div>
  )
}
