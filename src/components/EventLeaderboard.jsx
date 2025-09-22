// src/components/EventLeaderboard.jsx
import { useEffect, useState } from "react";
import { getEventLeaderboard } from "../api/events";

function Medal({ rank }) {
  if (rank === 1) return <span title="1º lugar">🥇</span>;
  if (rank === 2) return <span title="2º lugar">🥈</span>;
  if (rank === 3) return <span title="3º lugar">🥉</span>;
  return <span className="text-muted">#{rank}</span>;
}

export default function EventLeaderboard({ eventId, top = 20 }) {
  const [scope, setScope] = useState("daily"); // "daily" | "total"
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await getEventLeaderboard(eventId, { scope, top });
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar o ranking.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, scope, top]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Leaderboard do Evento</h2>
        <div className="segmented">
          <button className={`segmented-item ${scope === "daily" ? "active" : ""}`} onClick={() => setScope("daily")}>
            Hoje
          </button>
          <button className={`segmented-item ${scope === "total" ? "active" : ""}`} onClick={() => setScope("total")}>
            Geral
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 mt-2">{err}</p>}
      {loading ? (
        <p className="text-sm text-muted mt-2">Carregando…</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted mt-2">Nenhum dado para este evento.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b">
                <th className="py-2 pr-2">Posição</th>
                <th className="py-2 pr-2">Projeto</th>
                <th className="py-2 pr-2">Autor</th>
                <th className="py-2 pr-2 text-right">Palavras</th>
                <th className="py-2 pr-2 text-right">% da meta</th>
                <th className="py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.projectId}-${r.rank}`} className="border-b last:border-0">
                  <td className="py-2 pr-2"><Medal rank={r.rank} /></td>
                  <td className="py-2 pr-2">{r.projectTitle}</td>
                  <td className="py-2 pr-2">{r.userName || "—"}</td>
                  <td className="py-2 pr-2 text-right">{Number(r.words || 0).toLocaleString("pt-BR")}</td>
                  <td className="py-2 pr-2 text-right">{Math.round(Number(r.percent || 0))}%</td>
                  <td className="py-2 pr-2">{r.won ? "🏆 Winner" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
