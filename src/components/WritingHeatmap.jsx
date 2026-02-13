// src/components/WritingHeatmap.jsx
import { useMemo } from "react";

/**
 * props:
 *  - data: [{ date: "YYYY-MM-DD", value: number }]
 *  - weeks (default 53), size (px), gap (px), radius (px)
 *  - startDate/endDate opcionais para renderizar um intervalo explícito
 */
export default function WritingHeatmap({
  data = [],
  weeks = 53,
  size = 12,
  gap = 2,
  radius = 2,
  color = "#0f3a5f",
  track = "rgba(0,0,0,0.12)",
  startDate,
  endDate,
}) {
  const rows = 7;

  const { days, thresholds, monthTicks, cols } = useMemo(() => {
    const map = new Map();
    (data || []).forEach((d) => {
      if (!d?.date) return;
      const key = String(d.date).slice(0, 10);
      const v = Number(d.value || 0);
      map.set(key, (map.get(key) || 0) + v);
    });

    const normalizeDate = (value, fallback) => {
      const d = value ? new Date(value) : new Date(fallback);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const hasExplicitRange = Boolean(startDate || endDate);

    let end = normalizeDate(endDate, new Date());
    let start = hasExplicitRange
      ? normalizeDate(startDate, end)
      : new Date(end);

    if (!hasExplicitRange) {
      start.setDate(end.getDate() - (weeks * rows - 1));
    }

    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const totalDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
    const cols = hasExplicitRange ? Math.max(1, Math.ceil(totalDays / rows)) : weeks;

    const arr = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ date: key, value: map.get(key) || 0, _date: d });
    }

    const vals = arr
      .map((x) => x.value)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    const pick = (q) => (!vals.length ? 0 : vals[Math.floor((vals.length - 1) * q)]);
    const thresholds = [pick(0.25), pick(0.5), pick(0.75)];

    const monthTicks = [];
    arr.forEach((d, i) => {
      const dd = d._date;
      if (dd.getDate() === 1) {
        monthTicks.push({
          index: i,
          label: dd.toLocaleDateString("pt-BR", { month: "short" }),
        });
      }
    });

    return { days: arr, thresholds, monthTicks, cols };
  }, [data, weeks, startDate, endDate]);

  const W = cols * size + (cols - 1) * gap + 40;
  const H = rows * size + (rows - 1) * gap + 18;

  const level = (v) => {
    if (v <= 0) return 0;
    if (v <= thresholds[0]) return 1;
    if (v <= thresholds[1]) return 2;
    if (v <= thresholds[2]) return 3;
    return 4;
  };

  const fillFor = (v) => {
    const lv = level(v);
    if (lv === 0) return track;
    const op = [0, 0.28, 0.46, 0.64, 0.82][lv];
    return hexToRgba(color, op);
  };

  function hexToRgba(hex, a) {
    const s = hex.replace("#", "");
    const bigint = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {[
        "S",
        "T",
        "Q",
        "Q",
        "S",
        "S",
        "D",
      ].map((lab, r) =>
        r % 2 === 0 ? (
          <text
            key={`dl-${r}`}
            x={8}
            y={r * (size + gap) + size - 2}
            fontSize="9"
            fill="currentColor"
            opacity=".6"
          >
            {lab}
          </text>
        ) : null
      )}

      <g transform="translate(40,0)">
        {days.map((d, i) => {
          const col = Math.floor(i / rows);
          const row = i % rows;
          const x = col * (size + gap);
          const y = row * (size + gap);
          const f = fillFor(d.value);

          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={size}
              height={size}
              rx={radius}
              ry={radius}
              fill={f}
            >
              <title>
                {new Date(d.date).toLocaleDateString("pt-BR")} — {d.value.toLocaleString("pt-BR")} palavras
              </title>
            </rect>
          );
        })}

        {monthTicks.map((m) => {
          const col = Math.floor(m.index / rows);
          const x = col * (size + gap);
          return (
            <text
              key={`m-${m.index}`}
              x={x}
              y={rows * (size + gap) + 12}
              fontSize="9"
              fill="currentColor"
              opacity=".7"
            >
              {m.label}
            </text>
          );
        })}
      </g>

      <g transform={`translate(${W - 100}, ${H - 12})`}>
        <text x={-42} y={-2} fontSize="9" fill="currentColor" opacity=".7">Menos</text>
        {[0, 1, 2, 3, 4].map((lv, i) => (
          <rect
            key={lv}
            x={i * (size + 2)}
            y={-10}
            width={size}
            height={size}
            rx={radius}
            ry={radius}
            fill={lv === 0 ? track : hexToRgba(color, [0, 0.28, 0.46, 0.64, 0.82][lv])}
          />
        ))}
        <text x={5 * (size + 2) + 4} y={-2} fontSize="9" fill="currentColor" opacity=".7">Mais</text>
      </g>
    </svg>
  );
}
