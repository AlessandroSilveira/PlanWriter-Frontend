import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function WeeklyProgressChart({ history = [] }) {
  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="card p-4 text-center text-sm text-gray-600">
        Nenhum dado de progresso disponível.
      </div>
    );
  }

  const data = history.map(item => ({
    date: new Date(item.date).toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: '2-digit' }),
    words: item.words
  }));

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} palavras`, 'Palavras']} />
          <Bar dataKey="words" fill="#8aa7bd" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
