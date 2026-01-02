// src/components/EventLeaderboard.jsx
import { useEffect, useState } from "react";
import { getEventLeaderboard } from "../api/events";

export default function EventLeaderboard({ eventId, title = "Ranking do Evento" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!eventId) {
      setErr("Nenhum evento selecionado.");
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getEventLeaderboard(eventId);
        if (!mounted) return;

        // normaliza: servidor pode mandar { items: [...] } ou [...]
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setRows(list);
      } catch (e) {
        if (!mounted) return;
        setErr("Não foi possível carregar o ranking do evento.");
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  return (
    <div className="border rounded-lg p-4 bg-white/70 backdrop-blur">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>

      {loading && <p>Carregando…</p>}
      {!loading && err && <p className="text-red-600 text-sm">{err}</p>}

      {!loading && !err && rows.length === 0 && (
        <p className="text-sm text-gray-500">Ainda não há participantes ranqueados.</p>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Usuário</th>
                <th className="text-left p-2">Palavras</th>
                <th className="text-left p-2">Projeto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id || row.userId || idx} className="border-b">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{row.userName || row.username || row.displayName || "—"}</td>
                  <td className="p-2">{row.totalWords ?? row.words ?? row.wordCount ?? 0}</td>
                  <td className="p-2">{row.projectName || row.projectId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
