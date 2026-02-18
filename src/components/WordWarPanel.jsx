import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createWordWar,
  finishWordWar,
  getActiveWordWar,
  getWordWarScoreboard,
  joinWordWar,
  leaveWordWar,
  startWordWar,
  submitWordWarCheckpoint,
} from "../api/events";
import { getProjects } from "../api/projects";
import { useAuth } from "../context/AuthContext";
import FeedbackModal from "./FeedbackModal.jsx";

const FINAL_STATUSES = new Set(["finished", "cancelled"]);

function sameGuid(a, b) {
  return String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
}

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;
  const isTechnical = (value) =>
    /system\.|exception|stack trace|nullable object|materialization|sql|guid/i.test(String(value ?? ""));

  if (typeof responseData === "string" && responseData.trim().length > 0) {
    if (isTechnical(responseData)) return fallbackMessage;
    return responseData;
  }

  if (responseData?.title) {
    if (isTechnical(responseData.title)) return fallbackMessage;
    return responseData.title;
  }

  if (responseData?.message) {
    if (isTechnical(responseData.message)) return fallbackMessage;
    return responseData.message;
  }

  if (error?.message) {
    if (isTechnical(error.message)) return fallbackMessage;
    return error.message;
  }

  return fallbackMessage;
}

function shortId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "Participante";
  if (text.length <= 10) return text;
  return `${text.slice(0, 8)}...`;
}

export default function WordWarPanel({ eventId, eventName }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [checkpointWords, setCheckpointWords] = useState("");

  const [war, setWar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [pollingError, setPollingError] = useState("");

  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clockTick, setClockTick] = useState(0);
  const pollingTimeoutRef = useRef(null);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  const projectsById = useMemo(
    () => new Map((projects || []).map((project) => [project.id, project])),
    [projects]
  );

  const participants = useMemo(() => {
    const list = Array.isArray(war?.participants) ? [...war.participants] : [];
    list.sort((a, b) => {
      const rankA = Number(a?.finalRank ?? 99999);
      const rankB = Number(b?.finalRank ?? 99999);
      if (rankA !== rankB) return rankA - rankB;
      return Number(b?.wordsInRound ?? 0) - Number(a?.wordsInRound ?? 0);
    });
    return list;
  }, [war?.participants]);

  const myParticipant = useMemo(
    () => participants.find((participant) => sameGuid(participant.userId, user?.id)) || null,
    [participants, user?.id]
  );

  const warStatus = war?.status ?? "none";
  const isWaiting = warStatus === "waiting";
  const isRunning = warStatus === "running";
  const isFinal = FINAL_STATUSES.has(warStatus);

  const topWords = useMemo(() => {
    if (!participants.length) return 0;
    return participants.reduce((acc, participant) => {
      const value = Number(participant?.wordsInRound ?? 0);
      return value > acc ? value : acc;
    }, 0);
  }, [participants]);

  const winner = participants.length > 0 ? participants[0] : null;

  const remainingSeconds = useMemo(() => {
    if (!war) return 0;
    if (isFinal) return 0;

    const endsAtMs = Date.parse(war.endsAtUtc ?? "");
    if (Number.isFinite(endsAtMs)) {
      const nowMs = Date.now() + serverOffsetMs;
      return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
    }

    return Math.max(0, Number(war.remainingSeconds ?? 0));
  }, [war, isFinal, serverOffsetMs, clockTick]);

  const updateServerOffset = useCallback((serverNowUtc) => {
    const serverNowMs = Date.parse(serverNowUtc ?? "");
    if (!Number.isFinite(serverNowMs)) return;
    setServerOffsetMs(serverNowMs - Date.now());
  }, []);

  const refreshWordWar = useCallback(
    async ({ silent = false } = {}) => {
      const active = await getActiveWordWar(eventId);

      if (!active || !active.id) {
        setWar(null);
        if (!silent) setPollingError("");
        return null;
      }

      updateServerOffset(active.serverNowUtc);

      try {
        const scoreboard = await getWordWarScoreboard(active.id);
        updateServerOffset(scoreboard.serverNowUtc);

        const merged = {
          ...active,
          ...scoreboard,
          id: scoreboard.id || active.id,
          eventId: active.eventId || scoreboard.eventId || eventId,
          status: scoreboard.status || active.status,
          participants: Array.isArray(scoreboard.participants)
            ? scoreboard.participants
            : Array.isArray(active.participants)
              ? active.participants
              : [],
        };

        setWar(merged);
        if (!silent) setPollingError("");
        return merged;
      } catch (error) {
        setWar(active);
        if (!silent) {
          setPollingError(
            getApiErrorMessage(error, "Não foi possível atualizar o placar agora.")
          );
        }
        return active;
      }
    },
    [eventId, updateServerOffset]
  );

  const openFeedback = useCallback((next) => {
    setFeedback({
      open: true,
      type: next.type || "info",
      title: next.title || "Atenção",
      message: next.message || "",
      primaryLabel: next.primaryLabel || "OK",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setPollingError("");

      try {
        const [projectRows] = await Promise.all([getProjects()]);
        if (cancelled) return;

        const normalizedProjects = Array.isArray(projectRows) ? projectRows : [];
        setProjects(normalizedProjects);
        if (normalizedProjects.length > 0) {
          setSelectedProjectId((current) => current || normalizedProjects[0]?.id || "");
        }

        await refreshWordWar({ silent: true });
      } catch (error) {
        if (cancelled) return;
        setPollingError(getApiErrorMessage(error, "Não foi possível carregar o painel de Word War."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [refreshWordWar]);

  useEffect(() => {
    if (!war?.id || isFinal) return;

    let cancelled = false;

    const runPolling = async () => {
      if (cancelled) return;

      try {
        const refreshed = await refreshWordWar({ silent: true });
        if (cancelled) return;

        if (!refreshed || FINAL_STATUSES.has(refreshed.status)) {
          return;
        }

        const nextDelay = refreshed.status === "running" ? 2000 : 5000;
        pollingTimeoutRef.current = setTimeout(runPolling, nextDelay);
      } catch {
        if (!cancelled) {
          pollingTimeoutRef.current = setTimeout(runPolling, 5000);
        }
      }
    };

    const initialDelay = war.status === "running" ? 2000 : 5000;
    pollingTimeoutRef.current = setTimeout(runPolling, initialDelay);

    return () => {
      cancelled = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [war?.id, war?.status, isFinal, refreshWordWar]);

  useEffect(() => {
    if (!war?.id || isFinal) return;

    const timer = setInterval(() => {
      setClockTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [war?.id, isFinal]);

  const executeAction = useCallback(
    async ({ key, action, successTitle, successMessage, errorMessage }) => {
      if (busyAction) return;

      try {
        setBusyAction(key);
        await action();
        const refreshed = await refreshWordWar();

        if (successTitle) {
          openFeedback({
            type: "success",
            title: successTitle,
            message: successMessage,
            primaryLabel: "OK",
          });
        }

        return refreshed;
      } catch (error) {
        openFeedback({
          type: "error",
          title: "Não foi possível concluir",
          message: getApiErrorMessage(error, errorMessage),
          primaryLabel: "OK",
        });
        return null;
      } finally {
        setBusyAction("");
      }
    },
    [busyAction, openFeedback, refreshWordWar]
  );

  const handleCreate = async () => {
    const parsedDuration = Number(durationMinutes);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      openFeedback({
        type: "warning",
        title: "Duração inválida",
        message: "Informe uma duração em minutos maior que zero.",
      });
      return;
    }

    await executeAction({
      key: "create",
      action: () =>
        createWordWar({
          eventId,
          durationMinutes: Math.round(parsedDuration),
        }),
      successTitle: "Rodada criada",
      successMessage: "A rodada foi criada e está aguardando início.",
      errorMessage: "Não foi possível criar a rodada agora.",
    });
  };

  const handleJoin = async () => {
    if (!war?.id) return;

    if (!selectedProjectId) {
      openFeedback({
        type: "warning",
        title: "Escolha um projeto",
        message: "Selecione um projeto para entrar na rodada.",
      });
      return;
    }

    await executeAction({
      key: "join",
      action: () => joinWordWar({ warId: war.id, projectId: selectedProjectId }),
      successTitle: "Você entrou na rodada",
      successMessage: "Sua participação foi confirmada.",
      errorMessage: "Não foi possível entrar na rodada.",
    });
  };

  const handleLeave = async () => {
    if (!war?.id) return;

    await executeAction({
      key: "leave",
      action: () => leaveWordWar(war.id),
      successTitle: "Saída confirmada",
      successMessage: "Você saiu da rodada.",
      errorMessage: "Não foi possível sair da rodada.",
    });
  };

  const handleStart = async () => {
    if (!war?.id) return;

    await executeAction({
      key: "start",
      action: () => startWordWar(war.id),
      successTitle: "Rodada iniciada",
      successMessage: "O cronômetro começou. Boa escrita!",
      errorMessage: "Não foi possível iniciar a rodada.",
    });
  };

  const handleFinish = async () => {
    if (!war?.id) return;

    await executeAction({
      key: "finish",
      action: () => finishWordWar(war.id),
      successTitle: "Rodada encerrada",
      successMessage: "O resultado final foi registrado.",
      errorMessage: "Não foi possível encerrar a rodada.",
    });
  };

  const handleCheckpoint = async () => {
    if (!war?.id) return;

    const parsedWords = Number(checkpointWords);
    if (!Number.isFinite(parsedWords) || parsedWords < 0) {
      openFeedback({
        type: "warning",
        title: "Valor inválido",
        message: "Informe uma quantidade de palavras maior ou igual a zero.",
      });
      return;
    }

    await executeAction({
      key: "checkpoint",
      action: () =>
        submitWordWarCheckpoint({
          warId: war.id,
          wordsInRound: Math.floor(parsedWords),
        }),
      successTitle: "Checkpoint enviado",
      successMessage: "Seu placar foi atualizado.",
      errorMessage: "Não foi possível enviar seu checkpoint.",
    });
  };

  const statusPillClassName =
    warStatus === "running"
      ? "bg-emerald-100 text-emerald-700"
      : warStatus === "waiting"
        ? "bg-amber-100 text-amber-700"
        : isFinal
          ? "bg-slate-200 text-slate-700"
          : "bg-slate-100 text-slate-600";

  const statusLabel =
    warStatus === "running"
      ? "Rodada em andamento"
      : warStatus === "waiting"
        ? "Aguardando início"
        : warStatus === "finished"
          ? "Rodada finalizada"
          : "Sem rodada ativa";

  return (
    <section className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-semibold">Word War</h2>
          <p className="text-sm text-gray-600">
            Rodadas rápidas em tempo real para disputar palavras no evento {eventName || "atual"}.
          </p>
        </div>

        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusPillClassName}`}>
          {statusLabel}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando dados da rodada…</p>
      ) : (
        <>
          {!war && (
            <div className="rounded-lg border border-dashed border-[#d9cbb7] bg-white p-4 space-y-4">
              <p className="text-sm text-gray-600">Nenhuma rodada ativa no momento. Crie uma rodada para começar.</p>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-sm text-gray-700">
                  <span className="mb-1 font-medium">Duração (minutos)</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    className="w-48 rounded-lg border border-[#d7cab4] bg-white px-3 py-2"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busyAction === "create"}
                  className="rounded-lg bg-[#2f5f7b] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === "create" ? "Criando…" : "Criar rodada"}
                </button>
              </div>
            </div>
          )}

          {war && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#eadfce] bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Tempo restante</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatCountdown(remainingSeconds)}
                  </p>
                </div>

                <div className="rounded-lg border border-[#eadfce] bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Duração</p>
                  <p className="mt-1 text-xl font-semibold">{war.durationMinutes || 0} min</p>
                </div>

                <div className="rounded-lg border border-[#eadfce] bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Participantes</p>
                  <p className="mt-1 text-xl font-semibold">{participants.length}</p>
                </div>
              </div>

              {isWaiting && (
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={busyAction === "start"}
                      className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyAction === "start" ? "Iniciando…" : "Iniciar rodada"}
                    </button>

                    {!myParticipant ? (
                      <>
                        <select
                          value={selectedProjectId}
                          onChange={(event) => setSelectedProjectId(event.target.value)}
                          className="min-w-[220px] rounded-lg border border-[#d7cab4] bg-white px-3 py-2"
                        >
                          <option value="">Escolha um projeto…</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title || "Projeto sem título"}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={handleJoin}
                          disabled={busyAction === "join" || !selectedProjectId}
                          className="rounded-lg bg-[#2f5f7b] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyAction === "join" ? "Entrando…" : "Entrar na rodada"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLeave}
                        disabled={busyAction === "leave"}
                        className="rounded-lg border border-rose-300 px-4 py-2 font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === "leave" ? "Saindo…" : "Sair da rodada"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isRunning && (
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  {myParticipant ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col text-sm text-gray-700">
                        <span className="mb-1 font-medium">Palavras no round</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={checkpointWords}
                          onChange={(event) => setCheckpointWords(event.target.value)}
                          placeholder={String(myParticipant.wordsInRound ?? 0)}
                          className="w-52 rounded-lg border border-[#d7cab4] bg-white px-3 py-2"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleCheckpoint}
                        disabled={busyAction === "checkpoint"}
                        className="rounded-lg bg-[#2f5f7b] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === "checkpoint" ? "Enviando…" : "Enviar checkpoint"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Rodada em andamento. Você pode acompanhar o placar em tempo real.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={busyAction === "finish"}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === "finish" ? "Encerrando…" : "Encerrar rodada"}
                  </button>
                </div>
              )}

              {isFinal && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-800">Resultado final</h3>
                  {winner ? (
                    <p className="mt-1 text-sm text-emerald-900">
                      Vencedor: <strong>{sameGuid(winner.userId, user?.id) ? "Você" : shortId(winner.userId)}</strong>
                      {" "}com {Number(winner.wordsInRound || 0).toLocaleString("pt-BR")} palavras.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-900">A rodada foi encerrada sem participantes.</p>
                  )}

                  {myParticipant && (
                    <p className="mt-1 text-sm text-emerald-900">
                      Sua posição final: <strong>#{Number(myParticipant.finalRank || 0) || participants.findIndex((p) => sameGuid(p.userId, user?.id)) + 1}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Placar da rodada</h3>

                {participants.length === 0 ? (
                  <p className="text-sm text-gray-500">Ainda não há participantes nesta rodada.</p>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant, index) => {
                      const words = Number(participant.wordsInRound || 0);
                      const rank = Number(participant.finalRank || index + 1);
                      const isMe = sameGuid(participant.userId, user?.id);
                      const projectTitle = projectsById.get(participant.projectId)?.title || "Projeto";
                      const width = topWords > 0 ? Math.min(100, Math.round((words / topWords) * 100)) : 0;

                      return (
                        <article
                          key={`${participant.userId}-${participant.projectId}-${rank}`}
                          className={`rounded-lg border p-3 ${isMe ? "border-indigo-300 bg-indigo-50" : "border-[#eadfce] bg-white"}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              #{rank} {isMe ? "Você" : shortId(participant.userId)}
                            </p>
                            <p className="text-sm text-gray-600">{words.toLocaleString("pt-BR")} palavras</p>
                          </div>

                          <p className="text-xs text-gray-500 mt-1">{projectTitle}</p>

                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e6dccb]">
                            <div
                              className={isFinal && rank === 1
                                ? "h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600"
                                : "h-2 bg-[#4f46e5]"
                              }
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {pollingError && (
            <p className="text-sm text-rose-600">{pollingError}</p>
          )}
        </>
      )}

      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onClose={() => setFeedback((previous) => ({ ...previous, open: false }))}
      />
    </section>
  );
}
