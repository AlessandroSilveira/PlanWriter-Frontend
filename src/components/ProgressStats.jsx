export default function ProgressStats({ stats }) {
  const items = [
    { label: "Total de palavras", value: stats.totalWords.toLocaleString("pt-BR") },
    { label: "Média por dia", value: stats.averagePerDay.toLocaleString("pt-BR") },
    {
      label: "Melhor dia",
      value: stats.bestDay
        ? `${new Date(stats.bestDay.date).toLocaleDateString("pt-BR")} (${stats.bestDay.words.toLocaleString("pt-BR")} palavras)`
        : "-"
    },
    { label: "Dias com escrita", value: stats.activeDays },
    { label: "Palavras restantes", value: stats.wordsRemaining.toLocaleString("pt-BR") },
    { label: "Meta diária até o prazo", value: stats.dailyGoal?.toLocaleString("pt-BR") ?? "-" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-white text-black dark:text-black rounded-lg border p-4 shadow-sm"
        >
          <p className="text-sm text-gray-600">{item.label}</p>
          <p className="text-xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
