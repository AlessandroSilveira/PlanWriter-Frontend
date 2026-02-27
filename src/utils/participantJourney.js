import { normalizeEntityId } from "./eventProgress";

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function makeParticipantStatusKey(eventId, projectId) {
  return `${normalizeEntityId(eventId)}::${normalizeEntityId(projectId)}`;
}

export function normalizeParticipantStatus(payload) {
  if (!payload || typeof payload !== "object") return null;

  const targetWords = Math.max(0, Math.round(toSafeNumber(payload?.targetWords ?? payload?.TargetWords)));
  const totalWords = Math.max(0, Math.round(toSafeNumber(payload?.totalWords ?? payload?.TotalWords)));
  const remainingWordsRaw = payload?.remainingWords ?? payload?.RemainingWords;
  const remainingWords = Math.max(
    0,
    Math.round(
      Number.isFinite(Number(remainingWordsRaw))
        ? Number(remainingWordsRaw)
        : Math.max(0, targetWords - totalWords)
    )
  );

  const percentRaw = payload?.percent ?? payload?.Percent;
  const percent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number.isFinite(Number(percentRaw))
          ? Number(percentRaw)
          : targetWords > 0
            ? (totalWords * 100) / targetWords
            : 0
      )
    )
  );

  return {
    eventId: payload?.eventId ?? payload?.EventId ?? "",
    projectId: payload?.projectId ?? payload?.ProjectId ?? null,
    eventName: payload?.eventName ?? payload?.EventName ?? "Evento",
    projectTitle: payload?.projectTitle ?? payload?.ProjectTitle ?? "Projeto",
    eventStatus: String(payload?.eventStatus ?? payload?.EventStatus ?? "").toLowerCase(),
    isEventActive: Boolean(payload?.isEventActive ?? payload?.IsEventActive),
    isEventClosed: Boolean(payload?.isEventClosed ?? payload?.IsEventClosed),
    targetWords,
    totalWords,
    remainingWords,
    percent,
    isValidated: Boolean(payload?.isValidated ?? payload?.IsValidated),
    isWinner: Boolean(payload?.isWinner ?? payload?.IsWinner),
    isEligible: Boolean(payload?.isEligible ?? payload?.IsEligible),
    canValidate: Boolean(payload?.canValidate ?? payload?.CanValidate),
    eligibilityStatus: String(
      payload?.eligibilityStatus ?? payload?.EligibilityStatus ?? ""
    ).toLowerCase(),
    eligibilityMessage: String(
      payload?.eligibilityMessage ?? payload?.EligibilityMessage ?? ""
    ),
    validationBlockReason:
      payload?.validationBlockReason ?? payload?.ValidationBlockReason ?? null,
    validatedAtUtc: payload?.validatedAtUtc ?? payload?.ValidatedAtUtc ?? null,
  };
}

export function buildFallbackParticipantStatus({
  eventId,
  projectId,
  eventName,
  projectTitle,
  targetWords,
  totalWords,
  percent,
  remainingWords,
  isEventClosed = false,
  isEventActive = !isEventClosed,
  isWinner = false,
}) {
  return normalizeParticipantStatus({
    eventId,
    projectId,
    eventName,
    projectTitle,
    eventStatus: isEventClosed ? "closed" : isEventActive ? "active" : "scheduled",
    isEventActive,
    isEventClosed,
    targetWords,
    totalWords,
    percent,
    remainingWords,
    isValidated: false,
    isWinner,
    isEligible: Boolean(isWinner),
    canValidate: false,
    eligibilityStatus: isWinner ? "eligible" : isEventClosed ? "not_eligible" : "in_progress",
    eligibilityMessage: isWinner
      ? "Goodies de vencedor liberados."
      : isEventClosed
        ? "Evento encerrado."
        : "Continue escrevendo para atingir a meta do evento.",
    validationBlockReason: null,
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export function resolveParticipantJourney(status) {
  if (!status) {
    return {
      key: "pending",
      label: "Aguardando",
      badgeClass: "bg-slate-100 text-slate-700",
      message: "Não foi possível carregar seu status agora.",
      primaryAction: "details",
      primaryLabel: "Detalhes",
    };
  }

  if (status.isValidated && status.isWinner) {
    return {
      key: "winner",
      label: "Winner",
      badgeClass: "bg-emerald-100 text-emerald-700",
      message: "Validação concluída. Goodies de vencedor liberados.",
      primaryAction: "winner",
      primaryLabel: "Baixar goodies",
    };
  }

  if (status.isValidated) {
    return {
      key: "validated",
      label: "Validado",
      badgeClass: "bg-green-100 text-green-700",
      message: `Projeto validado em ${formatDate(status.validatedAtUtc) || "data recente"}.`,
      primaryAction: "details",
      primaryLabel: "Ver resultado",
    };
  }

  if (status.canValidate || status.eligibilityStatus === "pending_validation") {
    const isClosedLike =
      status.isEventClosed ||
      status.eventStatus === "closed" ||
      status.eventStatus === "disabled";
    return {
      key: isClosedLike ? "pending-validation" : "ready",
      label: isClosedLike ? "Pendente de validação" : "Apto para validar",
      badgeClass: isClosedLike ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800",
      message:
        status.validationBlockReason ||
        status.eligibilityMessage ||
        "Meta atingida. Faça a validação final para liberar os goodies.",
      primaryAction: "validate",
      primaryLabel: "Validar agora",
    };
  }

  if (status.isEventClosed) {
    const hasWindowBlock =
      String(status.validationBlockReason ?? "").toLowerCase().includes("janela");
    if (hasWindowBlock) {
      return {
        key: "closed-window",
        label: "Janela encerrada",
        badgeClass: "bg-amber-100 text-amber-800",
        message: status.validationBlockReason,
        primaryAction: "details",
        primaryLabel: "Ver resultado",
      };
    }

    return {
      key: "closed-not-eligible",
      label: "Encerrado sem elegibilidade",
      badgeClass: "bg-slate-100 text-slate-700",
      message:
        status.validationBlockReason ||
        status.eligibilityMessage ||
        "Evento encerrado sem elegibilidade de vencedor.",
      primaryAction: "details",
      primaryLabel: "Ver resultado",
    };
  }

  return {
    key: "in-progress",
    label: "Em andamento",
    badgeClass: "bg-blue-100 text-blue-700",
    message:
      status.remainingWords > 0
        ? `Faltam ${status.remainingWords.toLocaleString("pt-BR")} palavras para atingir a meta.`
        : status.eligibilityMessage || "Continue escrevendo para progredir no evento.",
    primaryAction: "project",
    primaryLabel: "Continuar no projeto",
  };
}
