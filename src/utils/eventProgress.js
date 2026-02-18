const DEFAULT_TARGET_WORDS = 50000;

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeEntityId(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function resolveTargetWords(targetWords, eventDefaultTargetWords, fallbackTargetWords) {
  const candidates = [targetWords, eventDefaultTargetWords, fallbackTargetWords, DEFAULT_TARGET_WORDS];
  for (const candidate of candidates) {
    const parsed = toSafeNumber(candidate);
    if (parsed > 0) return Math.round(parsed);
  }
  return DEFAULT_TARGET_WORDS;
}

export function calculateEventProgressMetrics({
  totalWrittenInEvent,
  targetWords,
  eventDefaultTargetWords,
  fallbackTargetWords,
}) {
  const safeTotal = Math.max(0, Math.round(toSafeNumber(totalWrittenInEvent)));
  const safeTarget = resolveTargetWords(targetWords, eventDefaultTargetWords, fallbackTargetWords);
  const percent = Math.min(100, Math.max(0, Math.round((safeTotal * 100) / safeTarget)));
  const remainingWords = Math.max(0, safeTarget - safeTotal);

  return {
    targetWords: safeTarget,
    totalWrittenInEvent: safeTotal,
    percent,
    remainingWords,
    won: safeTotal >= safeTarget,
  };
}

export function normalizeMyEventProgress(eventItem, options = {}) {
  const eventId = eventItem?.eventId ?? eventItem?.EventId ?? eventItem?.id ?? eventItem?.Id ?? "";
  const projectId = eventItem?.projectId ?? eventItem?.ProjectId ?? eventItem?.project?.id ?? null;
  const metrics = calculateEventProgressMetrics({
    totalWrittenInEvent: eventItem?.totalWrittenInEvent ?? eventItem?.TotalWrittenInEvent,
    targetWords: eventItem?.targetWords ?? eventItem?.TargetWords,
    eventDefaultTargetWords: eventItem?.eventDefaultTargetWords ?? eventItem?.EventDefaultTargetWords,
    fallbackTargetWords: options.fallbackTargetWords,
  });

  return {
    eventId,
    eventName: eventItem?.eventName ?? eventItem?.EventName ?? "Evento",
    projectId,
    projectTitle: eventItem?.projectTitle ?? eventItem?.ProjectTitle ?? "Participação individual",
    ...metrics,
  };
}

export function normalizeEventProjectProgress(progress, options = {}) {
  const metrics = calculateEventProgressMetrics({
    totalWrittenInEvent: progress?.totalWrittenInEvent ?? progress?.TotalWrittenInEvent,
    targetWords: progress?.targetWords ?? progress?.TargetWords,
    eventDefaultTargetWords: progress?.eventDefaultTargetWords ?? progress?.EventDefaultTargetWords,
    fallbackTargetWords: options.fallbackTargetWords,
  });

  return {
    ...progress,
    eventName: progress?.name ?? progress?.eventName ?? progress?.EventName ?? "Evento",
    ...metrics,
  };
}
