// src/components/ProgressChart.jsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

function formatBr(d) {
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

/**
 * props:
 *  - history: [{ date, wordsWritten }, ...] (já normalizado)
 *  - currentWordCount: number
 *  - wordCountGoal?: number|null
 */
export default function ProgressChart({ history = [], currentWordCount = 0, wordCountGoal = null }) {
  // ordena por data e calcula acumulado
  const ordered = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  let acc = 0;
  const data = ordered.map((h) => {
    acc += Number(h.wordsWritten || 0);
    return {
      date: h.date,
      added: Number(h.wordsWritten || 0),
      cumulative: acc,
    };
  });

  // garante pelo menos um ponto (evita gráfico vazio)
  if (data.length === 0) {
    data.push({ date: new Date().toISOString(), added: 0, cumulative: currentWordCount || 0 });
  }

  const goal = Number(wordCountGoal || 0) > 0 ? Number(wordCountGoal) : null;

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatBr}
            minTickGap={32}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => {
              if (name === "cumulative") return [value, "Acumulado"];
              if (name === "added") return [value, "Adicionado"];
              return [value, name];
            }}
            labelFormatter={(label) => `Data: ${formatBr(label)}`}
          />
          {/* Linha do acumulado */}
          <Line type="monotone" dataKey="cumulative" strokeWidth={2} dot={false} />
          {/* Linha de pontos adicionados (opcional) */}
          <Line type="monotone" dataKey="added" strokeWidth={1} strokeDasharray="4 2" dot={false} />
          {/* Meta, se houver */}
          {goal && (
            <ReferenceLine y={goal} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="3 3" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
