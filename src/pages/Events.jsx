// src/pages/Events.jsx
import { useEffect, useState } from "react";
import {
  getActiveEvents,
  getEventLeaderboard,
  getEventProgress,
  joinEvent,
  leaveEvent,
  updateEventTarget,
} from "../api/events";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);

  // join
  const [joinProjectId, setJoinProjectId] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");

  // leaderboard + progress
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(null);

  // alterar meta
  const [newTarget, setNewTarget] = useState("");
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetMsg, setTargetMsg] = useState("");

  // 1) carregar eventos
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getActiveEvents();
        if (!mounted) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setEvents(list);
        if (list.length > 0) {
          setSelectedEvent(list[0]);
        }
      } catch (e) {
        if (!mounted) return;
        setErr("Não foi possível carregar os eventos.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) sempre que trocar de evento, carregar leaderboard e progresso
  useEffect(() => {
    if (!selectedEvent?.id) {
      setLeaderboard([]);
      setProgress(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const [lb, prog] = await Promise.all([
          getEventLeaderboard(selectedEvent.id).catch(() => []),
          getEventProgress(selectedEvent.id).catch(() => null),
        ]);

        if (!mounted) return;

        const lbList = Array.isArray(lb?.items) ? lb.items : Array.isArray(lb) ? lb : [];
        setLeaderboard(lbList);
        setProgress(prog);
      } catch {
        if (!mounted) return;
        setLeaderboard([]);
        setProgress(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedEvent]);

  const handleSelectEvent = (ev) => {
    setSelectedEvent(ev);
    setJoinMsg("");
    setTargetMsg("");
    setNewTarget("");
  };

  const handleJoin = async () => {
    if (!selectedEvent?.id) return;
    setJoinLoading(true);
    setJoinMsg("");
    try {
      const payload = {};
      if (joinProjectId) payload.projectId = joinProjectId;
      await joinEvent(selectedEvent.id, payload);
      setJoinMsg("Você entrou no evento!");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível entrar no evento.";
      setJoinMsg(msg);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!selectedEvent?.id) return;
    setJoinLoading(true);
    setJoinMsg("");
    try {
      await leaveEvent(selectedEvent.id);
      setJoinMsg("Você saiu do evento.");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível sair do evento.";
      setJoinMsg(msg);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleUpdateTarget = async () => {
    if (!selectedEvent?.id) return;
    const val = Number(newTarget);
    if (!val || val <= 0) {
      setTargetMsg("Informe uma meta válida (> 0)");
      return;
    }
    setTargetLoading(true);
    setTargetMsg("");
    try {
      await updateEventTarget(selectedEvent.id, {
        targetWords: val,
        goal: val,
      });
      // atualiza no estado local
      setSelectedEvent((ev) =>
        ev ? { ...ev, goal: val, targetWords: val } : ev
      );
      setTargetMsg("Meta do evento atualizada.");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível atualizar a meta.";
      setTargetMsg(msg);
    } finally {
      setTargetLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Eventos</h1>

      {loading && <p>Carregando…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* COLUNA ESQUERDA: lista de eventos */}
          <div className="space-y-2">
            {events.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum evento ativo.</p>
            )}
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => handleSelectEvent(ev)}
                className={`w-full text-left p-3 rounded border ${
                  selectedEvent?.id === ev.id
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white"
                }`}
              >
                <p className="font-medium">
                  {ev.name || ev.title || `Evento ${ev.id}`}
                </p>
                <p className="text-xs text-gray-500">
                  Meta: {ev.goal ?? ev.targetWords ?? "—"} palavras
                </p>
                <p className="text-xs text-gray-400">
                  {ev.startDate?.slice(0, 10) || "—"} →{" "}
                  {ev.endDate?.slice(0, 10) || "—"}
                </p>
              </button>
            ))}
          </div>

          {/* COLUNA DIREITA (2 colunas): detalhe, join, progresso, leaderboard */}
          <div className="md:col-span-2 space-y-4">
            {selectedEvent ? (
              <>
                {/* Detalhe do evento */}
                <div className="border rounded p-4 bg-white/70">
                  <h2 className="text-lg font-semibold mb-1">
                    {selectedEvent.name || selectedEvent.title}
                  </h2>
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedEvent.description || "Evento de escrita."}
                  </p>
                  <p className="text-sm">
                    Meta:{" "}
                    <strong>
                      {selectedEvent.goal ??
                        selectedEvent.targetWords ??
                        "—"}{" "}
                      palavras
                    </strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Início: {selectedEvent.startDate?.slice(0, 10) || "—"} | Fim:{" "}
                    {selectedEvent.endDate?.slice(0, 10) || "—"}
                  </p>
                </div>

                {/* Entrar / sair */}
                <div className="border rounded p-4 bg-white/70 space-y-2">
                  <p className="text-sm mb-1">
                    Participar usando um projeto (opcional):
                  </p>
                  <input
                    className="border rounded p-2 w-full"
                    placeholder="projectId (ex.: 123)"
                    value={joinProjectId}
                    onChange={(e) => setJoinProjectId(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleJoin}
                      disabled={joinLoading}
                      className="px-4 py-2 border rounded"
                    >
                      {joinLoading ? "Entrando..." : "Entrar no evento"}
                    </button>
                    <button
                      onClick={handleLeave}
                      disabled={joinLoading}
                      className="px-4 py-2 border rounded text-red-700"
                    >
                      Sair
                    </button>
                  </div>
                  {joinMsg && <p className="text-sm">{joinMsg}</p>}
                </div>

                {/* Alterar meta do evento */}
                <div className="border rounded p-4 bg-white/70 space-y-2">
                  <p className="text-sm font-medium">
                    Alterar meta do evento (admin)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      className="border rounded p-2 w-full"
                      placeholder="nova meta (palavras)"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                    />
                    <button
                      onClick={handleUpdateTarget}
                      disabled={targetLoading}
                      className="px-3 py-2 border rounded"
                    >
                      {targetLoading ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                  {targetMsg && (
                    <p className="text-sm text-gray-700">{targetMsg}</p>
                  )}
                </div>

                {/* Progresso do evento */}
                <div className="border rounded p-4 bg-white/70 space-y-2">
                  <h3 className="font-semibold">Seu progresso</h3>
                  {progress ? (
                    <>
                      <p className="text-sm">
                        {progress.totalWords ?? progress.current ?? 0} /{" "}
                        {progress.targetWords ?? progress.goal ?? 0} palavras
                      </p>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-3 bg-indigo-500"
                          style={{
                            width: `${calcPercent(progress)}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nenhum progresso ainda.
                    </p>
                  )}
                </div>

                {/* Leaderboard */}
                <div className="border rounded p-4 bg-white/70 space-y-2">
                  <h3 className="font-semibold">Leaderboard</h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Ainda não há ranking.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Usuário</th>
                            <th className="text-left p-2">Palavras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((row, idx) => (
                            <tr
                              key={row.id || row.userId || idx}
                              className="border-b"
                            >
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2">
                                {row.userName ||
                                  row.username ||
                                  row.displayName ||
                                  "—"}
                              </td>
                              <td className="p-2">
                                {row.totalWords ??
                                  row.words ??
                                  row.wordCount ??
                                  0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Selecione um evento na lista.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function calcPercent(p) {
  const current = p?.totalWords ?? p?.current ?? 0;
  const target = p?.targetWords ?? p?.goal ?? 0;
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}
