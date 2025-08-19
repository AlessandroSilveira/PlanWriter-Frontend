export default function WritingStats({ stats }) {
  if (!stats) return null;

  const items = [
    { label: "Total de palavras", value: stats.totalWords?.toLocaleString("pt-BR") ?? "-" },
    { label: "Média por dia", value: stats.averagePerDay?.toFixed(0) ?? "-" },
    {
      label: "Melhor dia",
      value: stats.bestDay
        ? `${stats.bestDay.date} (${stats.bestDay.words.toLocaleString("pt-BR")} palavras)`
        : "-"
    },
    { label: "Dias com escrita", value: stats.activeDays ?? "-" },
    { label: "Palavras restantes", value: stats.wordsRemaining?.toLocaleString("pt-BR") ?? "-" },
    {
      label: "Meta diária até o prazo",
      value: stats.smartDailyTarget?.toLocaleString("pt-BR") ?? "-"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white rounded-lg border p-4 shadow-sm">
          <p className="text-sm text-gray-600">{item.label}</p>
          <p className="text-xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
