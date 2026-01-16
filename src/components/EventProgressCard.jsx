// src/components/EventProgressCard.jsx
import { useEffect, useState } from "react";
import {
  getMyEvents,
  getEventProjectProgress,
} from "../api/events";

export default function EventProgressCard({ eventId, projectId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setProgress(null);

      try {
        let resolvedEventId = eventId;
        let resolvedProjectId = projectId;

        // 🔍 Resolve eventId automaticamente se só veio projectId
        if (!resolvedEventId && resolvedProjectId) {
          const myEvents = await getMyEvents();
          const found = (myEvents || []).find(
            (e) => e.projectId === resolvedProjectId
          );
          if (found) {
            resolvedEventId = found.eventId;
          }
        }

        if (!resolvedEventId || !resolvedProjectId) {
          if (alive) {
            setError("Nenhum evento ativo para este projeto.");
            setLoading(false);
          }
          return;
        }

        // ✅ Endpoint correto
        const data = await getEventProjectProgress(
          resolvedEventId,
          resolvedProjectId
        );

        if (!alive) return;

        setProgress(data);
      } catch {
        if (alive) {
          setError("Não foi possível carregar o progresso do evento.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId, projectId]);

  /* ===================== RENDER ===================== */

  if (loading) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-2">Progresso do Evento</h3>
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-2">Progresso do Evento</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!progress) return null;

  // 🔥 CAMPOS REAIS DO BACKEND
  const eventName = progress.name ?? "Evento";
  const current = Number(progress.totalWrittenInEvent ?? 0);
  const target = Math.max(1, Number(progress.targetWords ?? 1));
  const percent =
    progress.percent != null
      ? Math.min(100, Math.round(progress.percent))
      : Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="card">
      <h3 className="font-semibold mb-1">{eventName}</h3>

      <p className="text-sm text-muted mb-2">
        {current.toLocaleString("pt-BR")} /{" "}
        {target.toLocaleString("pt-BR")} palavras
      </p>

      <div className="h-2 bg-black/10 rounded overflow-hidden mb-2">
        <div
          className="h-full bg-indigo-600"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-muted">
        <span>{percent}% concluído</span>
        {progress.daysLeft != null && (
          <span>{progress.daysLeft} dias restantes</span>
        )}
      </div>
    </div>
  );
}
