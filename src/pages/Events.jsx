import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import { getActiveEvents, getMyEvents, joinEvent } from "../api/events";
import JoinEventModal from "../components/JoinEventModal";
import FeedbackModal from "../components/FeedbackModal.jsx";
import EventProgressStatusCard from "../components/EventProgressStatusCard.jsx";
import {
  normalizeEntityId,
  normalizeMyEventProgress,
  resolveTargetWords,
} from "../utils/eventProgress";

function getApiErrorMessage(error) {
  const fallback = "Não foi possível concluir sua participação agora. Tente novamente.";
  const status = Number(error?.response?.status ?? 0);
  if (status === 400) return fallback;
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para participar deste evento.";
  if (status === 404) return "Evento ou projeto não encontrado.";
  if (status >= 500) return "Estamos com instabilidade no servidor. Tente novamente em instantes.";

  const data = error?.response?.data;
  const isTechnical = (value) =>
    /system\.|exception|stack trace|nullable object|materialization|sql|guid|invalidoperationexception|keynotfoundexception|request failed with status code/i.test(
      String(value ?? "")
    );

  if (typeof data === "string" && data.trim().length > 0) {
    return isTechnical(data) ? fallback : data;
  }

  if (data?.message) {
    return isTechnical(data.message) ? fallback : data.message;
  }
  if (data?.title) {
    return isTechnical(data.title) ? fallback : data.title;
  }

  if (error?.message) {
    return isTechnical(error.message) ? fallback : error.message;
  }

  return fallback;
}

export default function Events() {
  const navigate = useNavigate();

  const [activeEvents, setActiveEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [joinModalEvent, setJoinModalEvent] = useState(null);
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
    onPrimary: null,
  });

  const activeEventsById = useMemo(() => {
    const map = new Map();
    for (const eventItem of activeEvents) {
      const key = normalizeEntityId(eventItem?.id ?? eventItem?.Id);
      if (!key) continue;
      map.set(key, eventItem);
    }
    return map;
  }, [activeEvents]);

  const normalizedMyEvents = useMemo(() => {
    return myEvents
      .map((entry) => {
        const eventIdKey = normalizeEntityId(entry?.eventId ?? entry?.EventId ?? entry?.id ?? entry?.Id);
        const activeEvent = activeEventsById.get(eventIdKey);
        const fallbackTargetWords = activeEvent?.defaultTargetWords ?? activeEvent?.DefaultTargetWords;
        return normalizeMyEventProgress(entry, { fallbackTargetWords });
      })
      .filter((entry) => Boolean(entry.eventId));
  }, [myEvents, activeEventsById]);

  const myEventIds = useMemo(
    () => new Set(normalizedMyEvents.map((entry) => normalizeEntityId(entry.eventId))),
    [normalizedMyEvents]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [active, mine, projectsData] = await Promise.all([
          getActiveEvents(),
          getMyEvents(),
          getProjects(),
        ]);

        if (!mounted) return;

        setActiveEvents(Array.isArray(active?.items) ? active.items : active ?? []);
        setMyEvents(Array.isArray(mine) ? mine : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch {
        if (mounted) {
          setError("Não foi possível carregar os eventos.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p className="p-6">Carregando eventos…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function openJoinFlow(eventItem) {
    if (!projects.length) {
      setFeedback({
        open: true,
        type: "warning",
        title: "Você precisa de um projeto",
        message: "Crie um projeto antes de participar do evento.",
        primaryLabel: "Ir para projetos",
        onPrimary: () => {
          setFeedback((prev) => ({ ...prev, open: false }));
          navigate("/projects");
        },
      });
      return;
    }

    setJoinModalEvent(eventItem);
  }

  async function handleConfirmJoin(projectId) {
    if (!joinModalEvent || !projectId || joining) return;

    try {
      setJoining(true);

      await joinEvent({
        eventId: joinModalEvent.id ?? joinModalEvent.Id,
        projectId,
      });

      const mine = await getMyEvents();
      setMyEvents(Array.isArray(mine) ? mine : []);
      setJoinModalEvent(null);

      setFeedback({
        open: true,
        type: "success",
        title: "Participação confirmada",
        message: `Você entrou no evento "${joinModalEvent.name ?? joinModalEvent.Name}".`,
        primaryLabel: "Ver detalhes",
        onPrimary: () => {
          const targetEventId = joinModalEvent.id ?? joinModalEvent.Id;
          setFeedback((prev) => ({ ...prev, open: false }));
          navigate(`/events/${targetEventId}`);
        },
      });
    } catch (joinError) {
      setFeedback({
        open: true,
        type: "error",
        title: "Não foi possível participar",
        message: getApiErrorMessage(joinError),
        primaryLabel: "OK",
        onPrimary: null,
      });
    } finally {
      setJoining(false);
    }
  }

  return (
    <header className="hero">
      <div className="container hero-inner">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-gray-900">Eventos</h1>
          <p className="text-gray-600 mt-2">
            Participe de desafios de escrita e acompanhe seu desempenho.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-serif font-semibold mb-4">Eventos ativos</h2>

          {activeEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum evento ativo no momento.</p>
          ) : (
            <div className="space-y-4">
              {activeEvents.map((ev) => (
                <div
                  key={ev.id ?? ev.Id}
                  className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm uppercase tracking-wide text-gray-500 mb-1">Evento</p>

                    <h3 className="text-xl font-serif font-semibold">{ev.name ?? ev.Name}</h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(ev.startsAtUtc)} → {formatDate(ev.endsAtUtc)}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Meta:{" "}
                      {resolveTargetWords(
                        ev.defaultTargetWords ?? ev.DefaultTargetWords,
                        null,
                        null
                      ).toLocaleString("pt-BR")}{" "}
                      palavras
                    </p>
                  </div>

                  {myEventIds.has(normalizeEntityId(ev.id ?? ev.Id)) ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${ev.id ?? ev.Id}`)}
                      className="px-5 py-2 border rounded-lg"
                    >
                      Detalhes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openJoinFlow(ev)}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                      Participar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-[#e7dccd]" />

        <section>
          <h2 className="text-2xl font-serif font-semibold mb-4">Meus eventos</h2>

          {normalizedMyEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Você ainda não participa de nenhum evento.</p>
          ) : (
            <div className="space-y-4">
              {normalizedMyEvents.map((ev) => (
                <EventProgressStatusCard
                  key={`${ev.eventId}-${ev.projectId ?? "no-project"}`}
                  eventName={ev.eventName}
                  projectTitle={ev.projectTitle}
                  totalWords={ev.totalWrittenInEvent}
                  targetWords={ev.targetWords}
                  percent={ev.percent}
                  remainingWords={ev.remainingWords}
                  won={ev.won}
                  onAction={() => navigate(`/events/${ev.eventId}`)}
                  actionLabel="Detalhes"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {joinModalEvent && (
        <JoinEventModal
          event={joinModalEvent}
          projects={projects}
          loading={joining}
          onClose={() => {
            if (!joining) setJoinModalEvent(null);
          }}
          onConfirm={handleConfirmJoin}
        />
      )}

      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onPrimary={feedback.onPrimary || undefined}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </header>
  );
}
