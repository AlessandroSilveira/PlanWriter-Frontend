import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function WeeklyProgressChart({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-gray-600">Sem progresso suficiente para exibir o gráfico.</p>;
  }

  const labels = history.map((entry) =>
    new Date(entry.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
  );

  const values = history.map((entry) => entry.wordsWritten);

  const data = {
    labels,
    datasets: [
      {
        label: "Palavras escritas",
        data: values,
        backgroundColor: "#3b82f6",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-white text-black dark:text-black rounded-lg border p-4 shadow-sm">
      <Bar data={data} options={options} />
    </div>
  );
}
