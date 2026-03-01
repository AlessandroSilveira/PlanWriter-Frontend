function formatWords(value) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  return safe.toLocaleString("pt-BR");
}

export default function EventProgressStatusCard({
  eventName,
  projectTitle,
  totalWords,
  targetWords,
  percent,
  remainingWords,
  won = false,
  onAction,
  actionLabel = "Detalhes",
  actionTone = "secondary",
  className = "",
}) {
  const safePercent = Math.min(100, Math.max(0, Math.round(Number(percent ?? 0))));
  const safeRemainingWords = Math.max(0, Math.round(Number(remainingWords ?? 0)));
  const isCompleted = Boolean(won) || safePercent >= 100;
  const progressClass = isCompleted
    ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600"
    : "bg-[#8b6b4f]";

  return (
    <div className={`bg-[#fffaf2] border border-[#eadfce] rounded-xl p-6 shadow-sm ${className}`.trim()}>
      <p className="text-sm uppercase tracking-wide text-gray-500 mb-1">Evento</p>

      <div className="flex items-center gap-2">
        <h3 className="text-2xl font-serif font-semibold">{eventName || "Evento"}</h3>
        {isCompleted && (
          <span
            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold"
            aria-label="Evento concluído"
            title="Evento concluído"
          >
            ✓
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mt-1">Projeto: {projectTitle || "Participação individual"}</p>

      <p className="text-sm text-gray-700 mt-2 mb-2">
        {formatWords(totalWords)} / {formatWords(targetWords)} palavras
      </p>

      <div className="h-2 bg-[#e6dccb] rounded-full overflow-hidden mb-3">
        <div
          className={`h-2 ${progressClass}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>

      <div className="flex justify-between items-center gap-4">
        <span className={`text-sm ${isCompleted ? "text-emerald-700 font-medium" : "text-gray-600"}`}>
          {safePercent}% concluído
        </span>

        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={actionTone === "primary" ? "btn-primary" : "px-4 py-2 border rounded-lg"}
          >
            {actionLabel}
          </button>
        ) : (
          <span className="text-sm text-gray-600">
            {isCompleted
              ? "Meta concluída"
              : `${formatWords(safeRemainingWords)} palavras restantes`}
          </span>
        )}
      </div>
    </div>
  );
}
