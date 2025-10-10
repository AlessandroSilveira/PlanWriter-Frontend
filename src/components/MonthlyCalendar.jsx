import { useMemo } from "react";

/**
 * props:
 * - year: number
 * - month: number (1-12)
 * - dailyMap: Map<string, number>  // chave "YYYY-MM-DD" -> valor do dia (palavras/min/páginas)
 * - unitLabel: string               // "palavras" | "min" | "páginas" (exibição)
 * - targetPerDay?: number           // para color scale (opcional)
 * - onDayClick?: (isoDate: string) => void
 */
export default function MonthlyCalendar({
  year,
  month,
  dailyMap,
  unitLabel,
  targetPerDay = 0,
  onDayClick,
}) {
  // util: dias do mês
  const { grid, monthName } = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0)); // dia 0 do próximo mês
    const monthName = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

    // 0=domingo ... 6=sábado (ajustamos para começar em segunda)
    const firstDow = (first.getUTCDay() + 6) % 7; // segunda=0
    const days = last.getUTCDate();

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null); // prefixo em branco
    for (let d = 1; d <= days; d++) {
      const dt = new Date(Date.UTC(year, month - 1, d));
      const iso = dt.toISOString().slice(0, 10);
      cells.push({ d, iso });
    }
    while (cells.length % 7 !== 0) cells.push(null); // sufixo em branco

    // quebras por semana (linhas)
    const grid = [];
    for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));
    return { grid, monthName };
  }, [year, month]);

  // color scale simples: 0 = sem cor; ~targetPerDay = mediano; 2x = forte
  const colorFor = (val) => {
    if (!val || val <= 0) return { bg: "transparent", border: "var(--border)" };
    const ratio = targetPerDay > 0 ? Math.min(val / targetPerDay, 2) : Math.min(val / (val || 1), 1);
    // tons de teal em HSL; 0.35..0.85 opacidade
    const alpha = 0.35 + 0.5 * ratio;
    return { bg: `hsla(180, 60%, 35%, ${alpha.toFixed(2)})`, border: "transparent" };
  };

  const dow = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="calendar panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold capitalize">{monthName}</h3>
        <div className="text-xs opacity-70">unidade: {unitLabel}</div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs mb-1">
        {dow.map((d) => (
          <div key={d} className="px-1 py-1 text-center font-medium opacity-70">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((cell, idx) => {
          if (!cell) return <div key={idx} className="h-20 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />;
          const val = Number(dailyMap.get(cell.iso) || 0);
          const { bg, border } = colorFor(val);
          return (
            <button
              key={cell.iso}
              type="button"
              title={`${cell.d.toString().padStart(2, "0")}/${String(month).padStart(2, "0")}: ${val.toLocaleString("pt-BR")} ${unitLabel}`}
              onClick={() => onDayClick?.(cell.iso)}
              className="h-20 rounded-md border transition-colors text-left p-1 hover:ring-2 hover:ring-teal-500/60 focus:outline-none"
              style={{ background: bg, borderColor: border }}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] opacity-70">{cell.d}</span>
                {val > 0 && <span className="text-[11px] font-medium">{val.toLocaleString("pt-BR")}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
