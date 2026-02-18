import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import { getActiveEvents } from "../api/events";
import { getValidationStatus, submitValidation } from "../api/validation";
import FeedbackModal from "../components/FeedbackModal.jsx";

const DEFAULT_ALLOWED_SOURCES = ["current", "paste", "manual"];
const MODE_OPTIONS = [
  { value: "current", label: "Usar total do sistema" },
  { value: "paste", label: "Colar texto" },
  { value: "manual", label: "Informar manualmente" },
];
const TECHNICAL_ERROR_REGEX =
  /system\.|exception|stack trace|nullable object|materialization|sql|guid|invalidoperationexception|keynotfoundexception|request failed with status code/i;

function isTechnicalText(value) {
  return TECHNICAL_ERROR_REGEX.test(String(value ?? ""));
}

function toFriendlyApiMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || "Não foi possível concluir esta ação.";
  const status = Number(error?.response?.status ?? 0);

  if (status === 400) return fallback;
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "Não encontramos os dados solicitados para validação.";
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

function mapSubmitErrorMessage(error) {
  const fallback = "Não foi possível validar agora. Revise os dados e tente novamente.";
  const raw =
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.response?.data ||
    error?.message ||
    "";
  const normalized = String(raw).toLowerCase();

  if (normalized.includes("janela")) {
    return "A janela de validação deste evento está fechada no momento.";
  }

  if (normalized.includes("menor que a meta") || normalized.includes("faltam")) {
    return "Sua contagem ainda não atingiu a meta necessária para validar.";
  }

  if (normalized.includes("fonte de validação")) {
    return "Este método de validação não está disponível para este evento.";
  }

  if (normalized.includes("já validado")) {
    return "Este projeto já foi validado neste evento.";
  }

  return toFriendlyApiMessage(error, fallback);
}

function normalizeValidationStatus(payload) {
  if (!payload || typeof payload !== "object") return null;

  const allowedRaw = payload.allowedSources ?? payload.AllowedSources;
  const allowedSources = Array.isArray(allowedRaw)
    ? allowedRaw
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter((value) => DEFAULT_ALLOWED_SOURCES.includes(value))
    : [];

  const cleanBlockReason = String(payload.blockReason ?? payload.BlockReason ?? "").trim();
  const blockReason = cleanBlockReason && !isTechnicalText(cleanBlockReason) ? cleanBlockReason : "";

  return {
    targetWords: Math.max(0, Number(payload.targetWords ?? payload.TargetWords ?? 0)),
    totalWords: Math.max(0, Number(payload.totalWords ?? payload.TotalWords ?? 0)),
    isValidated: Boolean(payload.isValidated ?? payload.IsValidated),
    validatedAtUtc: payload.validatedAtUtc ?? payload.ValidatedAtUtc ?? null,
    validatedWords:
      payload.validatedWords ?? payload.ValidatedWords ?? payload.totalWords ?? payload.TotalWords ?? null,
    validationWindowStartsAtUtc:
      payload.validationWindowStartsAtUtc ?? payload.ValidationWindowStartsAtUtc ?? null,
    validationWindowEndsAtUtc:
      payload.validationWindowEndsAtUtc ?? payload.ValidationWindowEndsAtUtc ?? null,
    isWithinValidationWindow: Boolean(
      payload.isWithinValidationWindow ?? payload.IsWithinValidationWindow
    ),
    canValidate: Boolean(payload.canValidate ?? payload.CanValidate),
    blockReason,
    allowedSources: allowedSources.length ? allowedSources : DEFAULT_ALLOWED_SOURCES,
  };
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function countWordsStrict(text) {
  if (!text) return 0;
  // regra simples NaNo-like: tokens separados por espaço
  const m = text.trim().match(/[^\s]+/g);
  return m ? m.length : 0;
}

export default function Validate() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [eventId, setEventId] = useState("");
  const [mode, setMode] = useState("current"); // current | paste | manual

  const [paste, setPaste] = useState("");
  const [manual, setManual] = useState(0);

  const [statusData, setStatusData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
    onPrimary: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      try {
        const [ps, evs] = await Promise.all([getProjects(), getActiveEvents()]);
        if (cancelled) return;
        const list = Array.isArray(ps) ? ps : [];
        const eventsList = Array.isArray(evs) && evs.length ? evs : [];
        setProjects(list);
        setEvents(eventsList);
        if (list[0]) setProjectId(list[0].id ?? list[0].projectId);
        if (eventsList[0]) setEventId(eventsList[0].id ?? eventsList[0].Id);
      } catch (e) {
        if (cancelled) return;
        setErr(toFriendlyApiMessage(e, "Falha ao carregar dados para validação."));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!projectId || !eventId) {
      setStatusData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingStatus(true);
      setErr("");
      try {
        const payload = await getValidationStatus(eventId, projectId);
        if (cancelled) return;
        setStatusData(normalizeValidationStatus(payload));
      } catch (e) {
        if (cancelled) return;
        setStatusData(null);
        setErr(toFriendlyApiMessage(e, "Não foi possível consultar seu status de validação."));
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, eventId]);

  const allowedSources = statusData?.allowedSources ?? DEFAULT_ALLOWED_SOURCES;

  useEffect(() => {
    if (!allowedSources.includes(mode)) {
      setMode(allowedSources[0] ?? "current");
    }
  }, [allowedSources, mode]);

  const target = statusData?.targetWords ?? 0;
  const currentTotal = statusData?.totalWords ?? 0;

  const chosenTotal = useMemo(() => {
    if (mode === "current") return currentTotal;
    if (mode === "paste") return countWordsStrict(paste);
    return Math.max(0, Number(manual) || 0);
  }, [mode, currentTotal, paste, manual]);

  const isModeAllowed = allowedSources.includes(mode);
  const missingWords = Math.max(0, target - chosenTotal);

  const statusView = useMemo(() => {
    if (!projectId || !eventId) {
      return {
        key: "pendente",
        label: "pendente",
        type: "info",
        badgeClass: "bg-slate-100 text-slate-700",
        message: "Selecione um projeto e um evento para continuar.",
      };
    }

    if (!statusData) {
      return {
        key: "pendente",
        label: "pendente",
        type: "info",
        badgeClass: "bg-slate-100 text-slate-700",
        message: loadingStatus
          ? "Consultando seu status de validação…"
          : "Não foi possível carregar o status neste momento.",
      };
    }

    if (statusData.isValidated) {
      return {
        key: "ja-validado",
        label: "já validado",
        type: "success",
        badgeClass: "bg-green-100 text-green-700",
        message: `Projeto validado em ${formatDateTime(statusData.validatedAtUtc)}.`,
      };
    }

    if (!statusData.isWithinValidationWindow) {
      return {
        key: "fora-janela",
        label: "fora da janela",
        type: "warning",
        badgeClass: "bg-amber-100 text-amber-800",
        message: "A validação deste evento está fora da janela permitida.",
      };
    }

    if (!isModeAllowed) {
      return {
        key: "pendente",
        label: "pendente",
        type: "warning",
        badgeClass: "bg-amber-100 text-amber-800",
        message: "Esse método de validação não é aceito neste evento.",
      };
    }

    if (target > 0 && chosenTotal >= target) {
      return {
        key: "apto",
        label: "apto",
        type: "success",
        badgeClass: "bg-green-100 text-green-700",
        message: "Tudo pronto. Você já pode validar este projeto.",
      };
    }

    return {
      key: "pendente",
      label: "pendente",
      type: "info",
      badgeClass: "bg-slate-100 text-slate-700",
      message:
        statusData.blockReason ||
        `Ainda faltam ${missingWords.toLocaleString("pt-BR")} palavras para atingir a meta.`,
    };
  }, [projectId, eventId, statusData, loadingStatus, isModeAllowed, target, chosenTotal, missingWords]);

  const canSubmit = statusView.key === "apto" && !saving;

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, open: false, onPrimary: null }));
  };

  const submit = async () => {
    setSaving(true);
    setErr("");
    try {
      await submitValidation(eventId, projectId, chosenTotal, mode);
      setFeedback({
        open: true,
        type: "success",
        title: "Validação concluída",
        message: `Projeto validado com ${chosenTotal.toLocaleString("pt-BR")} palavras.`,
        primaryLabel: "OK",
        onPrimary: () => navigate("/winner"),
      });
    } catch (e) {
      setFeedback({
        open: true,
        type: "error",
        title: "Não foi possível validar",
        message: mapSubmitErrorMessage(e),
        primaryLabel: "OK",
        onPrimary: null,
      });
    } finally {
      setSaving(false);
    }
  };

  const windowStarts = formatDateTime(statusData?.validationWindowStartsAtUtc);
  const windowEnds = formatDateTime(statusData?.validationWindowEndsAtUtc);
  const allowedSourceLabels = MODE_OPTIONS.filter((option) => allowedSources.includes(option.value)).map(
    (option) => option.label
  );
  const ctaLabel =
    statusView.key === "apto"
      ? "Validar agora"
      : statusView.key === "ja-validado"
        ? "Já validado"
        : statusView.key === "fora-janela"
          ? "Fora da janela"
          : "Ainda não apto";

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Validar contagem de palavras</h1>
        <button className="button" onClick={() => navigate(-1)}>Voltar</button>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <section className="panel">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Evento</span>
            <select className="input" value={eventId} onChange={e => setEventId(e.target.value)}>
              {!events.length && <option>Sem evento ativo</option>}
              {events.map(ev => (
                <option key={ev.id ?? ev.Id} value={ev.id ?? ev.Id}>
                  {ev.name ?? ev.Name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Status da validação</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusView.badgeClass}`}>
              {statusView.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{statusView.message}</p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Janela: {windowStarts} até {windowEnds}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Métodos permitidos: {allowedSourceLabels.length ? allowedSourceLabels.join(" • ") : "Não informado"}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi">
            <div className="label">Meta do evento</div>
            <div className="value">{target.toLocaleString("pt-BR")}</div>
            <div className="hint">palavras</div>
          </div>
          <div className="kpi">
            <div className="label">Apurado (sistema)</div>
            <div className="value">{currentTotal.toLocaleString("pt-BR")}</div>
            <div className="hint">últimos dias do evento</div>
          </div>
          <div className="kpi">
            <div className="label">Escolhido</div>
            <div className="value">{chosenTotal.toLocaleString("pt-BR")}</div>
            <div className="hint">{mode === "current" ? "do sistema" : mode === "paste" ? "do texto colado" : "manual"}</div>
          </div>
          <div className="kpi">
            <div className="label">{statusView.key === "apto" ? "Status" : "Faltam"}</div>
            <div className={`value ${statusView.key === "apto" ? "text-green-700 dark:text-green-400" : ""}`}>
              {statusView.key === "apto" ? "OK ✅" : missingWords.toLocaleString("pt-BR")}
            </div>
            <div className="hint">{statusView.key === "apto" ? "pronto para validar" : "palavras"}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            {MODE_OPTIONS.map((option) => {
              const disabled = !allowedSources.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`button ${mode === option.value ? "ghost" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    disabled={disabled}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>

          {mode === "paste" && (
            <div className="mt-3">
              <textarea
                className="input w-full h-40"
                placeholder="Cole aqui o conteúdo do seu manuscrito para contagem…"
                value={paste}
                onChange={e => setPaste(e.target.value)}
              />
              <div className="text-sm text-muted mt-1">
                Contagem estimada: <b>{countWordsStrict(paste).toLocaleString("pt-BR")}</b> palavras
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="mt-3">
              <input
                type="number"
                className="input w-48"
                min={0}
                step={1}
                value={manual}
                onChange={e => setManual(Math.max(0, Number(e.target.value)||0))}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="button" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={!canSubmit}>
            {saving ? "Validando…" : ctaLabel}
          </button>
        </div>
      </section>

      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onPrimary={() => {
          const callback = feedback.onPrimary;
          closeFeedback();
          callback?.();
        }}
        onClose={closeFeedback}
      />
    </div>
  );
}
