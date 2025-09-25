// src/components/EventProgressCard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveEvents,
  getEventById,
  getEventProgress,
} from "../api/events";
import EmptyState from "./EmptyState";
import Skeleton from "./Skeleton"; // default import
import Alert from "./Alert";

/**
 * Props:
 *  - projectId: string | number
 *  - eventId?: string | number
 */
export default function EventProgressCard({ projectId, eventId: propEventId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState(propEventId || "");
  const [progress, setProgress] = useState(null);

  const Ring = ({ pct = 0, size = 80, stroke = 10, color = "#0f3a5f", track = "rgba(0,0,0,0.15)" }) => {
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    const offset = C - (p / 100) * C;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset .3s ease" }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
              fontWeight="600" fontSize={Math.round(size * 0.26)} fill="currentColor">
          {Math.round(p)}%
        </text>
      </svg>
    );
  };

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      let ev = null;
      let id = propEventId;

      if (!id) {
        const actives = await getActiveEvents();
        const first = Array.isArray(actives) && actives.length ? actives[0] : null;
        id = first?.id ?? first?.Id ?? "";
        if (id) ev = first;
      }

      if (id && !ev) ev = await getEventById(id);

      setEventId(id || "");
      setEvent(ev || null);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao carregar evento.");
      setEventId("");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [propEventId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadEvent();
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [loadEvent]);

  const loadProgress = useCallback(async (eid, pid) => {
    if (!eid || !pid) { setProgress(null); return; }
    try {
      const p = await getEventProgress({ eventId: eid, projectId: pid });
      setProgress(p || null);
    } catch {
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadProgress(eventId, projectId);
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [eventId, projectId, loadProgress]);

  const evName = event?.name ?? event?.Name ?? "Evento";
  const evStart = event?.startsAtUtc ?? event?.startsAt ?? event?.StartsAtUtc;
  const evEnd = event?.endsAtUtc ?? event?.endsAt ?? event?.EndsAtUtc;
  const evDefaultTarget =
    Number(event?.defaultTargetWords ?? event?.DefaultTargetWords ?? 50000) || 50000;

  const joined = !!(progress?.joined ?? progress?.isJoined ?? progress?.targetWords);
  const won = !!(progress?.won ?? progress?.Won ?? progress?.isWinner);
  const target = Number(progress?.targetWords ?? progress?.TargetWords ?? evDefaultTarget) || evDefaultTarget;
  const total = Number(progress?.totalWritten ?? progress?.TotalWritten ?? 0) || 0;
  const percent = Math.min(
    100,
    Math.max(0, Number(progress?.percent ?? progress?.Percent ?? (100 * total) / Math.max(1, target)))
  );

  const daysLeft = useMemo(() => {
    if (!evEnd) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(evEnd); end.setHours(0,0,0,0);
    return Math.max(0, Math.ceil((end - today) / (1000*60*60*24)));
  }, [evEnd]);

  if (loading) {
    return (
      <section className="panel">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40 mt-2" />
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>

        <div className="mt-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-40 mt-2" />
        </div>

        <div className="mt-3 flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-52" />
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <Alert type="error">{err}</Alert>
        <div className="mt-2">
          <button className="button" onClick={loadEvent}>Tentar novamente</button>
        </div>
      </section>
    );
  }

  if (!eventId || !event) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <EmptyState
          icon="calendar"
          title="Nenhum evento ativo"
          subtitle="Quando um evento estiver ativo, sua meta aparecerá aqui."
          actions={[{ label: "Ver eventos", onClick: () => navigate("/events") }]}
        />
      </section>
    );
  }

  if (!projectId) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <EmptyState
          icon="alert"
          title="Selecione um projeto"
          subtitle="Escolha um projeto para acompanhar o progresso no evento."
          actions={[{ label: "Ir para Projetos", onClick: () => navigate("/projects") }]}
        />
      </section>
    );
  }

  if (eventId && projectId && !joined) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <EmptyState
          icon="calendar"
          title="Projeto não inscrito neste evento"
          subtitle="Inscreva este projeto no evento para acompanhar sua meta e o progresso."
          actions={[{
            label: "Inscrever projeto",
            onClick: () => navigate(`/events?eventId=${eventId}&projectId=${projectId}`),
          }]}
        />
      </section>
    );
  }

  if (joined && total === 0) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <EmptyState
          icon="alert"
          title="Sem progresso ainda"
          subtitle="Registre suas primeiras palavras para ver a evolução no evento."
          actions={[{
            label: "Adicionar progresso",
            onClick: () => navigate(`/events?eventId=${eventId}&projectId=${projectId}`),
          }]}
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{evName}</h2>
          {(evStart || evEnd) && (
            <p className="text-sm text-muted">
              {evStart ? new Date(evStart).toLocaleDateString("pt-BR") : "?"}
              {" – "}
              {evEnd ? new Date(evEnd).toLocaleDateString("pt-BR") : "?"}
            </p>
          )}
          <p className="text-xs text-muted mt-1">
            {won ? "Status: Winner 🏆" : "Status: Inscrito"}
          </p>
        </div>

        <div className="flex-shrink-0">
          <Ring pct={percent} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi">
          <div className="label">Total no evento</div>
          <div className="value">{total.toLocaleString("pt-BR")}</div>
          <div className="hint">palavras</div>
        </div>
        <div className="kpi">
          <div className="label">Meta</div>
          <div className="value">{target.toLocaleString("pt-BR")}</div>
          <div className="hint">palavras</div>
        </div>
        <div className="kpi">
          <div className="label">Percentual</div>
          <div className="value">{Math.round(percent)}%</div>
          <div className="hint">do alvo</div>
        </div>
        <div className="kpi">
          <div className="label">Meta diária</div>
          <div className="value">{Math.ceil(target / 30).toLocaleString("pt-BR")}</div>
          <div className="hint">estimada</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="progress">
          <div className="fill" style={{ width: `${Math.round(percent)}%` }} />
        </div>
        {daysLeft != null && (
          <div className="text-xs text-muted mt-1">
            Dias restantes: <b>{daysLeft}</b>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="button"
          type="button"
          onClick={() => navigate(`/events?eventId=${eventId}&projectId=${projectId ?? ""}`)}
        >
          Gerenciar evento
        </button>

        {percent >= 100 && !won && (
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate(`/validate?projectId=${projectId}&eventId=${eventId}`)}
          >
            Validar e virar Winner 🎉
          </button>
        )}
        {won && <span className="text-green-700 dark:text-green-400">🏆 Winner</span>}
      </div>
    </section>
  );
}
