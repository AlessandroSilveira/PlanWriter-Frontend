import EventProgressStatusCard from "./EventProgressStatusCard.jsx";
import { resolveParticipantJourney } from "../utils/participantJourney";

export default function EventParticipantJourneyCard({
  status,
  onOpenDetails,
  onOpenValidate,
  onOpenWinner,
  onOpenProject,
  className = "",
}) {
  const journey = resolveParticipantJourney(status);

  const handlers = {
    details: onOpenDetails,
    validate: onOpenValidate,
    winner: onOpenWinner,
    project: onOpenProject,
  };

  const primaryHandler = handlers[journey.primaryAction] || onOpenDetails || null;
  const primaryLabel = primaryHandler ? journey.primaryLabel : "Detalhes";
  const primaryTone = journey.primaryAction === "details" ? "secondary" : "primary";
  const secondaryHandler = journey.secondaryAction
    ? handlers[journey.secondaryAction] || null
    : null;
  const showSecondaryAction = Boolean(
    secondaryHandler && journey.secondaryAction !== journey.primaryAction
  );

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <EventProgressStatusCard
        eventName={status?.eventName}
        projectTitle={status?.projectTitle}
        totalWords={status?.totalWords}
        targetWords={status?.targetWords}
        percent={status?.percent}
        remainingWords={status?.remainingWords}
        won={status?.isWinner}
        onAction={primaryHandler || undefined}
        actionLabel={primaryLabel}
        actionTone={primaryTone}
      />

      <div className="rounded-xl border border-[#eadfce] bg-[#fffaf2] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${journey.badgeClass}`}
          >
            {journey.label}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-700">{journey.message}</p>

        {showSecondaryAction && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="button"
              onClick={secondaryHandler}
            >
              {journey.secondaryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
