import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getProjectHistory } from "../api/projects";
import { parseISO, subDays, isSameDay, format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

export default function WeeklyProgressChart({ projectIds }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const loadAllHistories = async () => {
      const today = new Date();
      const last7 = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));
      const chartData = last7.map((date) => ({
        date,
        label: format(date, "dd/MM", { locale: ptBR }),
        totalWords: 0,
      }));

      try {
        for (const id of projectIds) {
          const history = await getProjectHistory(id);
          for (const entry of history) {
            const entryDate = parseISO(entry.date);
            const match = chartData.find((d) => isSameDay(entryDate, d.date));
            if (match) {
              match.totalWords += entry.wordsWritten;
            }
          }
        }
        setData(chartData);
      } catch (err) {
        console.error("Erro ao carregar históricos dos projetos:", err);
      }
    };

    if (projectIds.length) {
      loadAllHistories();
    }
  }, [projectIds]);

  return (
    <div className="card">
      <h2 className="font-semibold mb-3">📊 Progresso total (últimos 7 dias)</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(v) => `${v} palavras`} />
          <Bar dataKey="totalWords" fill="#b88b62" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
