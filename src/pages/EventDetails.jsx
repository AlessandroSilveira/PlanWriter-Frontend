import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEventById,
  getMyEvents,
  getEventProjectProgress,
  getEventLeaderboard,
  leaveEvent,
} from "../api/events";
import { useAuth } from "../context/AuthContext";

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
  


  /* ===============================
     HELPERS
  =============================== */
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const percent = progress?.percent ?? 0;
  const isCompleted = progress?.percent >= 100;

  /* ===============================
     CARREGAR EVENTO + PARTICIPAÇÃO
  =============================== */
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
          ? mine.find((e) => e.eventId === eventId)
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

  /* ===============================
     PROGRESSO (SÓ SE PARTICIPA)
  =============================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!myEvent?.projectId) {
        setProgress(null);
        return;
      }

      try {
        const prog = await getEventProjectProgress(
          myEvent.eventId,
          myEvent.projectId
        );
        if (mounted) setProgress(prog);
      } catch {
        if (mounted) setProgress(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [myEvent]);

  /* ===============================
     ESTADOS DE TELA
  =============================== */
  if (loading) return <p className="p-6">Carregando evento…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!event) return null;

  /* ===============================
     UI
  =============================== */
  return (
    <header className="hero">
      <div className="container hero-inner space-y-10">
        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-serif font-semibold">
            {event.name}
          </h1>

          <p className="text-gray-600 mt-2">
            {event.description || "Evento de escrita."}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
            <div>
              <strong>Meta:</strong> {event.defaultTargetWords}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              {event.isActive ? "Ativo" : "Encerrado"}
            </div>
            <div>
              <strong>Início:</strong> {formatDate(event.startsAtUtc)}
            </div>
            <div>
              <strong>Fim:</strong> {formatDate(event.endsAtUtc)}
            </div>
          </div>
        </div>

        {/* PROGRESSO */}
        <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6">
          <h2 className="text-xl font-serif font-semibold mb-3">
            Seu progresso
          </h2>

          {!myEvent ? (
            <p className="text-sm text-gray-500">
              Você ainda não participa deste evento.
            </p>
          ) : progress ? (
            <>
              <p className="mb-2 text-sm">
                {progress.totalWrittenInEvent} /{" "}
                {progress.targetWords} palavras
              </p>

              <div className="h-2 bg-[#e6dccb] rounded-full overflow-hidden mb-3">
                <div
                  className="h-2 bg-[#8b6b4f]"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>

              <p className="text-sm text-gray-600">
  {isCompleted
    ? "Meta concluída 🎉"
    : `${progress.percent}% concluído • ${progress.remaining} palavras restantes`}
</p>

            </>
          ) : (
            <p className="text-sm text-gray-500">
              Nenhum progresso ainda.
            </p>
          )}
        </div>

        {/* LEADERBOARD */}
        <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6">
          <h2 className="text-xl font-serif font-semibold mb-4">
            Leaderboard
          </h2>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">
              Ainda não há ranking.
            </p>
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
                {leaderboard.map((row, idx) => (
                  <tr
  key={idx}
  className={`border-b ${
    row.userName && user && row.userName === user.displayName
      ? "bg-[#efe4d6] font-medium"
      : ""
  }`}
>

                    <td>{idx + 1}</td>
                    <td>{row.userName ?? "—"}</td>
                    <td className="text-right">
                      {row.words ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AÇÕES */}
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
                await leaveEvent(eventId);
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
