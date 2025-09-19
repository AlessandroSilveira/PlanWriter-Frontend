// src/components/EventProgressCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveEvents,
  getEventById,
  getEventProgress,
} from "../api/events";

/**
 * Props:
 *  - projectId: string | number   (obrigatório para mostrar progresso)
 *  - eventId?: string | number    (opcional; se não vier, usa o primeiro evento ativo)
 */
export default function EventProgressCard({ projectId, eventId: propEventId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState(propEventId || "");
  const [progress, setProgress] = useState(null);

  // ==== ring SVG minimalista (texto central 100% no centro) ====
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

  // ==== carregar evento "fonte da verdade" ====
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        let ev = null;
        let id = propEventId;

        if (!id) {
          const actives = await getActiveEvents();
          const first = Array.isArray(actives) && actives.length ? actives[0] : null;
          id = first?.id ?? first?.Id ?? "";
          if (id) ev = first;
        }

        if (id && !ev) {
          ev = await getEventById(id);
        }

        if (!alive) return;
        setEventId(id || "");
        setEvent(ev || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar evento.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [propEventId]);

  // ==== carregar progresso do projeto no evento ====
  useEffect(() => {
    let alive = true;
    if (!eventId || !projectId) { setProgress(null); return; }
    (async () => {
      try {
        const p = await getEventProgress({ eventId, projectId });
        if (!alive) return;
        setProgress(p || null);
      } catch (e) {
        if (!alive) return;
        setProgress(null);
      }
    })();
    return () => { alive = false; };
  }, [eventId, projectId]);

  const evName = event?.name ?? event?.Name ?? "Evento";
  const evStart = event?.startsAtUtc ?? event?.startsAt ?? event?.StartsAtUtc;
  const evEnd   = event?.endsAtUtc   ?? event?.endsAt   ?? event?.EndsAtUtc;
  const evDefaultTarget = Number(event?.defaultTargetWords ?? event?.DefaultTargetWords ?? 50000) || 50000;

  const joined = !!(progress?.joined ?? progress?.isJoined ?? progress?.targetWords);
  const won    = !!(progress?.won ?? progress?.Won ?? progress?.isWinner);
  const target = Number(progress?.targetWords ?? progress?.TargetWords ?? evDefaultTarget) || evDefaultTarget;
  const total  = Number(progress?.totalWritten ?? progress?.TotalWritten ?? 0) || 0;
  const percent = Math.min(100, Math.max(0, Number(progress?.percent ?? progress?.Percent ?? (100 * total / Math.max(1, target)))));
  const dailyTarget = Number(progress?.dailyTarget ?? progress?.DailyTarget ?? Math.ceil(target / 30)) || Math.ceil(target / 30);

  const daysLeft = useMemo(() => {
    if (!evEnd) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(evEnd); end.setHours(0,0,0,0);
    return Math.max(0, Math.ceil((end - today) / (1000*60*60*24)));
  }, [evEnd]);

  if (loading) return (
    <section className="panel">
      <h2 className="section-title">Meta do Evento</h2>
      <p className="text-sm text-muted">Carregando…</p>
    </section>
  );

  if (!eventId || !event) {
    return (
      <section className="panel">
        <h2 className="section-title">Meta do Evento</h2>
        <p className="text-sm text-muted">Não há evento ativo no momento.</p>
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
            {joined ? (won ? "Status: Winner 🏆" : "Status: Inscrito") : "Status: Projeto não inscrito"}
          </p>
        </div>

        {/* donut compacto do evento */}
        <div className="flex-shrink-0">
          <Ring pct={percent} />
        </div>
      </div>

      {/* KPIs */}
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
          <div className="value">{dailyTarget.toLocaleString("pt-BR")}</div>
          <div className="hint">estimada</div>
        </div>
      </div>

      {/* Barra de progresso linear */}
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

      {/* Ações */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!joined ? (
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate(`/events?eventId=${eventId}&projectId=${projectId ?? ""}`)}
            disabled={!projectId}
          >
            Inscrever este projeto
          </button>
        ) : (
          <>
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
          </>
        )}
      </div>

      {err && <p className="text-red-600 mt-2">{err}</p>}
    </section>
  );
}
