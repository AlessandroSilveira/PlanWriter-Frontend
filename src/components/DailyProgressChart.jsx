// src/components/DailyProgressChart.jsx

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DailyProgressChart({ daily }) {
  if (!daily || !daily.length) return null;

  return (
    <div className="card mt-6">
      <h2 className="font-semibold mb-3">Evolução diária</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={daily}>
          <CartesianGrid stroke="#ddd8d0" strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value} palavras`, "Total"]}
            labelFormatter={(label) => `Dia: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="words"
            stroke="#b88b62"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
