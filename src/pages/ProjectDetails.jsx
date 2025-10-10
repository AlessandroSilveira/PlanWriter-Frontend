// src/pages/ProjectDetails.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getProject,
  getProjectHistory,
  getProjectStats,
  getProjectBadges,
} from "../api/projects";
import ProgressModal from "../components/ProgressModal.jsx";
import MonthlyCalendar from "../components/MonthlyCalendar.jsx";

/* ===================== Helpers ===================== */
const fmt = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) =>
  Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));

function getUnitLabel(unit) {
  return unit === "Minutes" ? "min"
       : unit === "Pages"   ? "páginas"
       : "palavras";
}

/** Streak baseado na UNIDADE escolhida (dias consecutivos com valor > 0) */
function computeStreakFromHistory(history, unit, today = startOfDay(new Date())) {
  if (!Array.isArray(history) || history.length === 0) return { current: 0, best: 0 };

  const map = new Map();
  let minDate = null;
  history.forEach((h) => {
    const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
    const key = startOfDay(d).toISOString().slice(0, 10);

    const add =
      unit === "Minutes"
        ? Number(h.minutes ?? h.Minutes ?? 0)
        : unit === "Pages"
        ? Number(h.pages ?? h.Pages ?? 0)
        : Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0);

    map.set(key, (map.get(key) || 0) + add);
    if (!minDate || d < minDate) minDate = startOfDay(d);
  });

  const end = today;
  let cur = 0;
  let best = 0;
  for (let dt = new Date(minDate); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const key = startOfDay(dt).toISOString().slice(0, 10);
    const did = (map.get(key) || 0) > 0;
    if (did) { cur += 1; if (cur > best) best = cur; }
    else { cur = 0; }
  }
  return { current: cur, best };
}

/* mini progress bar */
function Bar({ value = 0, max = 1 }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-2 rounded bg-black/10 dark:bg-white/10 overflow-hidden">
      <div className="h-full bg-teal-700 dark:bg-teal-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ===================== Gráfico responsivo (SVG) ===================== */
function ProgressChart({ daily, goal = 50000, days = 30, minHeight = 360 }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ width: 900, height: minHeight });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const el = wrapRef.current;
      const w = el.clientWidth || 900;
      const h = Math.max(minHeight, el.clientHeight || minHeight);
      setSize({ width: w, height: h });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [minHeight]);

  const { width, height } = size;

  const padLeft = 46;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 56;

  const innerW = Math.max(10, width - padLeft - padRight);
  const innerH = Math.max(10, height - padTop - padBottom);

  const xStep = innerW / days;
  const maxY = Math.max(goal, ...daily.map((d) => d.cum));
  const yScale = (val) => innerH - (val / (maxY || 1)) * innerH;

  const goalPts = Array.from({ length: days + 1 }).map((_, i) => {
    const gx = padLeft + i * xStep;
    const gy = padTop + yScale((goal / days) * i);
    return `${gx},${gy}`;
  });

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxY * i) / yTicks)
  );

  const tickEvery = 1;

  return (
    <div ref={wrapRef} className="w-full h-full min-h-[360px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {yValues.map((v, i) => {
          const yy = padTop + yScale(v);
          return (
            <g key={`g-${i}`}>
              <line x1={padLeft} y1={yy} x2={width - padRight} y2={yy} stroke="currentColor" strokeOpacity=".15" strokeDasharray="3 4" />
              <text x={padLeft - 8} y={yy + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity=".7">
                {v.toLocaleString("pt-BR")}
              </text>
            </g>
          );
        })}

        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="currentColor" strokeOpacity=".35" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="currentColor" strokeOpacity=".35" />

        <polyline fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="2" points={goalPts.join(" ")} />

        {daily.map((d, i) => {
          const x = padLeft + i * xStep + xStep * 0.18;
          const barW = xStep * 0.64;
          const yTop = padTop + yScale(d.cum);
          return (
            <rect
              key={i}
              x={x}
              y={yTop}
              width={Math.max(1, barW)}
              height={height - padBottom - yTop}
              fill="currentColor"
              fillOpacity=".75"
            />
          );
        })}

        {daily.map((d, i) => {
          if (i % tickEvery !== 0 && i !== daily.length - 1) return null;
          const x = padLeft + i * xStep;
          const date = new Date(d.date);
          const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const tx = x + xStep * 0.5;
          const ty = height - padBottom + 18;
          return (
            <text key={`t-${i}`} transform={`translate(${tx},${ty}) rotate(-45)`} textAnchor="end" fontSize="10" fill="currentColor" opacity=".75">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* item de estatística */
function StatItem({ label, value, bar }) {
  return (
    <div className="p-3 rounded-md bg-white/70 dark:bg-slate-900/60 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{label}</div>
        <div className="text-right font-semibold">{value}</div>
      </div>
      {bar ? <div className="mt-2"><Bar value={bar.value} max={bar.max} /></div> : null}
    </div>
  );
}

/* ===================== Página ===================== */
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // calendário mensal
  const today = startOfDay(new Date());
  const [monthCursor, setMonthCursor] = useState(() => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1; // 1-12
    return { year: y, month: m };
  });
  const [calendarDate, setCalendarDate] = useState(null); // ISO yyyy-mm-dd

  const handleBack = () => {
    if (window.history && window.history.length > 1) navigate(-1);
    else navigate("/projects");
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [p, s, h, b] = await Promise.all([
        getProject(id),
        getProjectStats(id).catch(() => null),
        getProjectHistory(id),
        getProjectBadges(id).catch(() => []),
      ]);
      setProject(p);
      setStats(s);
      setHistory(Array.isArray(h) ? h : []);
      setBadges(Array.isArray(b) ? b : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ======= Cálculos com metas flexíveis ======= */
  const unit =
    project?.goalUnit ||
    (typeof project?.GoalUnit === "number"
      ? (project.GoalUnit === 1 ? "Minutes" : project.GoalUnit === 2 ? "Pages" : "Words")
      : "Words");

  const unitLabel = getUnitLabel(unit);

  const goal =
    Number(project?.goalAmount ?? project?.GoalAmount ?? project?.wordCountGoal ?? 0) || 0;

  // janela de 30 dias (NaNo)
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - 29);

  // série diária (somando o campo da UNIDADE) para 30 dias (gráfico)
  const dailyAgg = useMemo(() => {
    const map = new Map();
    history.forEach((h) => {
      const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
      const key = startOfDay(d).toISOString().slice(0, 10);
      const add =
        unit === "Minutes"
          ? Number(h.minutes ?? h.Minutes ?? 0)
          : unit === "Pages"
          ? Number(h.pages ?? h.Pages ?? 0)
          : Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0);
      map.set(key, (map.get(key) || 0) + add);
    });
    let cum = 0;
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const val = map.get(key) || 0;
      cum += val;
      days.push({ date: key, value: val, cum });
    }
    return days;
  }, [history, unit, firstDay]);

  const totalAccum = dailyAgg[dailyAgg.length - 1]?.cum ?? 0;
  const currentDay = Math.min(30, 30 - daysBetween(today, firstDay));
  const averagePerDay = Math.round((totalAccum || 0) / Math.max(1, currentDay));
  const todayValue = (() => {
    const key = today.toISOString().slice(0, 10);
    return dailyAgg.find((d) => d.date === key)?.value || 0;
  })();

  const targetPerDay = goal ? Math.ceil(goal / 30) : 0;
  const remaining = Math.max(0, goal - totalAccum);
  const daysRemaining = Math.max(0, 30 - currentDay);
  const avg = Math.max(1, averagePerDay || 1);
  const etaDays = remaining > 0 ? Math.ceil(remaining / avg) : 0;
  const finishOn = new Date(today);
  finishOn.setDate(finishOn.getDate() + etaDays);

  const { current: streakNow, best: streakBest } = useMemo(
    () => computeStreakFromHistory(history, unit, today),
    [history, unit, today]
  );
  const targetAccToday = goal ? Math.round((goal / 30) * currentDay) : 0;
  const deltaVsPace = totalAccum - targetAccToday;

  // mapa mensal (heatmap) para o mês visível
  const monthDailyMap = useMemo(() => {
    const map = new Map();
    const y = monthCursor.year;
    const m = monthCursor.month; // 1-12
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));

    history.forEach((h) => {
      const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
      const du = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      if (du < start || du > end) return;
      const key = du.toISOString().slice(0, 10);
      const add =
        unit === "Minutes"
          ? Number(h.minutes ?? h.Minutes ?? 0)
          : unit === "Pages"
          ? Number(h.pages ?? h.Pages ?? 0)
          : Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0);
      map.set(key, (map.get(key) || 0) + add);
    });
    return map;
  }, [history, unit, monthCursor]);

  const prevMonth = () => {
    const m = monthCursor.month - 1;
    if (m >= 1) setMonthCursor(c => ({ year: c.year, month: m }));
    else setMonthCursor(c => ({ year: c.year - 1, month: 12 }));
  };
  const nextMonth = () => {
    const m = monthCursor.month + 1;
    if (m <= 12) setMonthCursor(c => ({ year: c.year, month: m }));
    else setMonthCursor(c => ({ year: c.year + 1, month: 1 }));
  };

  if (loading) return <div className="p-4">Carregando…</div>;

  return (
    <div className="py-6 space-y-6">
      {/* ===== 1) TOPO ===== */}
      <div className="container container--wide">
        <section className="panel section-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="proj w-full">
              <div className="title">Título: {project?.title ?? "Projeto"}</div>

              <p className="meta">Gênero: {project?.genre || "Projeto"}</p>

              {project?.description && (
                <p className="meta">Descrição: {project.description}</p>
              )}

              {project?.deadline && (
                <p className="meta">
                  Prazo: {new Date(project.deadline).toLocaleDateString("pt-BR")}
                </p>
              )}

              {goal ? <p className="meta">Meta: {fmt(goal)} {unitLabel}</p> : null}

              <p className="meta">Total atual: {fmt(totalAccum)} {unitLabel}</p>

              <p className="meta">
                Progresso: {fmt(totalAccum)} / {fmt(goal)} {unitLabel}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  🔥 Streak: <b>{fmt(streakNow)}</b>{" "}
                  <span className="opacity-70">/ recorde {fmt(streakBest)}</span>
                </span>
                {goal ? (
                  <span
                    className={
                      "px-2 py-1 rounded-full " +
                      (deltaVsPace >= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800")
                    }
                  >
                    {deltaVsPace >= 0
                      ? `+${fmt(deltaVsPace)} acima do pace`
                      : `${fmt(deltaVsPace)} abaixo do pace`}
                  </span>
                ) : null}
              </div>

              {goal ? (
                <div className="progress">
                  <div
                    className="fill"
                    style={{
                      width: `${Math.min(100, Math.round((totalAccum / (goal || 1)) * 100))}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* Ações */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              <button className="btn-primary" onClick={() => setOpenModal(true)} type="button">
                + Adicionar progresso
              </button>

              {unit === "Words" && (
                <button className="btn" onClick={() => navigate(`/validate?projectId=${id}`)} type="button">
                  Validar projeto
                </button>
              )}

              <button className="btn-primary" onClick={handleBack} type="button" aria-label="Voltar para a tela anterior">
                Voltar
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 2) GRID 25% / 75% ===== */}
      <div className="container container--wide">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 25% — estatísticas */}
          <section className="panel col-span-1">
            <div className="space-y-3">
              <StatItem
                label={`Sua média por dia (${unitLabel})`}
                value={fmt(averagePerDay)}
                bar={{ value: averagePerDay, max: Math.max(averagePerDay, targetPerDay) }}
              />
              <StatItem
                label={`Hoje (${unitLabel})`}
                value={fmt(todayValue)}
                bar={{ value: todayValue, max: Math.max(todayValue, targetPerDay) }}
              />
              <StatItem
                label={`Meta total (${unitLabel})`}
                value={fmt(goal)}
                bar={{ value: totalAccum, max: goal || 1 }}
              />
              <StatItem
                label={`Média alvo/dia (${unitLabel})`}
                value={fmt(targetPerDay)}
                bar={{ value: averagePerDay, max: targetPerDay || 1 }}
              />
              <StatItem
                label={`Total (${unitLabel})`}
                value={fmt(totalAccum)}
                bar={{ value: totalAccum, max: goal || totalAccum || 1 }}
              />
              <StatItem
                label={`Restantes (${unitLabel})`}
                value={fmt(Math.max(0, goal - totalAccum))}
                bar={{ value: goal ? goal - Math.max(0, goal - totalAccum) : 0, max: goal || 1 }}
              />
              <StatItem label="Dia atual" value={fmt(currentDay)} bar={{ value: currentDay, max: 30 }} />
              <StatItem label="Dias restantes" value={fmt(Math.max(0, 30 - currentDay))} bar={{ value: 30 - Math.max(0, 30 - currentDay), max: 30 }} />
              <StatItem label="Neste ritmo termina em" value={finishOn.toLocaleDateString("pt-BR")} />
            </div>
          </section>

          {/* 75% — gráfico */}
          <section className="panel col-span-1 lg:col-span-3 flex flex-col">
            <h3 className="text-base font-semibold mb-2">
              Progresso diário (últimos 30 dias) — {unitLabel}
            </h3>
            <div className="flex-1">
              <ProgressChart daily={dailyAgg} goal={goal || 50000} days={30} />
            </div>
          </section>

          {/* ===== Calendário mensal ===== */}
          <section className="panel col-span-1 lg:col-span-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Calendário mensal</h3>
              <div className="flex gap-2">
                <button className="button" onClick={prevMonth}>&larr; Mês anterior</button>
                <button className="button" onClick={nextMonth}>Próximo mês &rarr;</button>
              </div>
            </div>
            <MonthlyCalendar
              year={monthCursor.year}
              month={monthCursor.month}
              dailyMap={monthDailyMap}
              unitLabel={unitLabel}
              targetPerDay={targetPerDay}
              onDayClick={(iso) => {
                setCalendarDate(iso);
                setOpenModal(true);
              }}
            />
          </section>

          {/* Conquistas */}
          <section className="panel section-panel col-span-1 lg:col-span-4">
            <h2 className="section-title">Conquistas</h2>
            {badges?.length ? (
              <div className="badges-row">
                {badges.map((b, i) => {
                  const img = getBadgeImage(b);
                  const glyph = getBadgeGlyph(b);
                  const title = badgeTitle(b);
                  const description = badgeDerscription(b);
                  return (
                    <div key={b.id || b.Id || title || i} className="badge-item">
                      {img ? (
                        <img src={img} alt={title} className="badge-icon-img" loading="lazy" />
                      ) : glyph ? (
                        <div className="badge-icon">{glyph}</div>
                      ) : (
                        <div className="badge-icon">🏅</div>
                      )}
                      <div className="badge-caption"><b>{title}</b></div>
                      <div className="badge-caption"><b>{description}</b></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted">Nenhuma conquista ainda.</div>
            )}
          </section>
        </div>
      </div>

      {/* ===== Modal de Progresso ===== */}
      <ProgressModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        projectId={id}
        initialDate={calendarDate || undefined}
        onSaved={reload}
      />
    </div>
  );
}

/* helpers badges locais */
function getBadgeImage(b) {
  return b?.imageUrl || b?.iconUrl || b?.image || b?.url || null;
}
function getBadgeGlyph(b) {
  return b?.icon || b?.Icon || null;
}
function badgeTitle(b) {
  return b?.name || b?.Name || b?.title || b?.badgeName || "Conquista";
}
function badgeDerscription(b) {
  return b?.description || null;
}
