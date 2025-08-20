import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ProjectComparisonChart({ projects }) {
  if (!projects || projects.length === 0) return null;

  const labels = projects.map((p) => p.title ?? p.name);
  const written = projects.map((p) => p.currentWordCount ?? 0);
  const goals = projects.map((p) => p.wordCountGoal ?? 0);

  const data = {
    labels,
    datasets: [
      {
        label: "Palavras escritas",
        data: written,
        backgroundColor: "#3b82f6",
      },
      {
        label: "Meta de palavras",
        data: goals,
        backgroundColor: "#9ca3af",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-white text-black dark:text-black rounded-lg border p-4 shadow-sm">
      <Bar data={data} options={options} />
    </div>
  );
}
