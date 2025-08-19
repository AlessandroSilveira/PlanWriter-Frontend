// src/components/ProjectComparisonChart.jsx
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ProjectComparisonChart({ projects }) {
  if (!projects?.length) return null;

  const labels = projects.map(p => p.title ?? p.name);
  const written = projects.map(p => p.currentWordCount ?? 0);
  const goals = projects.map(p => p.wordCountGoal ?? 0);

  const data = {
    labels,
    datasets: [
      {
        label: 'Palavras escritas',
        data: written,
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // azul
      },
      {
        label: 'Meta de palavras',
        data: goals,
        backgroundColor: 'rgba(156, 163, 175, 0.5)', // cinza
      }
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div className="p-4">
      <Bar data={data} options={options} />
    </div>
  );
}
