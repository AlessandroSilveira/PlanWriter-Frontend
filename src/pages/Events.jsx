import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import { getActiveEvents, getMyEvents, joinEvent } from "../api/events";
import JoinEventModal from "../components/JoinEventModal";
import FeedbackModal from "../components/FeedbackModal.jsx";

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  if (data?.message) return data.message;
  if (data?.title) return data.title;
  return error?.message || "Não foi possível concluir sua participação.";
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

  const myEventIds = useMemo(
    () => new Set(myEvents.map((entry) => entry.eventId)),
    [myEvents]
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
        eventId: joinModalEvent.id,
        projectId,
      });

      const mine = await getMyEvents();
      setMyEvents(Array.isArray(mine) ? mine : []);
      setJoinModalEvent(null);

      setFeedback({
        open: true,
        type: "success",
        title: "Participação confirmada",
        message: `Você entrou no evento "${joinModalEvent.name}".`,
        primaryLabel: "Ver detalhes",
        onPrimary: () => {
          const targetEventId = joinModalEvent.id;
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
                  key={ev.id}
                  className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm uppercase tracking-wide text-gray-500 mb-1">Evento</p>

                    <h3 className="text-xl font-serif font-semibold">{ev.name}</h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(ev.startsAtUtc)} → {formatDate(ev.endsAtUtc)}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Meta: {ev.defaultTargetWords} palavras
                    </p>
                  </div>

                  {myEventIds.has(ev.id) ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${ev.id}`)}
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

          {myEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Você ainda não participa de nenhum evento.</p>
          ) : (
            <div className="space-y-4">
              {myEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 shadow-sm"
                >
                  <p className="text-sm uppercase tracking-wide text-gray-500 mb-1">Evento</p>

                  <h3 className="text-2xl font-serif font-semibold">{ev.eventName}</h3>

                  <p className="text-sm text-gray-600 mb-3">
                    Projeto: {ev.projectTitle ?? "Participação individual"}
                  </p>

                  <div className="h-2 bg-[#e6dccb] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-2 bg-[#8b6b4f]"
                      style={{ width: `${Math.min(ev.percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {Math.min(ev.percent, 100)}% concluído
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate(`/events/${ev.eventId}`)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
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
