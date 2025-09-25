// src/components/EventLeaderboard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { getEventLeaderboard } from "../api/events";
import EmptyState from "./EmptyState";
import Skeleton from "./Skeleton"; // default import
import { downloadCSV } from "../utils/csv";
import Alert from "./Alert";

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

  const fetchLeaderboard = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setErr("");
    try {
      const data = await getEventLeaderboard(eventId, { scope, top });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao carregar o ranking.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, scope, top]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const exportCsv = useCallback(() => {
    const normalized = rows.map((r, i) => {
      const rank = Number(r.rank ?? r.Rank ?? i + 1) || i + 1;
      const projectTitle = r.projectTitle ?? r.ProjectTitle ?? "Projeto";
      const userName = r.userName ?? r.UserName ?? "—";
      const words = Number(r.words ?? r.Words ?? 0) || 0;
      const percent = Math.round(Number(r.percent ?? r.Percent ?? 0)) || 0;
      const won = !!(r.won ?? r.Won);
      return { rank, projectTitle, userName, words, percent, status: won ? "Winner" : "" };
    });

    const headers = ["Posição", "Projeto", "Autor", "Palavras", "% da meta", "Status"];
    const data = normalized.map((n) => [
      n.rank,
      n.projectTitle,
      n.userName,
      n.words,
      n.percent,
      n.status,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `leaderboard_event-${eventId}_${scope}_${dateStr}.csv`;
    downloadCSV(filename, headers, data);
  }, [rows, scope, eventId]);

  const hasData = useMemo(() => !loading && !err && rows.length > 0, [loading, err, rows]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Leaderboard do Evento</h2>
        <div className="flex items-center gap-2">
          <div className="segmented">
            <button
              className={`segmented-item ${scope === "daily" ? "active" : ""}`}
              onClick={() => setScope("daily")}
            >
              Hoje
            </button>
            <button
              className={`segmented-item ${scope === "total" ? "active" : ""}`}
              onClick={() => setScope("total")}
            >
              Geral
            </button>
          </div>
          {hasData && (
            <button className="button" onClick={exportCsv} title="Exportar CSV">
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {!loading && err && (
        <>
          <Alert type="error">{err}</Alert>
          <div className="mt-2">
            <button className="button" onClick={fetchLeaderboard}>Tentar novamente</button>
          </div>
        </>
      )}

      {loading && (
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
              {Array.from({ length: Math.min(8, top) }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-2"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-2 pr-2"><Skeleton className="h-4 w-48" /></td>
                  <td className="py-2 pr-2"><Skeleton className="h-4 w-40" /></td>
                  <td className="py-2 pr-2 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="py-2 pr-2 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="py-2 pr-2"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className="mt-3">
          <EmptyState
            icon="users"
            title="Ainda não há participantes ranqueados"
            subtitle="Participe do evento e registre progresso para aparecer aqui."
          />
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
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
              {rows.map((r, i) => {
                const key = `${r.projectId ?? r.ProjectId ?? i}-${r.rank ?? r.Rank ?? "?"}`;
                const rank = Number(r.rank ?? r.Rank ?? i + 1) || i + 1;
                const projectTitle = r.projectTitle ?? r.ProjectTitle ?? "Projeto";
                const userName = r.userName ?? r.UserName ?? "—";
                const words = Number(r.words ?? r.Words ?? 0) || 0;
                const percent = Math.round(Number(r.percent ?? r.Percent ?? 0)) || 0;
                const won = !!(r.won ?? r.Won);

                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-2"><Medal rank={rank} /></td>
                    <td className="py-2 pr-2">{projectTitle}</td>
                    <td className="py-2 pr-2">{userName}</td>
                    <td className="py-2 pr-2 text-right">{words.toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-2 text-right">{percent}%</td>
                    <td className="py-2 pr-2">{won ? "🏆 Winner" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
