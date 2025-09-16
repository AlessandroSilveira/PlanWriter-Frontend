// src/components/WritingStats.jsx
export default function WritingStats({ stats }) {
  const s = stats ?? {};

  const totalWords = Number(s.totalWords ?? 0);
  const avgPerDay = Math.round(Number(s.averagePerDay ?? 0));
  const yesterday = Number(s.yesterdayWords ?? 0);
  const activeDays = Number(s.activeDays ?? 0);

  const bestDateObj = s?.bestDay?.date ? new Date(s.bestDay.date) : null;
  const bestWordsNum = Number(s?.bestDay?.words ?? 0);
  const bestStr =
    bestDateObj && Number.isFinite(bestWordsNum) && bestWordsNum > 0
      ? `${bestDateObj.toLocaleDateString("pt-BR")} (${bestWordsNum.toLocaleString("pt-BR")} palavras)`
      : "-";

  const items = [
    { label: "Total de palavras", value: totalWords.toLocaleString("pt-BR") },
    { label: "Média por dia", value: avgPerDay.toLocaleString("pt-BR") },
    { label: "Melhor dia", value: bestStr },
    { label: "Ontem", value: yesterday.toLocaleString("pt-BR") },
    { label: "Sequência", value: String(activeDays) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white dark:bg-white text-black dark:text-black p-4 rounded shadow"
        >
          <h3 className="text-sm text-gray-500">{item.label}</h3>
          <p className="text-xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
