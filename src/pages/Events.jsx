// src/pages/Events.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getActiveEvents,
  getEventById,
  getEventProgress,
  joinEvent,
  leaveEvent,
  updateProjectEvent,
} from "../api/events";
import { getProjects } from "../api/projects";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Events() {
  const navigate = useNavigate();
  const q = useQuery();

  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);

  const [eventId, setEventId] = useState(q.get("eventId") || "");
  const [projectId, setProjectId] = useState(q.get("projectId") || "");

  const [event, setEvent] = useState(null);
  const [progress, setProgress] = useState(null);

  const [targetInput, setTargetInput] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // carregar listas
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [evs, projs] = await Promise.all([
          getActiveEvents(),
          getProjects(),
        ]);
        if (!alive) return;
        const evList = Array.isArray(evs) ? evs : [];
        const pjList = Array.isArray(projs) ? projs : [];

        setEvents(evList);
        setProjects(pjList);

        // defaults
        const e0 = eventId || evList?.[0]?.id || evList?.[0]?.Id || "";
        const p0 = projectId || pjList?.[0]?.id || pjList?.[0]?.projectId || "";
        setEventId(e0);
        setProjectId(p0);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar dados.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // carregar evento selecionado
  useEffect(() => {
    if (!eventId) { setEvent(null); return; }
    (async () => {
      try {
        const e = await getEventById(eventId);
        setEvent(e);
        const def = Number(e?.defaultTargetWords ?? e?.DefaultTargetWords ?? 50000) || 50000;
        setTargetInput(def);
      } catch (e) {
        // ignora
      }
    })();
  }, [eventId]);

  // carregar progresso do projeto no evento
  useEffect(() => {
    if (!eventId || !projectId) { setProgress(null); return; }
    (async () => {
      try {
        const p = await getEventProgress({ eventId, projectId });
        setProgress(p || null);
        const tgt = Number(p?.targetWords ?? p?.TargetWords ?? 0);
        if (tgt > 0) setTargetInput(tgt);
      } catch (e) {
        setProgress(null);
      }
    })();
  }, [eventId, projectId]);

  // sincroniza querystring (bom para voltar da validação)
  useEffect(() => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (projectId) params.set("projectId", projectId);
    navigate({ search: params.toString() }, { replace: true });
  }, [eventId, projectId, navigate]);

  const project = useMemo(() => {
    return projects.find(p => (p.id ?? p.projectId) === projectId);
  }, [projects, projectId]);

  const joined = !!(progress?.joined ?? progress?.isJoined ?? progress?.targetWords);
  const won = !!(progress?.won ?? progress?.Won);

  const percent = Math.min(100, Math.max(0, Number(progress?.percent ?? progress?.Percent ?? 0)));
  const total = Number(progress?.totalWritten ?? progress?.TotalWritten ?? 0);
  const daily = Number(progress?.dailyTarget ?? progress?.DailyTarget ?? 0);

  const defTarget = Number(event?.defaultTargetWords ?? event?.DefaultTargetWords ?? 50000) || 50000;

  const doJoin = async () => {
    if (!eventId || !projectId) return;
    setBusy(true); setErr("");
    try {
      await joinEvent(eventId, { projectId, targetWords: Number(targetInput) || defTarget });
      const p = await getEventProgress({ eventId, projectId });
      setProgress(p || null);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível inscrever o projeto.");
    } finally {
      setBusy(false);
    }
  };

  const doUpdate = async () => {
    if (!eventId || !projectId) return;
    setBusy(true); setErr("");
    try {
      await updateProjectEvent(eventId, projectId, { targetWords: Number(targetInput) || defTarget });
      const p = await getEventProgress({ eventId, projectId });
      setProgress(p || null);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível atualizar a meta.");
    } finally {
      setBusy(false);
    }
  };

  const doLeave = async () => {
    if (!eventId || !projectId) return;
    if (!confirm("Tem certeza que deseja sair deste evento?")) return;
    setBusy(true); setErr("");
    try {
      await leaveEvent(eventId, projectId);
      setProgress(null);
      setTargetInput(defTarget);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível remover o projeto do evento.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container py-6">Carregando…</div>;

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <button className="button" onClick={() => navigate(-1)}>Voltar</button>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <section className="panel">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Evento</span>
            <select className="input" value={eventId} onChange={e => setEventId(e.target.value)}>
              {!events.length && <option>Sem eventos ativos</option>}
              {events.map(ev => (
                <option key={ev.id ?? ev.Id} value={ev.id ?? ev.Id}>
                  {ev.name ?? ev.Name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              {!projects.length && <option>Sem projetos</option>}
              {projects.map(p => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Detalhes do evento */}
        {event && (
          <div className="mt-3 grid md:grid-cols-3 gap-3">
            <div className="kpi">
              <div className="label">Nome</div>
              <div className="value">{event.name ?? event.Name}</div>
              <div className="hint">
                {event.startsAtUtc && event.endsAtUtc
                  ? `${new Date(event.startsAtUtc).toLocaleDateString("pt-BR")} – ${new Date(event.endsAtUtc).toLocaleDateString("pt-BR")}`
                  : "datas"}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Meta padrão</div>
              <div className="value">{defTarget.toLocaleString("pt-BR")}</div>
              <div className="hint">palavras</div>
            </div>
            <div className="kpi">
              <div className="label">Status</div>
              <div className="value">
                {joined ? (won ? "Winner 🏆" : "Inscrito") : "Não inscrito"}
              </div>
              <div className="hint">{joined ? "este projeto está no evento" : "inscreva para acompanhar"}</div>
            </div>
          </div>
        )}

        {/* Status do projeto no evento */}
        <div className="mt-3 grid md:grid-cols-3 gap-3">
          <div className="kpi">
            <div className="label">Total no evento</div>
            <div className="value">{total.toLocaleString("pt-BR")}</div>
            <div className="hint">palavras</div>
          </div>
          <div className="kpi">
            <div className="label">Percentual</div>
            <div className="value">{Math.round(percent)}%</div>
            <div className="hint">do alvo</div>
          </div>
          <div className="kpi">
            <div className="label">Meta diária</div>
            <div className="value">{Number(daily || Math.ceil((progress?.targetWords || defTarget) / 30)).toLocaleString("pt-BR")}</div>
            <div className="hint">estimada</div>
          </div>
        </div>

        {/* Formulário para meta / inscrição */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">{joined ? "Meta do seu projeto neste evento" : "Escolha sua meta para o evento"}</span>
            <input
              type="number"
              className="input"
              min={1000}
              step={500}
              value={targetInput}
              onChange={e => setTargetInput(Math.max(0, Number(e.target.value) || 0))}
              disabled={busy}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!joined ? (
            <button className="btn-primary" onClick={doJoin} disabled={!eventId || !projectId || busy}>
              Inscrever projeto
            </button>
          ) : (
            <>
              <button className="btn-primary" onClick={doUpdate} disabled={busy}>
                Atualizar meta
              </button>
              <button className="button" onClick={doLeave} disabled={busy}>
                Sair do evento
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
ß