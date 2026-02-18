// src/components/EventProgressCard.jsx
import { useMemo } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyEvents,
  getEventProjectProgress,
} from "../api/events";
import {
  normalizeEntityId,
  normalizeEventProjectProgress,
} from "../utils/eventProgress";
import EventProgressStatusCard from "./EventProgressStatusCard.jsx";

export default function EventProgressCard({
  eventId,
  projectId,
  projectTitle,
  showDetailsAction = true,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [resolvedEventId, setResolvedEventId] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setProgress(null);
      setResolvedEventId("");

      try {
        let resolvedEventId = eventId;
        let resolvedProjectId = projectId;

        // 🔍 Resolve eventId automaticamente se só veio projectId
        if (!resolvedEventId && resolvedProjectId) {
          const myEvents = await getMyEvents();
          const normalizedProjectId = normalizeEntityId(resolvedProjectId);
          const found = (myEvents || []).find(
            (entry) => normalizeEntityId(entry?.projectId ?? entry?.ProjectId) === normalizedProjectId
          );
          if (found) {
            resolvedEventId = found.eventId ?? found.EventId;
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

        setResolvedEventId(resolvedEventId);
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

  const normalizedProgress = useMemo(() => {
    if (!progress) return null;
    return normalizeEventProjectProgress(progress);
  }, [progress]);

  const detailsHandler = useMemo(() => {
    if (!showDetailsAction || !resolvedEventId) return null;
    return () => navigate(`/events/${resolvedEventId}`);
  }, [showDetailsAction, resolvedEventId, navigate]);

  if (loading) {
    return (
      <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-2">Evento</h3>
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-2">Evento</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!normalizedProgress) return null;

  return (
    <EventProgressStatusCard
      eventName={normalizedProgress.eventName}
      projectTitle={projectTitle}
      totalWords={normalizedProgress.totalWrittenInEvent}
      targetWords={normalizedProgress.targetWords}
      percent={normalizedProgress.percent}
      remainingWords={normalizedProgress.remainingWords}
      won={normalizedProgress.won}
      onAction={detailsHandler || undefined}
      actionLabel="Detalhes"
    />
  );
}
