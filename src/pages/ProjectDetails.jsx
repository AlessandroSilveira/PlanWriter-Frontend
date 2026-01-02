import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getProject,
  getProjectHistory,
  getProjectStats,
  getProjectBadges,
} from "../api/projects";

import ProgressModal from "../components/ProgressModal.jsx";
import MonthlyCalendar from "../components/MonthlyCalendar.jsx";
import MilestonesBox from "../components/MilestonesBox.jsx";

/* ===================== Helpers ===================== */
const fmt = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const diffDays = (a, b) =>
  Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));

function Bar({ value = 0, max = 1 }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-2 rounded bg-black/10 overflow-hidden">
      <div className="h-full bg-teal-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatItem({ label, value, bar }) {
  return (
    <div className="p-3 rounded-md bg-white/70 border border-black/5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
      {bar && (
        <div className="mt-2">
          <Bar value={bar.value} max={bar.max} />
        </div>
      )}
    </div>
  );
}

/**
 * GRÁFICO (Barras) - versão robusta
 * - altura fixa real
 * - cada coluna é relative e a barra é absolute bottom
 * - não depende de h-full em pais flex
 */
function DailyBarChart({ data, targetPerDay }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="text-muted">Sem dados de progresso.</div>;
  }

  const width = 900;
  const height = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  const maxValue = Math.max(
    ...data.map(d => d.value || 0),
    targetPerDay || 0,
    1
  );

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const barWidth = innerWidth / data.length;

  const yScale = (v) =>
    padding.top + innerHeight - (v / maxValue) * innerHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[600px] bg-white/40 border border-black/10 rounded-md"
    >
      {/* Eixo Y */}
      {[0, maxValue / 2, maxValue].map((v, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="black"
            strokeOpacity="0.1"
          />
          <text
            x={padding.left - 8}
            y={yScale(v) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#444"
          >
            {Math.round(v).toLocaleString("pt-BR")}
          </text>
        </g>
      ))}

      {/* Linha de meta diária */}
      {targetPerDay > 0 && (
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={yScale(targetPerDay)}
          y2={yScale(targetPerDay)}
          stroke="#d97706"
          strokeDasharray="4 4"
        />
      )}

      {/* Barras */}
      {data.map((d, i) => {
        const x = padding.left + i * barWidth + barWidth * 0.15;
        const barH = innerHeight - (yScale(d.value) - padding.top);

        return (
          <g key={d.date}>
            <rect
              x={x}
              y={yScale(d.value)}
              width={barWidth * 0.7}
              height={barH}
              rx="2"
              fill={d.value > 0 ? "#0f766e" : "#d1d5db"}
            />

            <title>
              {new Date(d.date).toLocaleDateString("pt-BR")} —{" "}
              {d.value.toLocaleString("pt-BR")} palavras
            </title>

            {/* Datas no eixo X */}
            {i % Math.ceil(data.length / 10) === 0 && (
              <text
                x={x + barWidth * 0.35}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#555"
              >
                {new Date(d.date).getDate()}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}



/* ===================== Página ===================== */
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  /* ===================== Load ===================== */
  const reload = async () => {
    setLoading(true);
    try {
      const [p, h, s, b] = await Promise.all([
        getProject(id),
        getProjectHistory(id),
        getProjectStats(id).catch(() => null),
        getProjectBadges(id).catch(() => []),
      ]);

      setProject(p);
      setHistory(Array.isArray(h) ? h : []);
      setStats(s);
      setBadges(Array.isArray(b) ? b : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id]);

  /* ===================== Meta ===================== */
  const goal = Number(project?.wordCountGoal ?? 0);

  const startDate = useMemo(() => {
    if (project?.startDate) return startOfDay(new Date(project.startDate));
    if (history.length > 0) return startOfDay(new Date(history[0].date || history[0].Date));
    return today;
  }, [project, history, today]);

  const endDate = useMemo(() => {
    if (project?.deadline) return startOfDay(new Date(project.deadline));
    const d = new Date(startDate);
    d.setDate(d.getDate() + 29);
    return d;
  }, [project, startDate]);

  const totalDays = diffDays(startDate, endDate) + 1;
  const elapsedDays = Math.min(totalDays, diffDays(startDate, today) + 1);
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  /* ===================== Histórico agregado ===================== */
  const dailyAgg = useMemo(() => {
    const map = new Map();

    history.forEach((h) => {
      const raw = h.date || h.Date;
      if (!raw) return;

      const d = startOfDay(new Date(raw));
      const key = d.toISOString().slice(0, 10);
      const val = Number(h.wordsWritten ?? h.WordsWritten ?? 0);
      map.set(key, (map.get(key) || 0) + val);
    });

    let cum = 0;
    const days = [];

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const value = map.get(key) || 0;
      cum += value;
      days.push({ date: key, value, cum });
    }

    return days;
  }, [history, startDate, totalDays]);

  const totalAccum = dailyAgg.at(-1)?.cum ?? 0;

  const todayKey = today.toISOString().slice(0, 10);
  const todayValue = dailyAgg.find((d) => d.date === todayKey)?.value ?? 0;

  const averagePerDay = elapsedDays > 0 ? Math.round(totalAccum / elapsedDays) : 0;
  const targetPerDay = goal && totalDays ? Math.ceil(goal / totalDays) : 0;
  const remainingWords = Math.max(0, goal - totalAccum);

  const etaDays = averagePerDay > 0 ? Math.ceil(remainingWords / averagePerDay) : 0;
  const finishOn = new Date(today);
  finishOn.setDate(today.getDate() + etaDays);

  if (loading) return <div className="p-4">Carregando…</div>;

  /* ===================== Render ===================== */
  return (
    <div className="py-6 space-y-6 container container--wide">
      {/* TOPO */}
<section className="panel flex items-start justify-between gap-4">
  <div>
    <h2 className="text-xl font-semibold">{project?.title}</h2>
    <p className="text-muted">{project?.description}</p>
  </div>

  {/* 🔥 BOTÃO DE REGISTRAR PROGRESSO */}
  <button
    type="button"
    className="btn-primary whitespace-nowrap"
    onClick={() => setOpenModal(true)}
  >
    + Registrar progresso
  </button>
</section>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ESTATÍSTICAS */}
        <section className="panel space-y-3">
          <StatItem
            label="Sua média por dia"
            value={fmt(averagePerDay)}
            bar={{ value: averagePerDay, max: targetPerDay || 1 }}
          />
          <StatItem
            label="Hoje"
            value={fmt(todayValue)}
            bar={{ value: todayValue, max: targetPerDay || 1 }}
          />
          <StatItem
            label="Meta total"
            value={fmt(goal)}
            bar={{ value: totalAccum, max: goal || 1 }}
          />
          <StatItem
            label="Total acumulado"
            value={fmt(totalAccum)}
            bar={{ value: totalAccum, max: goal || totalAccum || 1 }}
          />
          <StatItem
            label="Restantes"
            value={fmt(remainingWords)}
            bar={{ value: goal - remainingWords, max: goal || 1 }}
          />
          <StatItem
            label="Dia atual"
            value={fmt(elapsedDays)}
            bar={{ value: elapsedDays, max: totalDays }}
          />
          <StatItem
            label="Dias restantes"
            value={fmt(remainingDays)}
            bar={{ value: totalDays - remainingDays, max: totalDays }}
          />
          <StatItem
            label="Neste ritmo termina em"
            value={finishOn.toLocaleDateString("pt-BR")}
          />
        </section>

        {/* GRÁFICO */}
        <section className="panel lg:col-span-3">
          <h3 className="font-semibold mb-2">Progresso diário</h3>
          <DailyBarChart  data={dailyAgg}  targetPerDay={targetPerDay}/>

        </section>

        {/* CALENDÁRIO */}
        <section className="panel lg:col-span-4">
          <MonthlyCalendar
            year={today.getFullYear()}
            month={today.getMonth() + 1}
            dailyMap={new Map(dailyAgg.map((d) => [d.date, d.value]))}
            targetPerDay={targetPerDay}
          />
        </section>

        {/* MARCOS */}
        <section className="panel lg:col-span-4">
          <MilestonesBox projectId={id} canEdit />
        </section>
      </div>

      <ProgressModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        projectId={id}
        onSaved={reload}
      />
    </div>
  );
}
