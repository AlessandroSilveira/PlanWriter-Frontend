export default function WritingStats({ stats }) {
const items = [
{
label: "Total de palavras",
value: stats.totalWords.toLocaleString("pt-BR")
},
{
label: "Média por dia",
value: stats.averagePerDay.toLocaleString("pt-BR")
},
{
label: "Melhor dia",
value: stats.bestDay
? `${new Date(stats.bestDay.date).toLocaleDateString("pt-BR")} (${stats.bestDay.words.toLocaleString("pt-BR")} palavras)`
: "-"
},
{
label: "Dias com escrita",
value: stats.activeDays.toLocaleString("pt-BR")
},
{
label: "Palavras restantes",
value: stats.wordsRemaining.toLocaleString("pt-BR")
},
{
label: "Meta diária até o prazo",
value: stats.dailyTarget ? stats.dailyTarget.toLocaleString("pt-BR") : "-"
}
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