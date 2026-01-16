// src/components/EventParticipationCard.jsx
export default function EventParticipationCard({
  eventName,
  projectTitle,
  startsAt,
  endsAt,
  totalWords,
  targetWords,
  rank,
  isCompleted,
}) {
  const percent =
    targetWords > 0
      ? Math.round((totalWords / targetWords) * 100)
      : 0;

  const formatDate = d =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="bg-[#fffaf2] border border-[#eadfce] rounded-xl p-5 shadow-sm space-y-3">
      {/* HEADER */}
      <div>
        <h3 className="text-lg font-serif font-semibold">
          {eventName}
        </h3>
        <p className="text-sm text-gray-600">
          Projeto: <span className="font-medium">{projectTitle}</span>
        </p>
        <p className="text-xs text-gray-500">
          {formatDate(startsAt)} → {formatDate(endsAt)}
        </p>
      </div>

      {/* PROGRESSO */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>
            Progresso: {totalWords.toLocaleString()} /{" "}
            {targetWords.toLocaleString()}
          </span>
          <span className="font-medium">{percent}%</span>
        </div>

        <div className="h-2 bg-[#e6dccb] rounded-full overflow-hidden">
          <div
            className="h-2 bg-[#8b6b4f]"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>

      {/* STATUS */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <span>🏁</span>
              <span className="font-medium">Concluído</span>
            </>
          ) : (
            <>
              <span>✍️</span>
              <span>Em andamento</span>
            </>
          )}
        </div>

        {rank && (
          <div className="flex items-center gap-1 font-medium">
            <span>🏆</span>
            <span>Rank #{rank}</span>
          </div>
        )}
      </div>
    </div>
  );
}
