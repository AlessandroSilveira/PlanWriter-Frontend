// src/components/EventProgressCard.jsx
import { useEffect, useState } from "react";
import { getEventProgress } from "../api/events";

export default function EventProgressCard({ eventId, title = "Progresso do Evento" }) {
  const [progress, setProgress] = useState(null);
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
        const data = await getEventProgress(eventId);
        if (!mounted) return;
        setProgress(data);
      } catch (e) {
        if (!mounted) return;
        setErr("Não foi possível carregar o progresso do evento.");
        setProgress(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  const percent = normalizePercent(progress?.percent, progress);

  return (
    <div className="border rounded-lg p-4 bg-white/70 backdrop-blur">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>

      {loading && <p>Carregando…</p>}
      {!loading && err && <p className="text-red-600 text-sm">{err}</p>}

      {!loading && !err && progress && (
        <>
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <span>
              {progress.totalWords ?? progress.current ?? 0} /{" "}
              {progress.targetWords ?? progress.goal ?? 0} palavras
            </span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-3 bg-indigo-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {progress.projectId ? (
            <p className="text-xs text-gray-500">
              Projeto: {progress.projectName || progress.projectId}
            </p>
          ) : null}
        </>
      )}

      {!loading && !err && !progress && (
        <p className="text-sm text-gray-500">Sem dados de progresso ainda.</p>
      )}
    </div>
  );
}

function normalizePercent(percent, raw) {
  if (typeof percent === "number" && !Number.isNaN(percent)) {
    return Math.max(0, Math.min(100, Math.round(percent)));
  }
  const current = raw?.totalWords ?? raw?.current ?? 0;
  const target = raw?.targetWords ?? raw?.goal ?? 0;
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}
