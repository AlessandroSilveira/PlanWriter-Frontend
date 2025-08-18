import { useEffect, useState } from "react";
import { getProjectHistory } from "../api/projects";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

export default function ProgressStats({ projectId }) {
  const [dailyStats, setDailyStats] = useState([]);
  const [total, setTotal] = useState(0);
  const [average, setAverage] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const history = await getProjectHistory(projectId);
        const today = new Date();
        const last7 = Array.from({ length: 7 }).map((_, i) => {
          const date = subDays(today, 6 - i);
          const dayEntries = history.filter(h =>
            isSameDay(parseISO(h.date), date)
          );
          const words = dayEntries.reduce((sum, h) => sum + h.wordsWritten, 0);
          return { date, words };
        });

        const totalWords = last7.reduce((sum, d) => sum + d.words, 0);
        setDailyStats(last7);
        setTotal(totalWords);
        setAverage(Math.round(totalWords / 7));
      } catch (err) {
        console.error("Erro ao carregar histórico para estatísticas:", err);
      }
    };

    load();
  }, [projectId]);

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Resumo semanal</h2>

      <ul className="text-sm space-y-1">
        {dailyStats.map((d, idx) => (
          <li key={idx} className="flex justify-between border-b border-dashed pb-1">
            <span>{format(d.date, "EEEE, dd/MM", { locale: ptBR })}</span>
            <span>{d.words.toLocaleString()} palavras</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-sm text-gray-700">
        <p>📈 Total na semana: <b>{total.toLocaleString()}</b> palavras</p>
        <p>📊 Média diária: <b>{average.toLocaleString()}</b> palavras/dia</p>
      </div>
    </div>
  );
}
