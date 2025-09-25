// src/pages/Events.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  getActiveEvents,
  getEventById,
  getEventProgress,
  joinEvent as apiJoinEvent,
  updateEventTarget as apiUpdateTarget,
  leaveEvent as apiLeaveEvent,
} from "../api/events";

import { getProjects } from "../api/projects";
import EventLeaderboard from "../components/EventLeaderboard.jsx";
import ProgressModal from "../components/ProgressModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Skeleton from "../components/Skeleton.jsx"; // default import
import { downloadCSV } from "../utils/csv";
import Alert from "../components/Alert.jsx";

/* Utils */
function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}
const fmt = (n) => (Number(n) || 0).toLocaleString("pt-BR");
const fmtDateBR = (d) => {
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return String(d ?? ""); }
};

/* Página */
export default function Events() {
  const q = useQuery();
  const navigate = useNavigate();

  const qEventId = q.get("eventId") || "";
  const qProjectId = q.get("projectId") || "";

  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState(qEventId);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(qProjectId);

  const [progress, setProgress] = useState(null);
  const [target, setTarget] = useState(50000);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [openAddProgress, setOpenAddProgress] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const list = await getActiveEvents();
      const arr = Array.isArray(list) ? list : [];
      setEvents(arr);
      let id = qEventId;
      if (!id && arr.length) id = arr[0].id ?? arr[0].Id ?? "";
      setEventId(id || "");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao carregar eventos ativos.");
    } finally {
      setLoading(false);
    }
  }, [qEventId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await fetchEvents();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, [fetchEvents]);

  useEffect(() => {
    let alive = true;
    if (!eventId) {
      setEvent(null);
      return;
    }
    (async () => {
      try {
        const ev = await getEventById(eventId);
        if (!alive) return;
        setEvent(ev || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar o evento.");
        setEvent(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getProjects();
        const arr = Array.isArray(list) ? list : [];
        if (!alive) return;
        setProjects(arr);
        if (!qProjectId && arr[0]) {
          setProjectId(arr[0].id ?? arr[0].projectId ?? "");
        }
      } catch (e) {
        if (!alive) return;
        setErr((prev) => prev || e?.response?.data?.message || e?.message || "Falha ao carregar projetos.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [qProjectId]);

  const loadProgress = async (eid, pid) => {
    if (!eid || !pid) {
      setProgress(null);
      return;
    }
    try {
      const p = await getEventProgress({ eventId: eid, projectId: pid });
      setProgress(p || null);
      const tgt =
        Number(p?.targetWords ?? p?.TargetWords) ||
        Number(event?.defaultTargetWords ?? event?.DefaultTargetWords) ||
        50000;
      setTarget(tgt);
    } catch {
      setProgress(null);
      const fallback =
        Number(event?.defaultTargetWords ?? event?.DefaultTargetWords) || 50000;
      setTarget(fallback);
    }
  };

  useEffect(() => {
    loadProgress(eventId, projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, projectId]);

  const evName = event?.name ?? event?.Name ?? "Evento";
  const evStart = event?.startsAtUtc ?? event?.startsAt ?? event?.StartsAtUtc;
  const evEnd = event?.endsAtUtc ?? event?.endsAt ?? event?.EndsAtUtc;
  const evDefaultTarget =
    Number(event?.defaultTargetWords ?? event?.DefaultTargetWords ?? 0) || 0;

  const joined = !!(progress?.joined ?? progress?.isJoined ?? progress?.targetWords);
  const won = !!(progress?.won ?? progress?.Won);
  const total = Number(progress?.totalWritten ?? progress?.TotalWritten ?? 0) || 0;
  const targetWords = Number(progress?.targetWords ?? progress?.TargetWords ?? target) || 0;
  const percent = Math.min(100, Math.max(0, targetWords ? (total / targetWords) * 100 : 0));
  const dailyTarget = useMemo(() => {
    const t = targetWords || evDefaultTarget || 0;
    return t ? Math.ceil(t / 30) : 0;
  }, [targetWords, evDefaultTarget]);

  const selectedProject = useMemo(
    () => projects.find((p) => (p.id ?? p.projectId) === projectId),
    [projects, projectId]
  );

  const joinEvent = async () => {
    if (!eventId || !projectId || !Number(target)) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      if (typeof apiJoinEvent === "function") {
        await apiJoinEvent(eventId, { projectId, targetWords: Number(target) });
      } else {
        await axios.post(`/api/events/${eventId}/join`, {
          projectId,
          targetWords: Number(target),
        });
      }
      await loadProgress(eventId, projectId);
      setMsg("Projeto inscrito no evento.");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível inscrever o projeto.");
    } finally {
      setBusy(false);
    }
  };

  const updateTarget = async () => {
    if (!eventId || !projectId || !Number(target)) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      if (typeof apiUpdateTarget === "function") {
        await apiUpdateTarget(eventId, { projectId, targetWords: Number(target) });
      } else {
        await axios.put(`/api/events/${eventId}/target`, {
          projectId,
          targetWords: Number(target),
        });
      }
      await loadProgress(eventId, projectId);
      setMsg("Meta atualizada.");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível atualizar a meta.");
    } finally {
      setBusy(false);
    }
  };

  const leaveEvent = async () => {
    if (!eventId || !projectId) return;
    if (!confirm("Tem certeza que deseja sair deste evento?")) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      if (typeof apiLeaveEvent === "function") {
        await apiLeaveEvent(eventId, { projectId });
      } else {
        try {
          await axios.delete(`/api/events/${eventId}/participants/${projectId}`);
        } catch {
          await axios.post(`/api/events/${eventId}/leave`, { projectId });
        }
      }
      await loadProgress(eventId, projectId);
      setMsg("Você saiu do evento.");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível sair do evento.");
    } finally {
      setBusy(false);
    }
  };

  const exportProgressCsv = useCallback(async () => {
    if (!eventId || !projectId) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      let history = null;
      const tryGet = async (url, params) => {
        try {
          const res = await axios.get(url, { params });
          if (res?.data) return res.data;
        } catch {}
        return null;
      };

      history = await tryGet(`/api/events/${eventId}/progress/history`, { projectId });
      if (!history) history = await tryGet(`/api/projects/${projectId}/events/${eventId}/progress`, {});
      if (!history) history = await tryGet(`/api/projects/${projectId}/progress`, { eventId });
      if (!history) history = await tryGet(`/api/events/${eventId}/progress`, { projectId });

      const arr = Array.isArray(history) ? history : (history?.items || history?.data || []);
      if (!Array.isArray(arr) || arr.length === 0) {
        setMsg("Nenhum lançamento de progresso encontrado para exportar.");
        setBusy(false);
        return;
      }

      const rows = arr.map((it, idx) => {
        const date = it.dateUtc ?? it.dateISO ?? it.date ?? it.createdAt ?? it.CreatedAt ?? null;
        const delta =
          Number(it.wordsAdded ?? it.deltaWords ?? it.WordsAdded ?? it.words ?? it.Words ?? 0) || 0;
        const totalAcc =
          Number(it.total ?? it.totalWords ?? it.Total ?? it.TotalWords ?? 0) || undefined;
        const source = it.source ?? it.Source ?? "";
        const notes = it.notes ?? it.Notes ?? "";
        return [fmtDateBR(date) || `#${idx + 1}`, delta, totalAcc ?? "", source, notes];
      });

      const headers = ["Data", "Palavras adicionadas", "Total acumulado", "Fonte", "Notas"];
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `progress_event-${eventId}_project-${projectId}_${dateStr}.csv`;
      downloadCSV(filename, headers, rows);
      setMsg("Exportado com sucesso.");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao exportar progresso.");
    } finally {
      setBusy(false);
    }
  }, [eventId, projectId]);

  if (loading) {
    return (
      <div className="container py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>

        <section className="panel">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="label">Evento</span>
              <Skeleton className="h-10 w-full" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Projeto</span>
              <Skeleton className="h-10 w-full" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Meta de palavras</span>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-40 mt-1" />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="grid md:grid-cols-4 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div className="mt-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-48 mt-2" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </section>

        <section className="panel">
          <Skeleton className="h-6 w-64" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </section>
      </div>
    );
  }

  if (!err && projects.length === 0) {
    return (
      <div className="container py-6">
        <EmptyState
          icon="alert"
          title="Você ainda não tem projetos"
          subtitle="Crie um projeto para poder participar dos eventos e registrar seu progresso."
          actions={[{ label: "Criar projeto", to: "/projects/new" }]}
        />
      </div>
    );
  }

  if (!err && events.length === 0) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Eventos</h1>
          <button className="button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>

        <EmptyState
          icon="calendar"
          title="Nenhum evento ativo no momento"
          subtitle="Fique de olho: novas campanhas sazonais aparecem aqui. Você pode continuar escrevendo nos seus projetos normalmente."
          actions={[{ label: "Atualizar", onClick: fetchEvents }]}
        />
      </div>
    );
  }

  if (err && events.length === 0) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Eventos</h1>
          <button className="button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>

        <EmptyState
          icon="alert"
          title="Não foi possível carregar os eventos"
          subtitle={String(err)}
          actions={[{ label: "Tentar novamente", onClick: fetchEvents }]}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <button className="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>

      <section className="panel">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Evento</span>
            <select
              className="input"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {!events.length && eventId && <option value={eventId}>Evento</option>}
              {!events.length && !eventId && <option>Nenhum evento ativo</option>}
              {events.map((ev) => {
                const id = ev.id ?? ev.Id;
                const name = ev.name ?? ev.Name ?? "Evento";
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {!projects.length && <option>Sem projetos</option>}
              {projects.map((p) => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Meta de palavras</span>
            <input
              type="number"
              min={100}
              step={100}
              className="input"
              value={target}
              onChange={(e) => setTarget(Math.max(0, Number(e.target.value) || 0))}
            />
            {!!evDefaultTarget && (
              <div className="text-xs text-muted">
                Padrão do evento: {fmt(evDefaultTarget)} palavras
              </div>
            )}
          </label>
        </div>

        {err && <Alert type="error">{err}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}
      </section>

      <section className="panel">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="kpi">
            <div className="label">Evento</div>
            <div className="value">{evName}</div>
            <div className="hint">
              {(evStart ? fmtDateBR(evStart) : "?") + " – " + (evEnd ? fmtDateBR(evEnd) : "?")}
            </div>
          </div>
          <div className="kpi">
            <div className="label">Projeto</div>
            <div className="value">{selectedProject?.title ?? selectedProject?.name ?? "—"}</div>
            <div className="hint">autor: {selectedProject?.ownerName ?? "você"}</div>
          </div>
          <div className="kpi">
            <div className="label">Total escrito</div>
            <div className="value">{fmt(total)}</div>
            <div className="hint">no evento</div>
          </div>
          <div className="kpi">
            <div className="label">% da meta</div>
            <div className="value">{Math.round(percent)}%</div>
            <div className="hint">
              alvo {fmt(targetWords)} • {dailyTarget ? `${fmt(dailyTarget)}/dia` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="progress">
            <div className="fill" style={{ width: `${Math.round(percent)}%` }} />
          </div>
          <div className="text-xs text-muted mt-1">
            {fmt(total)} / {fmt(targetWords || evDefaultTarget || 0)} palavras
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!joined ? (
            <button
              className="btn-primary"
              onClick={joinEvent}
              disabled={busy || !projectId || !eventId || !target}
            >
              Inscrever projeto
            </button>
          ) : (
            <>
              <button className="btn-primary" onClick={updateTarget} disabled={busy || !target}>
                Salvar meta
              </button>
              <button className="button" onClick={() => setOpenAddProgress(true)}>
                Adicionar progresso
              </button>
              <button className="button" onClick={leaveEvent} disabled={busy}>
                Sair do evento
              </button>
              <button
                className="button"
                onClick={exportProgressCsv}
                disabled={busy || !projectId || !eventId}
              >
                Exportar progresso (CSV)
              </button>

              {percent >= 100 && !won && (
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/validate?projectId=${projectId}&eventId=${eventId}`)}
                >
                  Validar e virar Winner 🎉
                </button>
              )}
              {won && (
                <>
                  <span className="text-green-700 dark:text-green-400">🏆 Winner</span>
                  <button
                    className="button"
                    onClick={() => navigate(`/certificate?projectId=${projectId}&eventId=${eventId}`)}
                  >
                    Ver Certificado
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {eventId && (
        <div className="mt-4">
          <EventLeaderboard eventId={eventId} top={20} />
        </div>
      )}

      <ProgressModal
        open={openAddProgress}
        onClose={() => setOpenAddProgress(false)}
        projectId={projectId}
        onSaved={() => {
          setOpenAddProgress(false);
          loadProgress(eventId, projectId);
        }}
      />
    </div>
  );
}
