import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEventById,
  getMyEvents,
  getEventProjectProgress,
  getEventLeaderboard,
  leaveEvent,
} from "../api/events";
import { useAuth } from "../context/AuthContext";
import WordWarPanel from "../components/WordWarPanel.jsx";
import EventProgressStatusCard from "../components/EventProgressStatusCard.jsx";
import { normalizeEventProjectProgress } from "../utils/eventProgress";

export default function EventDetails() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [myEvent, setMyEvent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("pt-BR") : "—";

  const getEffectiveStatusLabel = (ev) => {
    if (!ev) return "—";

    const nowMs = Date.now();
    const startsAtMs = Date.parse(ev.startsAtUtc ?? ev.StartsAtUtc ?? "");
    const endsAtMs = Date.parse(ev.endsAtUtc ?? ev.EndsAtUtc ?? "");

    if (Number.isFinite(endsAtMs) && nowMs > endsAtMs) {
      return "Encerrado";
    }

    if (Number.isFinite(startsAtMs) && nowMs < startsAtMs) {
      return "Agendado";
    }

    return ev.isActive ? "Ativo" : "Encerrado";
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

  const percent = normalizedProgress?.percent ?? 0;
  const isCompleted = normalizedProgress?.won ?? false;

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
        return;
      }

      try {
        const eventProgress = await getEventProjectProgress(
          myEvent.eventId,
          myEvent.projectId
        );

        if (mounted) setProgress(eventProgress);
      } catch {
        if (mounted) setProgress(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [myEvent]);

  if (loading) return <p className="p-6">Carregando evento…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!event) return null;

  const effectiveStatusLabel = getEffectiveStatusLabel(event);

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

        <WordWarPanel eventId={eventId} eventName={event.name} />

        <section>
          <h2 className="text-xl font-serif font-semibold mb-3">Seu progresso</h2>

          {!myEvent ? (
            <p className="text-sm text-gray-500">
              Você ainda não participa deste evento.
            </p>
          ) : normalizedProgress ? (
            <EventProgressStatusCard
              eventName={event.name}
              projectTitle={myEvent.projectTitle}
              totalWords={normalizedProgress.totalWrittenInEvent}
              targetWords={normalizedProgress.targetWords}
              percent={percent}
              remainingWords={normalizedProgress.remainingWords}
              won={isCompleted}
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

          {myEvent && (
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
    </header>
  );
}
