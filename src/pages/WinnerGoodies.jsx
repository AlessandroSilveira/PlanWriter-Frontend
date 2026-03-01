import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FeedbackModal from "../components/FeedbackModal.jsx";
import {
  downloadEventCertificate,
  getEventGoodies,
  getEventParticipantStatus,
  getMyEvents,
} from "../api/events";
import { resolveParticipantJourney } from "../utils/participantJourney";

const TECHNICAL_ERROR_REGEX =
  /system\.|exception|stack trace|nullable object|materialization|sql|guid|invalidoperationexception|request failed with status code/i;

function isTechnicalText(value) {
  return TECHNICAL_ERROR_REGEX.test(String(value ?? ""));
}

function getFriendlyErrorMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || "Não foi possível carregar a central de goodies agora.";
  const status = Number(error?.response?.status ?? 0);

  if (status === 400) return "Verifique os dados do evento e projeto e tente novamente.";
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para acessar estes goodies.";
  if (status === 404) return "Não encontramos este evento/projeto para sua conta.";
  if (status >= 500) return "Estamos com instabilidade no servidor. Tente novamente em instantes.";

  const payload = error?.response?.data;
  if (typeof payload === "string" && payload.trim().length > 0) {
    return isTechnicalText(payload) ? fallback : payload;
  }

  const apiMessage = payload?.message;
  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return isTechnicalText(apiMessage) ? fallback : apiMessage;
  }

  const apiTitle = payload?.title;
  if (typeof apiTitle === "string" && apiTitle.trim().length > 0) {
    return isTechnicalText(apiTitle) ? fallback : apiTitle;
  }

  const rawMessage = error?.message;
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    return isTechnicalText(rawMessage) ? fallback : rawMessage;
  }

  return fallback;
}

function formatWords(value) {
  const parsed = Number(value);
  return (Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0).toLocaleString("pt-BR");
}

function normalizeMyEventRow(row) {
  return {
    eventId: row?.eventId ?? row?.EventId ?? "",
    projectId: row?.projectId ?? row?.ProjectId ?? "",
    eventName: row?.eventName ?? row?.EventName ?? "Evento",
    projectTitle: row?.projectTitle ?? row?.ProjectTitle ?? "Projeto",
  };
}

function normalizeGoodies(data) {
  const eligibility = data?.eligibility ?? data?.Eligibility ?? {};
  const certificate = data?.certificate ?? data?.Certificate ?? {};
  const badgesRaw = Array.isArray(data?.badges)
    ? data.badges
    : Array.isArray(data?.Badges)
      ? data.Badges
      : [];

  return {
    eventId: data?.eventId ?? data?.EventId ?? "",
    projectId: data?.projectId ?? data?.ProjectId ?? "",
    eventName: data?.eventName ?? data?.EventName ?? "Evento",
    projectTitle: data?.projectTitle ?? data?.ProjectTitle ?? "Projeto",
    targetWords: Math.max(0, Number(data?.targetWords ?? data?.TargetWords ?? 0)),
    totalWords: Math.max(0, Number(data?.totalWords ?? data?.TotalWords ?? 0)),
    validatedAtUtc: data?.validatedAtUtc ?? data?.ValidatedAtUtc ?? null,
    won: Boolean(data?.won ?? data?.Won),
    eligibility: {
      isEligible: Boolean(eligibility?.isEligible ?? eligibility?.IsEligible),
      canValidate: Boolean(eligibility?.canValidate ?? eligibility?.CanValidate),
      status: String(eligibility?.status ?? eligibility?.Status ?? "").toLowerCase(),
      message: String(eligibility?.message ?? eligibility?.Message ?? ""),
    },
    certificate: {
      available: Boolean(certificate?.available ?? certificate?.Available),
      downloadUrl: certificate?.downloadUrl ?? certificate?.DownloadUrl ?? null,
      message: String(certificate?.message ?? certificate?.Message ?? ""),
    },
    badges: badgesRaw.map((badge) => ({
      id: badge?.id ?? badge?.Id ?? "",
      name: badge?.name ?? badge?.Name ?? "Badge",
      icon: badge?.icon ?? badge?.Icon ?? "🏆",
      description: badge?.description ?? badge?.Description ?? "",
      awardedAt: badge?.awardedAt ?? badge?.AwardedAt ?? null,
    })),
  };
}

function normalizeParticipantStatus(data) {
  const allowedValidationSourcesRaw = Array.isArray(data?.allowedValidationSources)
    ? data.allowedValidationSources
    : Array.isArray(data?.AllowedValidationSources)
      ? data.AllowedValidationSources
      : [];

  return {
    eventId: data?.eventId ?? data?.EventId ?? "",
    projectId: data?.projectId ?? data?.ProjectId ?? "",
    eventName: data?.eventName ?? data?.EventName ?? "Evento",
    projectTitle: data?.projectTitle ?? data?.ProjectTitle ?? "Projeto",
    eventStatus: String(data?.eventStatus ?? data?.EventStatus ?? "").toLowerCase(),
    isEventActive: Boolean(data?.isEventActive ?? data?.IsEventActive),
    isEventClosed: Boolean(data?.isEventClosed ?? data?.IsEventClosed),
    eventStartsAtUtc: data?.eventStartsAtUtc ?? data?.EventStartsAtUtc ?? null,
    eventEndsAtUtc: data?.eventEndsAtUtc ?? data?.EventEndsAtUtc ?? null,
    validationWindowStartsAtUtc:
      data?.validationWindowStartsAtUtc ?? data?.ValidationWindowStartsAtUtc ?? null,
    validationWindowEndsAtUtc:
      data?.validationWindowEndsAtUtc ?? data?.ValidationWindowEndsAtUtc ?? null,
    isValidationWindowOpen: Boolean(
      data?.isValidationWindowOpen ?? data?.IsValidationWindowOpen
    ),
    targetWords: Math.max(0, Number(data?.targetWords ?? data?.TargetWords ?? 0)),
    totalWords: Math.max(0, Number(data?.totalWords ?? data?.TotalWords ?? 0)),
    percent: Math.max(0, Number(data?.percent ?? data?.Percent ?? 0)),
    remainingWords: Math.max(0, Number(data?.remainingWords ?? data?.RemainingWords ?? 0)),
    isValidated: Boolean(data?.isValidated ?? data?.IsValidated),
    isWinner: Boolean(data?.isWinner ?? data?.IsWinner),
    isEligible: Boolean(data?.isEligible ?? data?.IsEligible),
    canValidate: Boolean(data?.canValidate ?? data?.CanValidate),
    eligibilityStatus: String(
      data?.eligibilityStatus ?? data?.EligibilityStatus ?? ""
    ).toLowerCase(),
    eligibilityMessage: String(
      data?.eligibilityMessage ?? data?.EligibilityMessage ?? ""
    ),
    validationBlockReason:
      data?.validationBlockReason ?? data?.ValidationBlockReason ?? null,
    validatedAtUtc: data?.validatedAtUtc ?? data?.ValidatedAtUtc ?? null,
    validatedWords: Number(data?.validatedWords ?? data?.ValidatedWords ?? 0) || null,
    validationSource: data?.validationSource ?? data?.ValidationSource ?? null,
    allowedValidationSources: allowedValidationSourcesRaw.map((item) => String(item)),
  };
}

function buildFallbackParticipantStatusFromGoodies(goodies) {
  const targetWords = Math.max(0, Number(goodies?.targetWords ?? 0));
  const totalWords = Math.max(0, Number(goodies?.totalWords ?? 0));
  const remainingWords = Math.max(0, targetWords - totalWords);
  const percent = targetWords > 0 ? Math.round((totalWords / targetWords) * 100) : 0;

  return {
    eventId: goodies?.eventId ?? "",
    projectId: goodies?.projectId ?? "",
    eventName: goodies?.eventName ?? "Evento",
    projectTitle: goodies?.projectTitle ?? "Projeto",
    eventStatus: "",
    isEventActive: false,
    isEventClosed: false,
    eventStartsAtUtc: null,
    eventEndsAtUtc: null,
    validationWindowStartsAtUtc: null,
    validationWindowEndsAtUtc: null,
    isValidationWindowOpen: false,
    targetWords,
    totalWords,
    percent: Math.max(0, Math.min(100, percent)),
    remainingWords,
    isValidated: Boolean(goodies?.validatedAtUtc),
    isWinner: Boolean(goodies?.won),
    isEligible: Boolean(goodies?.eligibility?.isEligible),
    canValidate: Boolean(goodies?.eligibility?.canValidate),
    eligibilityStatus: String(goodies?.eligibility?.status ?? "").toLowerCase(),
    eligibilityMessage: String(goodies?.eligibility?.message ?? ""),
    validationBlockReason: null,
    validatedAtUtc: goodies?.validatedAtUtc ?? null,
    validatedWords: null,
    validationSource: null,
    allowedValidationSources: [],
  };
}

function mergeWinnerData(statusData, goodiesData) {
  const effectiveStatus = statusData || buildFallbackParticipantStatusFromGoodies(goodiesData);
  const effectiveGoodies = goodiesData || {
    certificate: { available: false, downloadUrl: null, message: "" },
    badges: [],
  };

  const targetWords = Math.max(
    0,
    Number(effectiveStatus?.targetWords ?? effectiveGoodies?.targetWords ?? 0)
  );
  const totalWords = Math.max(
    0,
    Number(effectiveStatus?.totalWords ?? effectiveGoodies?.totalWords ?? 0)
  );
  const remainingWords = Math.max(
    0,
    Number(
      effectiveStatus?.remainingWords ??
        effectiveGoodies?.remainingWords ??
        targetWords - totalWords
    )
  );
  const percent = targetWords > 0 ? Math.round((totalWords / targetWords) * 100) : 0;

  const certificateAvailable = Boolean(
    effectiveGoodies?.certificate?.available ?? effectiveStatus?.isEligible
  );
  const certificateMessage = String(
    effectiveGoodies?.certificate?.message ??
      (certificateAvailable
        ? "Certificado liberado para download."
        : "Certificado bloqueado para esta participação.")
  );

  return {
    eventId: effectiveStatus?.eventId ?? effectiveGoodies?.eventId ?? "",
    projectId: effectiveStatus?.projectId ?? effectiveGoodies?.projectId ?? "",
    eventName: effectiveStatus?.eventName ?? effectiveGoodies?.eventName ?? "Evento",
    projectTitle: effectiveStatus?.projectTitle ?? effectiveGoodies?.projectTitle ?? "Projeto",
    targetWords,
    totalWords,
    remainingWords,
    percent: Math.max(0, Math.min(100, percent)),
    eventStatus: String(effectiveStatus?.eventStatus ?? ""),
    isEventActive: Boolean(effectiveStatus?.isEventActive),
    isEventClosed: Boolean(effectiveStatus?.isEventClosed),
    isValidationWindowOpen: Boolean(effectiveStatus?.isValidationWindowOpen),
    validationWindowStartsAtUtc: effectiveStatus?.validationWindowStartsAtUtc ?? null,
    validationWindowEndsAtUtc: effectiveStatus?.validationWindowEndsAtUtc ?? null,
    validatedAtUtc: effectiveStatus?.validatedAtUtc ?? effectiveGoodies?.validatedAtUtc ?? null,
    validatedWords: effectiveStatus?.validatedWords ?? null,
    validationSource: effectiveStatus?.validationSource ?? null,
    eligibility: {
      isEligible: Boolean(effectiveStatus?.isEligible),
      canValidate: Boolean(effectiveStatus?.canValidate),
      status: String(
        effectiveStatus?.eligibilityStatus ?? effectiveGoodies?.eligibility?.status ?? ""
      ).toLowerCase(),
      message: String(
        effectiveStatus?.eligibilityMessage ?? effectiveGoodies?.eligibility?.message ?? ""
      ),
    },
    validationBlockReason: effectiveStatus?.validationBlockReason ?? null,
    certificate: {
      available: certificateAvailable,
      downloadUrl: effectiveGoodies?.certificate?.downloadUrl ?? null,
      message: certificateMessage,
    },
    badges: Array.isArray(effectiveGoodies?.badges) ? effectiveGoodies.badges : [],
    won: Boolean(effectiveStatus?.isWinner ?? effectiveGoodies?.won),
    allowedValidationSources: Array.isArray(effectiveStatus?.allowedValidationSources)
      ? effectiveStatus.allowedValidationSources
      : [],
  };
}

function getGoodieBlockedReason(goodies) {
  if (!goodies) return "";
  if (goodies.validationBlockReason) return goodies.validationBlockReason;
  if (goodies.eligibility.status === "pending_validation") {
    return "Meta atingida. Faça a validação final para liberar os goodies.";
  }
  if (goodies.eligibility.status === "in_progress" && goodies.remainingWords > 0) {
    return `Faltam ${formatWords(goodies.remainingWords)} palavras para atingir a meta.`;
  }
  if (goodies.eligibility.status === "not_eligible") {
    return "Meta não atingida dentro do período do evento.";
  }
  if (goodies.eligibility.status === "invalid_target") {
    return "A meta do evento está inválida e precisa ser revisada pelo administrador.";
  }
  return goodies.eligibility.message || "Item bloqueado para esta participação.";
}

function getEventStatusLabel(eventStatus, isEventClosed) {
  if (isEventClosed || eventStatus === "closed" || eventStatus === "disabled") return "Encerrado";
  if (eventStatus === "active") return "Ativo";
  if (eventStatus === "scheduled") return "Agendado";
  return "Aguardando";
}

function getStatusMeta(status) {
  switch (status) {
    case "eligible":
      return {
        label: "Liberado",
        className: "bg-green-100 text-green-700",
      };
    case "pending_validation":
      return {
        label: "Pendente de validação",
        className: "bg-amber-100 text-amber-800",
      };
    case "in_progress":
      return {
        label: "Em andamento",
        className: "bg-blue-100 text-blue-700",
      };
    case "not_eligible":
      return {
        label: "Não elegível",
        className: "bg-red-100 text-red-700",
      };
    case "invalid_target":
      return {
        label: "Configuração inválida",
        className: "bg-red-100 text-red-700",
      };
    default:
      return {
        label: "Aguardando",
        className: "bg-slate-100 text-slate-700",
      };
  }
}

function buildCanvasDataUrl({
  title,
  subtitle,
  primary,
  secondary,
  badgeText,
  background = "#0f172a",
  accent = "#14b8a6",
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, canvas.width, 96);
  ctx.fillRect(0, 530, canvas.width, 100);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 58px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(title.slice(0, 34), 56, 214);

  ctx.font = "bold 36px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(subtitle.slice(0, 52), 56, 276);

  ctx.font = "30px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(primary.slice(0, 68), 56, 348);
  ctx.fillText(secondary.slice(0, 68), 56, 396);

  ctx.beginPath();
  ctx.arc(1030, 216, 112, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  ctx.fillStyle = "#062e1f";
  ctx.font = "bold 34px system-ui, -apple-system, Segoe UI, Roboto";
  const text = badgeText.slice(0, 16);
  const width = ctx.measureText(text).width;
  ctx.fillText(text, 1030 - width / 2, 228);

  return canvas.toDataURL("image/png");
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function WinnerGoodies() {
  const navigate = useNavigate();
  const query = useQuery();

  const requestedEventId = query.get("eventId") || "";
  const requestedProjectId = query.get("projectId") || "";

  const [myEvents, setMyEvents] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingGoodies, setLoadingGoodies] = useState(false);
  const [error, setError] = useState("");

  const [goodies, setGoodies] = useState(null);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingEvents(true);
      setError("");
      try {
        const rows = await getMyEvents();
        if (cancelled) return;

        const normalized = (Array.isArray(rows) ? rows : [])
          .map(normalizeMyEventRow)
          .filter((row) => row.eventId && row.projectId);

        setMyEvents(normalized);

        if (normalized.length === 0) {
          setSelectedKey("");
          return;
        }

        const requestedKey = `${requestedEventId}::${requestedProjectId}`;
        const hasRequested = normalized.some(
          (row) => `${row.eventId}::${row.projectId}` === requestedKey
        );
        const fallbackRow = normalized[0];
        const keyToUse = hasRequested
          ? requestedKey
          : `${fallbackRow?.eventId}::${fallbackRow?.projectId}`;

        setSelectedKey(keyToUse);
      } catch (fetchError) {
        if (cancelled) return;
        setMyEvents([]);
        setSelectedKey("");
        setError(getFriendlyErrorMessage(fetchError, "Não foi possível carregar seus eventos."));
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedEventId, requestedProjectId]);

  useEffect(() => {
    if (!selectedKey) {
      setGoodies(null);
      return;
    }

    const [eventId, projectId] = selectedKey.split("::");
    if (!eventId || !projectId) {
      setGoodies(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingGoodies(true);
      setError("");
      try {
        const [statusResult, goodiesResult] = await Promise.allSettled([
          getEventParticipantStatus(eventId, projectId),
          getEventGoodies(eventId, projectId),
        ]);
        if (cancelled) return;

        let normalizedStatus = null;
        let normalizedGoodies = null;

        if (statusResult.status === "fulfilled") {
          normalizedStatus = normalizeParticipantStatus(statusResult.value);
        } else {
          const statusCode = Number(statusResult.reason?.response?.status ?? 0);
          if (statusCode !== 404 && statusCode !== 405) {
            throw statusResult.reason;
          }
        }

        if (goodiesResult.status === "fulfilled") {
          normalizedGoodies = normalizeGoodies(goodiesResult.value);
        } else if (!normalizedStatus) {
          throw goodiesResult.reason;
        }

        const merged = mergeWinnerData(normalizedStatus, normalizedGoodies);
        if (!merged.eventId || !merged.projectId) {
          throw new Error("Não foi possível identificar evento e projeto da participação.");
        }

        setGoodies(merged);
      } catch (fetchError) {
        if (cancelled) return;
        setGoodies(null);
        setError(getFriendlyErrorMessage(fetchError));
      } finally {
        if (!cancelled) setLoadingGoodies(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) return;

    const [eventId, projectId] = selectedKey.split("::");
    if (!eventId || !projectId) return;

    const currentEventId = query.get("eventId") || "";
    const currentProjectId = query.get("projectId") || "";
    if (currentEventId === eventId && currentProjectId === projectId) return;

    navigate(`/winner?eventId=${eventId}&projectId=${projectId}`, { replace: true });
  }, [selectedKey, navigate, query]);

  const remainingWords = useMemo(() => {
    if (!goodies) return 0;
    return Math.max(0, goodies.remainingWords ?? goodies.targetWords - goodies.totalWords);
  }, [goodies]);

  const journey = useMemo(
    () => (goodies ? resolveParticipantJourney(goodies) : null),
    [goodies]
  );
  const statusMeta = useMemo(() => getStatusMeta(goodies?.eligibility?.status), [goodies?.eligibility?.status]);
  const blockedReason = useMemo(() => getGoodieBlockedReason(goodies), [goodies]);
  const eventStatusLabel = useMemo(
    () => getEventStatusLabel(goodies?.eventStatus, goodies?.isEventClosed),
    [goodies?.eventStatus, goodies?.isEventClosed]
  );
  const validationWindowLabel = useMemo(() => {
    if (!goodies) return "Não informada";
    if (goodies.isValidationWindowOpen) return "Aberta";
    if (!goodies.validationWindowStartsAtUtc || !goodies.validationWindowEndsAtUtc) return "Não informada";
    return "Fechada";
  }, [goodies]);

  const badgeImageUrl = useMemo(() => {
    if (!goodies?.eligibility?.isEligible) return null;

    const firstBadge = goodies.badges[0];
    return buildCanvasDataUrl({
      title: "Badge de Vencedor",
      subtitle: goodies.eventName,
      primary: goodies.projectTitle,
      secondary: `${formatWords(goodies.totalWords)} / ${formatWords(goodies.targetWords)} palavras`,
      badgeText: firstBadge?.name || "WINNER",
      background: "#0f172a",
      accent: "#22c55e",
    });
  }, [goodies]);

  const socialImageUrl = useMemo(() => {
    if (!goodies?.eligibility?.isEligible) return null;

    return buildCanvasDataUrl({
      title: "PlanWriter Winner",
      subtitle: goodies.projectTitle,
      primary: goodies.eventName,
      secondary: `Total: ${formatWords(goodies.totalWords)} palavras`,
      badgeText: "WINNER",
      background: "#1e293b",
      accent: "#14b8a6",
    });
  }, [goodies]);

  const openFeedback = (payload) => {
    setFeedback({
      open: true,
      type: payload?.type || "info",
      title: payload?.title || "Atenção",
      message: payload?.message || "",
      primaryLabel: payload?.primaryLabel || "OK",
    });
  };

  const closeFeedback = () => {
    setFeedback((current) => ({ ...current, open: false }));
  };

  const handleDownloadCertificate = async () => {
    if (!goodies?.eventId || !goodies?.projectId) return;

    try {
      const blob = await downloadEventCertificate(goodies.eventId, goodies.projectId);
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, "certificado-planwriter.pdf");
      URL.revokeObjectURL(objectUrl);

      openFeedback({
        type: "success",
        title: "Download iniciado",
        message: "Seu certificado está sendo baixado em PDF.",
      });
    } catch (downloadError) {
      openFeedback({
        type: "error",
        title: "Não foi possível baixar o certificado",
        message: getFriendlyErrorMessage(downloadError, "Tente novamente em instantes."),
      });
    }
  };

  const handleCopyShareText = async () => {
    if (!goodies) return;

    const text = `Concluí minha meta no ${goodies.eventName} com o projeto \"${goodies.projectTitle}\" no PlanWriter! 🎉`;

    try {
      await navigator.clipboard.writeText(text);
      openFeedback({
        type: "success",
        title: "Texto copiado",
        message: "Mensagem pronta para compartilhar copiada para sua área de transferência.",
      });
    } catch {
      openFeedback({
        type: "warning",
        title: "Não foi possível copiar",
        message: "Seu navegador bloqueou a cópia automática. Copie manualmente o texto exibido.",
      });
    }
  };

  const shareText = goodies
    ? `Concluí minha meta no ${goodies.eventName} com o projeto \"${goodies.projectTitle}\" no PlanWriter! 🎉`
    : "";
  const showValidateCta = journey?.primaryAction === "validate" && goodies?.eventId && goodies?.projectId;

  return (
    <div className="container py-6 space-y-4">
      <section className="panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Central de goodies</h1>
            <p className="text-sm text-gray-600">
              Certificado, badges e imagem social em um fluxo único por evento e projeto.
            </p>
          </div>

          <button type="button" className="button" onClick={() => navigate("/events")}>
            Voltar para eventos
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Participação</span>
            <select
              className="input"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              disabled={loadingEvents || myEvents.length === 0}
            >
              {myEvents.length === 0 ? (
                <option value="">Sem participações</option>
              ) : (
                myEvents.map((row) => {
                  const key = `${row.eventId}::${row.projectId}`;
                  return (
                    <option key={key} value={key}>
                      {row.eventName} - {row.projectTitle}
                    </option>
                  );
                })
              )}
            </select>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!loadingGoodies && goodies && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Jornada final do evento</p>
                <p className="mt-1 text-sm text-gray-700">
                  {journey?.message || goodies.eligibility.message}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${journey?.badgeClass || statusMeta.className}`}>
                {journey?.label || statusMeta.label}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">
              Progresso: {formatWords(goodies.totalWords)} / {formatWords(goodies.targetWords)} palavras
              {remainingWords > 0 ? ` • faltam ${formatWords(remainingWords)} palavras` : " • meta concluída"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Evento: {eventStatusLabel} • Janela de validação: {validationWindowLabel}
            </p>

            {goodies.validationBlockReason && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                Motivo do bloqueio: {goodies.validationBlockReason}
              </p>
            )}

            {showValidateCta && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate(`/validate?eventId=${goodies.eventId}&projectId=${goodies.projectId}`)
                  }
                >
                  {journey.primaryLabel}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => navigate(`/events/${goodies.eventId}`)}
                >
                  Ver detalhes do evento
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {loadingGoodies && (
        <section className="panel">
          <p className="text-sm text-gray-600">Carregando goodies…</p>
        </section>
      )}

      {!loadingGoodies && goodies && (
        <section className="grid lg:grid-cols-3 gap-4">
          <article className="panel">
            <h2 className="text-base font-semibold mb-1">Certificado</h2>
            <p className="text-sm text-gray-600 mb-3">{goodies.certificate.message || "Certificado do evento."}</p>

            <div className="space-y-2">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!goodies.certificate.available}
                onClick={() =>
                  navigate(`/certificate?eventId=${goodies.eventId}&projectId=${goodies.projectId}`)
                }
              >
                {goodies.certificate.available ? "Abrir certificado" : "Certificado bloqueado"}
              </button>

              <button
                type="button"
                className="button w-full"
                disabled={!goodies.certificate.available}
                onClick={handleDownloadCertificate}
              >
                Baixar PDF
              </button>

              {goodies.eligibility.canValidate && (
                <button
                  type="button"
                  className="button w-full"
                  onClick={() => navigate("/validate")}
                >
                  Fazer validação final
                </button>
              )}

              {!goodies.certificate.available && (
                <p className="text-xs text-amber-700">
                  {blockedReason}
                </p>
              )}
            </div>
          </article>

          <article className="panel">
            <h2 className="text-base font-semibold mb-1">Badge de vencedor</h2>
            <p className="text-sm text-gray-600 mb-3">
              Use seu badge no perfil e em materiais públicos.
            </p>

            {goodies.badges.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-700 mb-3">
                {goodies.badges.map((badge) => (
                  <li key={badge.id || badge.name} className="rounded-lg border border-[var(--line)] px-3 py-2">
                    <span className="mr-2">{badge.icon}</span>
                    <b>{badge.name}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600 mb-3">Nenhum badge de evento listado para esta participação.</p>
            )}

            {badgeImageUrl ? (
              <a
                className="btn-primary inline-block"
                href={badgeImageUrl}
                download="planwriter-badge-winner.png"
              >
                Baixar badge (PNG)
              </a>
            ) : (
              <div className="space-y-2">
                <button type="button" className="button" disabled>
                  Badge bloqueado
                </button>
                <p className="text-xs text-amber-700">{blockedReason}</p>
              </div>
            )}
          </article>

          <article className="panel">
            <h2 className="text-base font-semibold mb-1">Imagem social</h2>
            <p className="text-sm text-gray-600 mb-3">
              Imagem pronta para compartilhar sua conquista.
            </p>

            {socialImageUrl ? (
              <div className="space-y-2">
                <img
                  src={socialImageUrl}
                  alt="Prévia de imagem social"
                  className="w-full rounded-lg border border-[var(--line)]"
                />
                <a
                  className="btn-primary inline-block"
                  href={socialImageUrl}
                  download="planwriter-social-winner.png"
                >
                  Baixar imagem social
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <button type="button" className="button" disabled>
                  Imagem bloqueada
                </button>
                <p className="text-xs text-amber-700">{blockedReason}</p>
              </div>
            )}

            <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm text-gray-700">{shareText || "Texto de compartilhamento indisponível."}</p>
              <button
                type="button"
                className="button mt-2"
                onClick={handleCopyShareText}
                disabled={!shareText}
              >
                Copiar texto
              </button>
            </div>
          </article>
        </section>
      )}

      {!loadingEvents && myEvents.length === 0 && !error && (
        <section className="panel">
          <p className="text-sm text-gray-700">
            Você ainda não participa de eventos com projeto vinculado. Entre em um evento para liberar a central de goodies.
          </p>
          <button type="button" className="button mt-3" onClick={() => navigate("/events")}>Ir para eventos</button>
        </section>
      )}

      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onClose={closeFeedback}
      />
    </div>
  );
}
