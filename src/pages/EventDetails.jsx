import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEventById,
  getEventParticipantStatus,
  getMyEvents,
  getEventProjectProgress,
  getEventLeaderboard,
  leaveEvent,
} from "../api/events";
import { useAuth } from "../context/AuthContext";
import WordWarPanel from "../components/WordWarPanel.jsx";
import EventParticipantJourneyCard from "../components/EventParticipantJourneyCard.jsx";
import { normalizeEventProjectProgress } from "../utils/eventProgress";
import {
  buildFallbackParticipantStatus,
  normalizeParticipantStatus,
} from "../utils/participantJourney";

export default function EventDetails() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [myEvent, setMyEvent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [participantStatus, setParticipantStatus] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("pt-BR") : "—";

  const getEffectiveStatus = (ev) => {
    if (!ev) return "unknown";

    const nowMs = Date.now();
    const startsAtMs = Date.parse(ev.startsAtUtc ?? ev.StartsAtUtc ?? "");
    const endsAtMs = Date.parse(ev.endsAtUtc ?? ev.EndsAtUtc ?? "");

    if (Number.isFinite(endsAtMs) && nowMs > endsAtMs) {
      return "closed";
    }

    if (Number.isFinite(startsAtMs) && nowMs < startsAtMs) {
      return "scheduled";
    }

    return ev.isActive ? "active" : "closed";
  };

  const getEffectiveStatusLabel = (ev) => {
    const status = getEffectiveStatus(ev);
    if (status === "closed") return "Encerrado";
    if (status === "scheduled") return "Agendado";
    if (status === "active") return "Ativo";
    return "—";
  };

  const normalizedProgress = useMemo(
    () =>
      progress
        ? normalizeEventProjectProgress(progress, {
            fallbackTargetWords: event?.defaultTargetWords,
          })
        : null,
    [progress, event?.defaultTargetWords]
  );
  const effectiveStatus = useMemo(() => getEffectiveStatus(event), [event]);
  const isEventClosed = effectiveStatus === "closed";
  const effectiveStatusLabel = useMemo(
    () => getEffectiveStatusLabel(event),
    [event]
  );

  const resolvedParticipantStatus = useMemo(() => {
    if (participantStatus) return participantStatus;
    if (!event || !myEvent || !normalizedProgress) return null;

    return buildFallbackParticipantStatus({
      eventId: myEvent.eventId,
      projectId: myEvent.projectId,
      eventName: event.name ?? "Evento",
      projectTitle: myEvent.projectTitle,
      totalWords: normalizedProgress.totalWrittenInEvent,
      targetWords: normalizedProgress.targetWords,
      percent: normalizedProgress.percent,
      remainingWords: normalizedProgress.remainingWords,
      isEventClosed,
      isEventActive: !isEventClosed,
      isWinner: normalizedProgress.won,
    });
  }, [participantStatus, event, myEvent, normalizedProgress, isEventClosed]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [ev, mine, lb] = await Promise.all([
          getEventById(eventId),
          getMyEvents(),
          getEventLeaderboard(eventId).catch(() => []),
        ]);

        if (!mounted) return;

        setEvent(ev);

        const my = Array.isArray(mine)
          ? mine.find((entry) => entry.eventId === eventId)
          : null;

        setMyEvent(my ?? null);

        setLeaderboard(
          Array.isArray(lb?.items)
            ? lb.items
            : Array.isArray(lb)
              ? lb
              : []
        );
      } catch {
        if (mounted) {
          setError("Não foi possível carregar o evento.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!myEvent?.projectId) {
        setProgress(null);
        setParticipantStatus(null);
        return;
      }

      try {
        const [eventProgress, unifiedStatus] = await Promise.all([
          getEventProjectProgress(myEvent.eventId, myEvent.projectId).catch(() => null),
          getEventParticipantStatus(myEvent.eventId, myEvent.projectId).catch(() => null),
        ]);

        if (!mounted) return;

        setProgress(eventProgress);
        setParticipantStatus(
          unifiedStatus ? normalizeParticipantStatus(unifiedStatus) : null
        );
      } catch {
        if (mounted) {
          setProgress(null);
          setParticipantStatus(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [myEvent]);

  if (loading) return <p className="p-6">Carregando evento…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!event) return null;

  return (
    <header className="hero">
      <div className="container hero-inner space-y-10">
        <div>
          <h1 className="text-4xl font-serif font-semibold">{event.name}</h1>

          <p className="text-gray-600 mt-2">
            {event.description || "Evento de escrita."}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
            <div>
              <strong>Meta:</strong> {event.defaultTargetWords}
            </div>
            <div>
              <strong>Status:</strong> {effectiveStatusLabel}
            </div>
            <div>
              <strong>Início:</strong> {formatDate(event.startsAtUtc)}
            </div>
            <div>
              <strong>Fim:</strong> {formatDate(event.endsAtUtc)}
            </div>
          </div>
        </div>

        {isEventClosed ? (
          <section className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-semibold">Word War</h2>
                <p className="text-gray-600 mt-1">
                  Rodadas rápidas em tempo real para disputar palavras no evento {event.name}.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Evento encerrado. Rodadas Word War não estão mais disponíveis.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-medium">
                Encerrado
              </span>
            </div>
          </section>
        ) : (
          <WordWarPanel eventId={eventId} eventName={event.name} />
        )}

        <section>
          <h2 className="text-xl font-serif font-semibold mb-3">Seu progresso</h2>

          {!myEvent ? (
            <p className="text-sm text-gray-500">
              Você ainda não participa deste evento.
            </p>
          ) : resolvedParticipantStatus ? (
            <EventParticipantJourneyCard
              status={resolvedParticipantStatus}
              onOpenValidate={() =>
                navigate(`/validate?eventId=${myEvent.eventId}&projectId=${myEvent.projectId}`)
              }
              onOpenWinner={() =>
                navigate(`/winner?eventId=${myEvent.eventId}&projectId=${myEvent.projectId}`)
              }
              onOpenProject={() => navigate(`/projects/${myEvent.projectId}`)}
            />
          ) : (
            <p className="text-sm text-gray-500">Nenhum progresso ainda.</p>
          )}
        </section>

        <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6">
          <h2 className="text-xl font-serif font-semibold mb-4">Leaderboard</h2>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">Ainda não há ranking.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="text-left w-12">#</th>
                  <th className="text-left">Usuário</th>
                  <th className="text-right w-28">Palavras</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b ${
                      row.userName && user && row.userName === user.displayName
                        ? "bg-[#efe4d6] font-medium"
                        : ""
                    }`}
                  >
                    <td>{index + 1}</td>
                    <td>{row.userName ?? "—"}</td>
                    <td className="text-right">{row.words ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate("/events")}
            className="px-4 py-2 border rounded-lg"
          >
            Voltar
          </button>

          <div className="flex items-center gap-2">
            {myEvent && !isEventClosed && (
              <button
                onClick={async () => {
                  await leaveEvent(eventId, myEvent.projectId);
                  navigate("/events");
                }}
                className="px-4 py-2 border rounded-lg text-rose-600"
              >
                Sair do evento
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
