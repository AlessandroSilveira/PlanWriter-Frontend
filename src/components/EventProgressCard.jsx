// src/components/EventProgressCard.jsx
import { useMemo } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyEvents,
  getEventParticipantStatus,
  getEventProjectProgress,
} from "../api/events";
import {
  normalizeEntityId,
  normalizeEventProjectProgress,
} from "../utils/eventProgress";
import {
  buildFallbackParticipantStatus,
  normalizeParticipantStatus,
} from "../utils/participantJourney";
import EventParticipantJourneyCard from "./EventParticipantJourneyCard.jsx";

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
  const [participantStatus, setParticipantStatus] = useState(null);
  const [resolvedEventId, setResolvedEventId] = useState("");
  const [resolvedProjectId, setResolvedProjectId] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setProgress(null);
      setParticipantStatus(null);
      setResolvedEventId("");
      setResolvedProjectId("");

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
        setResolvedProjectId(resolvedProjectId);
        setProgress(data);

        try {
          const unifiedStatus = await getEventParticipantStatus(
            resolvedEventId,
            resolvedProjectId
          );
          if (!alive) return;
          setParticipantStatus(normalizeParticipantStatus(unifiedStatus));
        } catch {
          if (!alive) return;
          const normalizedProgress = normalizeEventProjectProgress(data);
          setParticipantStatus(
            buildFallbackParticipantStatus({
              eventId: resolvedEventId,
              projectId: resolvedProjectId,
              eventName: normalizedProgress?.eventName ?? "Evento",
              projectTitle: projectTitle ?? "Participação individual",
              totalWords: normalizedProgress?.totalWrittenInEvent ?? 0,
              targetWords: normalizedProgress?.targetWords ?? 0,
              percent: normalizedProgress?.percent ?? 0,
              remainingWords: normalizedProgress?.remainingWords ?? 0,
              isEventClosed: false,
              isEventActive: true,
              isWinner: normalizedProgress?.won ?? false,
            })
          );
        }
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
  }, [eventId, projectId, projectTitle]);

  /* ===================== RENDER ===================== */

  const normalizedProgress = useMemo(() => {
    if (!progress) return null;
    return normalizeEventProjectProgress(progress);
  }, [progress]);

  const resolvedStatus = useMemo(() => {
    if (participantStatus) return participantStatus;
    if (!normalizedProgress) return null;

    return buildFallbackParticipantStatus({
      eventId: resolvedEventId,
      projectId: resolvedProjectId,
      eventName: normalizedProgress.eventName,
      projectTitle: projectTitle ?? "Participação individual",
      totalWords: normalizedProgress.totalWrittenInEvent,
      targetWords: normalizedProgress.targetWords,
      percent: normalizedProgress.percent,
      remainingWords: normalizedProgress.remainingWords,
      isEventClosed: false,
      isEventActive: true,
      isWinner: normalizedProgress.won,
    });
  }, [
    participantStatus,
    normalizedProgress,
    resolvedEventId,
    resolvedProjectId,
    projectTitle,
  ]);

  const detailsHandler = useMemo(() => {
    if (!showDetailsAction || !resolvedEventId) return null;
    return () => navigate(`/events/${resolvedEventId}`);
  }, [showDetailsAction, resolvedEventId, navigate]);

  const validateHandler = useMemo(() => {
    if (!resolvedEventId || !resolvedProjectId) return null;
    return () =>
      navigate(`/validate?eventId=${resolvedEventId}&projectId=${resolvedProjectId}`);
  }, [resolvedEventId, resolvedProjectId, navigate]);

  const winnerHandler = useMemo(() => {
    if (!resolvedEventId || !resolvedProjectId) return null;
    return () =>
      navigate(`/winner?eventId=${resolvedEventId}&projectId=${resolvedProjectId}`);
  }, [resolvedEventId, resolvedProjectId, navigate]);

  const projectHandler = useMemo(() => {
    if (!resolvedProjectId) return null;
    return () => navigate(`/projects/${resolvedProjectId}`);
  }, [resolvedProjectId, navigate]);

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

  if (!resolvedStatus) return null;

  return (
    <EventParticipantJourneyCard
      status={resolvedStatus}
      onOpenDetails={detailsHandler || undefined}
      onOpenValidate={validateHandler || undefined}
      onOpenWinner={winnerHandler || undefined}
      onOpenProject={projectHandler || undefined}
    />
  );
}
