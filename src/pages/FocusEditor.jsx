import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  Unlink2,
} from "lucide-react";
import { addProgress, getProjects } from "../api/projects";
import FeedbackModal from "../components/FeedbackModal.jsx";
import {
  exportHtmlAsDoc,
  exportHtmlAsPdf,
  exportTextAsTxt,
} from "../utils/export/index.js";
import { isOngoing } from "../utils/overviewAggregation";

const EDITOR_DRAFTS_STORAGE_KEY = "pw_focus_editor_drafts_v1";
const EDITOR_DRAFT_HISTORY_STORAGE_KEY = "pw_focus_editor_draft_history_v1";
const AUTOSAVE_DELAY_MS = 5000;
const DEFAULT_DRAFT_SCOPE = "__sem_projeto__";
const MAX_DRAFT_HISTORY_ENTRIES = 5;
const DRAFT_HISTORY_MIN_INTERVAL_MS = 30000;

function countWords(text) {
  return (text.trim().match(/\b\w+\b/gu) || []).length;
}

function normalizeEditorHtml(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const compact = normalized.replace(/\s+/g, "");
  if (
    compact === "<br>" ||
    compact === "<div><br></div>" ||
    compact === "<p><br></p>" ||
    compact === "<p></p>"
  ) {
    return "";
  }

  return normalized;
}

function htmlToPlainText(html) {
  if (!html) return "";

  if (typeof document === "undefined") {
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  return String(container.innerText || container.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .trimEnd();
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getDraftScopeKey(projectId) {
  const value = String(projectId ?? "").trim();
  return value || DEFAULT_DRAFT_SCOPE;
}

function readStoredDrafts() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(EDITOR_DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredDrafts(nextDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EDITOR_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
}

function readStoredDraftHistory() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(EDITOR_DRAFT_HISTORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredDraftHistory(nextHistory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    EDITOR_DRAFT_HISTORY_STORAGE_KEY,
    JSON.stringify(nextHistory)
  );
}

function readStoredDraft(projectId) {
  const drafts = readStoredDrafts();
  return drafts[getDraftScopeKey(projectId)] ?? null;
}

function readStoredDraftVersions(projectId) {
  const history = readStoredDraftHistory();
  const stored = history[getDraftScopeKey(projectId)];
  return Array.isArray(stored) ? stored : [];
}

function removeStoredDraft(projectId) {
  const drafts = readStoredDrafts();
  const scopeKey = getDraftScopeKey(projectId);
  if (!(scopeKey in drafts)) return;
  delete drafts[scopeKey];
  writeStoredDrafts(drafts);
}

function setStoredDraft(projectId, payload) {
  const drafts = readStoredDrafts();
  drafts[getDraftScopeKey(projectId)] = payload;
  writeStoredDrafts(drafts);
}

function formatDraftTimestamp(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(remainingSeconds)}`;
}

function createDraftPayload(
  projectId,
  projectLabel,
  html,
  updatedAt = new Date().toISOString()
) {
  const normalizedHtml = normalizeEditorHtml(html);
  const plain = htmlToPlainText(normalizedHtml);

  return {
    projectId: projectId || null,
    projectLabel: projectLabel || "Sem projeto",
    contentHtml: normalizedHtml,
    updatedAt,
    wordCount: countWords(plain),
    previewText: plain.slice(0, 180),
  };
}

function appendStoredDraftVersion(projectId, snapshot, options = {}) {
  if (!snapshot?.contentHtml) return readStoredDraftVersions(projectId);

  const scopeKey = getDraftScopeKey(projectId);
  const history = readStoredDraftHistory();
  const current = Array.isArray(history[scopeKey]) ? history[scopeKey] : [];
  const latest = current[0];

  const force = options.force === true;
  const snapshotTime = Date.parse(snapshot.updatedAt ?? "");
  const latestTime = Date.parse(latest?.updatedAt ?? "");

  if (!force && latest?.contentHtml === snapshot.contentHtml) {
    return current;
  }

  if (
    !force &&
    Number.isFinite(snapshotTime) &&
    Number.isFinite(latestTime) &&
    snapshotTime - latestTime < DRAFT_HISTORY_MIN_INTERVAL_MS
  ) {
    return current;
  }

  const nextHistory = [snapshot, ...current].slice(0, MAX_DRAFT_HISTORY_ENTRIES);
  history[scopeKey] = nextHistory;
  writeStoredDraftHistory(history);
  return nextHistory;
}

function normalizeFontSize(value) {
  const parsed = String(value ?? "").match(/[1-7]/)?.[0];
  return parsed ?? "3";
}

const fmt = (value) => (Number(value) || 0).toLocaleString("pt-BR");

const DEFAULT_TOOLBAR_STATE = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  subscript: false,
  superscript: false,
  unorderedList: false,
  orderedList: false,
  justifyLeft: true,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  block: "p",
  fontSize: "3",
};

const BLOCK_OPTIONS = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "blockquote", label: "Blockquote" },
  { value: "pre", label: "Code block" },
];

const FONT_SIZE_OPTIONS = [
  { value: "2", label: "Pequeno" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Grande" },
  { value: "5", label: "Maior" },
];

async function ensureAudioContext(audioContextRef) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  let context = audioContextRef.current;
  if (!context) {
    context = new AudioContextCtor();
    audioContextRef.current = context;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  return context;
}

async function playCue(audioContextRef) {
  const context = await ensureAudioContext(audioContextRef);
  if (!context) return;

  const pulseOffsets = [0, 0.24];
  const harmonics = [
    { frequency: 1318.51, gain: 0.14, type: "triangle" },
    { frequency: 1975.53, gain: 0.06, type: "sine" },
    { frequency: 2637.02, gain: 0.035, type: "sine" },
  ];

  for (const offset of pulseOffsets) {
    for (const harmonic of harmonics) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime + offset;
      const attackAt = startAt + 0.015;
      const decayAt = startAt + 0.24;

      oscillator.type = harmonic.type;
      oscillator.frequency.setValueAtTime(harmonic.frequency, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(harmonic.gain, attackAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, decayAt);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt);
      oscillator.stop(decayAt + 0.03);
    }
  }
}

function getCurrentBlock(editorRoot) {
  if (typeof window === "undefined" || !editorRoot) return "p";

  const selection = window.getSelection?.();
  if (!selection?.anchorNode || !editorRoot.contains(selection.anchorNode)) {
    return "p";
  }

  let node =
    selection.anchorNode.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : selection.anchorNode;

  if (!(node instanceof Element)) return "p";

  const block = node.closest("h1, h2, blockquote, ul, ol, p, pre, div");
  if (!block) return "p";
  if (block.tagName.toLowerCase() === "div") return "p";
  return block.tagName.toLowerCase();
}

function ToolbarButton({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`flex h-10 min-w-10 items-center justify-center rounded-lg border transition ${
        active
          ? "border-[#2f5d73] bg-[#2f5d73] text-white"
          : "border-transparent bg-transparent text-[#374151] hover:border-black/10 hover:bg-white"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={2.1} />
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 hidden h-7 w-px bg-black/10 md:block" />;
}

function ToolbarSelect({ value, onChange, options, width = "190px" }) {
  return (
    <select
      style={{ width }}
      className="h-10 shrink-0 rounded-lg border border-black/10 bg-white px-3 pr-9 text-sm font-sans font-medium text-[#374151] outline-none transition focus:border-[#2f5d73]"
      value={value}
      onMouseDown={(event) => event.preventDefault()}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DraftRecoveryModal({ draft, onRestore, onDiscard, onClose }) {
  if (!draft) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recuperar rascunho</h2>
          <p className="mt-2 text-sm text-gray-600">
            Encontramos um rascunho salvo automaticamente para{" "}
            <span className="font-medium text-[#111827]">{draft.projectLabel}</span>.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8f5ef] p-4 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong>Último autosave:</strong> {formatDraftTimestamp(draft.updatedAt)}
            </span>
            <span>
              <strong>Palavras:</strong> {fmt(draft.wordCount)}
            </span>
          </div>
          {draft.previewText ? (
            <p className="mt-3 line-clamp-3 text-gray-600">{draft.previewText}</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="button" onClick={onDiscard}>
            Descartar rascunho
          </button>
          <button type="button" className="btn-primary" onClick={onRestore}>
            Recuperar rascunho
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftHistoryPanel({ versions, onRestore }) {
  if (!versions.length) return null;

  return (
    <details className="rounded-2xl border border-black/10 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#111827] marker:hidden">
        Histórico do rascunho ({versions.length} versões)
      </summary>
      <div className="border-t border-black/10">
        {versions.map((version, index) => (
          <div
            key={`${version.updatedAt ?? "draft-version"}-${index}`}
            className="flex flex-col gap-3 border-b border-black/5 px-4 py-3 last:border-b-0 md:flex-row md:items-start md:justify-between"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#111827]">
                {formatDraftTimestamp(version.updatedAt)}
              </div>
              <div className="text-xs text-muted">{fmt(version.wordCount)} palavras</div>
              {version.previewText ? (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {version.previewText}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="button shrink-0"
              onClick={() => onRestore(version)}
            >
              Restaurar versão
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-black/10 px-4 py-3 text-xs text-muted">
        Retenção: últimas {MAX_DRAFT_HISTORY_ENTRIES} versões salvas automaticamente.
      </div>
    </details>
  );
}

export default function FocusEditor() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cueIntervalMinutes, setCueIntervalMinutes] = useState(10);
  const [exportFormat, setExportFormat] = useState("txt");
  const [lastSavedWords, setLastSavedWords] = useState(0);
  const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toolbarState, setToolbarState] = useState(DEFAULT_TOOLBAR_STATE);
  const [lastAutosavedAt, setLastAutosavedAt] = useState(null);
  const [draftPrompt, setDraftPrompt] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  const audioContextRef = useRef(null);
  const editorRef = useRef(null);
  const textColorInputRef = useRef(null);
  const highlightColorInputRef = useRef(null);
  const lastCueSecondRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const autosaveSuspendedRef = useRef(true);
  const currentScopeRef = useRef(null);

  const plainText = useMemo(() => htmlToPlainText(contentHtml), [contentHtml]);
  const wordCount = useMemo(() => countWords(plainText), [plainText]);
  const unsavedWords = Math.max(0, wordCount - lastSavedWords);
  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) => String(project.id ?? project.projectId) === String(selectedProjectId)
      ) ?? null,
    [projects, selectedProjectId]
  );
  const selectedProjectLabel =
    selectedProject?.title ?? selectedProject?.name ?? "este projeto";
  const currentDraftScope = getDraftScopeKey(selectedProjectId);
  const selectedProjectName =
    selectedProject?.title ?? selectedProject?.name ?? "Sem projeto";

  const cueEverySeconds = cueIntervalMinutes > 0 ? cueIntervalMinutes * 60 : null;
  const nextCueInSeconds = cueEverySeconds
    ? (() => {
        if (elapsedSeconds === 0) return cueEverySeconds;
        const remainder = elapsedSeconds % cueEverySeconds;
        return remainder === 0 ? cueEverySeconds : cueEverySeconds - remainder;
      })()
    : null;

  const openFeedback = (type, title, message, primaryLabel = "OK") => {
    setFeedback({
      open: true,
      type,
      title,
      message,
      primaryLabel,
    });
  };

  const persistDraft = useCallback(
    (projectId, html) => {
      if (typeof window === "undefined") return;

      const normalizedHtml = normalizeEditorHtml(html);
      const scopeKey = getDraftScopeKey(projectId);
      const currentStoredDraft = readStoredDraft(projectId);

      if (!normalizedHtml) {
        if (currentScopeRef.current === scopeKey && currentStoredDraft?.updatedAt) {
          setLastAutosavedAt(currentStoredDraft.updatedAt);
          setDraftHistory(readStoredDraftVersions(projectId));
        }
        return;
      }

      const projectLabel =
        projects.find(
          (project) => String(project.id ?? project.projectId) === String(projectId)
        )?.title ??
        projects.find(
          (project) => String(project.id ?? project.projectId) === String(projectId)
        )?.name ??
        "Sem projeto";

      const payload = createDraftPayload(projectId, projectLabel, normalizedHtml);
      let nextHistory = readStoredDraftVersions(projectId);

      if (
        currentStoredDraft?.contentHtml &&
        currentStoredDraft.contentHtml !== payload.contentHtml
      ) {
        nextHistory = appendStoredDraftVersion(projectId, currentStoredDraft);
      }

      setStoredDraft(projectId, payload);

      if (currentScopeRef.current === scopeKey) {
        setLastAutosavedAt(payload.updatedAt);
        setDraftHistory(nextHistory);
      }
    },
    [projects]
  );

  const initializeDraftForProject = useCallback(
    (projectId) => {
      const scopeKey = getDraftScopeKey(projectId);
      currentScopeRef.current = scopeKey;
      autosaveSuspendedRef.current = true;
      window.clearTimeout(autosaveTimeoutRef.current);

      const storedDraft = readStoredDraft(projectId);
      const storedHistory = readStoredDraftVersions(projectId);

      setContentHtml("");
      setDraftHistory(storedHistory);
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }

      if (storedDraft?.contentHtml) {
        setDraftPrompt(storedDraft);
        setLastAutosavedAt(storedDraft.updatedAt ?? null);
        return;
      }

      setDraftPrompt(null);
      setLastAutosavedAt(null);
      autosaveSuspendedRef.current = false;
    },
    []
  );

  const refreshToolbarState = useCallback(() => {
    if (typeof document === "undefined") return;

    const editor = editorRef.current;
    const selection = window.getSelection?.();

    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) {
      setToolbarState(DEFAULT_TOOLBAR_STATE);
      return;
    }

    setToolbarState({
      bold: document.queryCommandState?.("bold") ?? false,
      italic: document.queryCommandState?.("italic") ?? false,
      underline: document.queryCommandState?.("underline") ?? false,
      strikeThrough: document.queryCommandState?.("strikeThrough") ?? false,
      subscript: document.queryCommandState?.("subscript") ?? false,
      superscript: document.queryCommandState?.("superscript") ?? false,
      unorderedList: document.queryCommandState?.("insertUnorderedList") ?? false,
      orderedList: document.queryCommandState?.("insertOrderedList") ?? false,
      justifyLeft: document.queryCommandState?.("justifyLeft") ?? true,
      justifyCenter: document.queryCommandState?.("justifyCenter") ?? false,
      justifyRight: document.queryCommandState?.("justifyRight") ?? false,
      justifyFull: document.queryCommandState?.("justifyFull") ?? false,
      block: getCurrentBlock(editor),
      fontSize: normalizeFontSize(document.queryCommandValue?.("fontSize") ?? "3"),
    });
  }, []);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        const allProjects = Array.isArray(data) ? data : [];
        const activeProjects = allProjects.filter(isOngoing);
        setProjects(activeProjects);
        setSelectedProjectId((current) => {
          const exists = activeProjects.some(
            (project) => String(project.id ?? project.projectId) === String(current)
          );
          return exists
            ? current
            : String(activeProjects[0]?.id ?? activeProjects[0]?.projectId ?? "");
        });
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      }
    }

    loadProjects();
  }, []);

  useEffect(() => {
    if (!running) return undefined;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [running]);

  useEffect(() => {
    if (!running || !cueEverySeconds || elapsedSeconds === 0) return;
    if (elapsedSeconds % cueEverySeconds !== 0) return;
    if (lastCueSecondRef.current === elapsedSeconds) return;

    lastCueSecondRef.current = elapsedSeconds;
    void playCue(audioContextRef);
  }, [cueEverySeconds, elapsedSeconds, running]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const domHtml = normalizeEditorHtml(editor.innerHTML);
    if (domHtml !== contentHtml) {
      editor.innerHTML = contentHtml;
    }
  }, [contentHtml]);

  useEffect(() => {
    const handleSelectionChange = () => refreshToolbarState();
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [refreshToolbarState]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeUnload = () => {
      if (autosaveSuspendedRef.current) return;
      persistDraft(selectedProjectId, contentHtml);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [contentHtml, persistDraft, selectedProjectId]);

  useEffect(() => {
    return () => {
      window.clearTimeout(autosaveTimeoutRef.current);
      if (audioContextRef.current && typeof audioContextRef.current.close === "function") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    initializeDraftForProject(selectedProjectId);
  }, [initializeDraftForProject, selectedProjectId]);

  useEffect(() => {
    if (autosaveSuspendedRef.current) return undefined;

    window.clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = window.setTimeout(() => {
      persistDraft(selectedProjectId, contentHtml);
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(autosaveTimeoutRef.current);
  }, [contentHtml, persistDraft, selectedProjectId]);

  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setContentHtml(normalizeEditorHtml(editor.innerHTML));
    refreshToolbarState();
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const applyCommand = (command, value = undefined) => {
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus();

    if (!normalizeEditorHtml(editor.innerHTML) && command !== "undo" && command !== "redo") {
      editor.innerHTML = "<p><br></p>";
    }

    document.execCommand(command, false, value);
    setContentHtml(normalizeEditorHtml(editor.innerHTML));
    refreshToolbarState();
  };

  const handleBlockChange = (event) => {
    applyCommand("formatBlock", event.target.value);
  };

  const handleFontSizeChange = (event) => {
    applyCommand("fontSize", event.target.value);
  };

  const handleCreateLink = () => {
    const rawUrl = window.prompt("Cole a URL do link:");
    if (!rawUrl) return;

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    applyCommand("createLink", url);
  };

  const handleInsertImage = () => {
    const rawUrl = window.prompt("Cole a URL da imagem:");
    if (!rawUrl) return;

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    applyCommand("insertImage", url);
  };

  const handleColorChange = (command, value) => {
    if (!value) return;
    focusEditor();
    applyCommand(command, value);
  };

  const handleStart = async () => {
    setRunning(true);
    try {
      await ensureAudioContext(audioContextRef);
    } catch (error) {
      console.error("Nao foi possivel preparar o audio do editor:", error);
    }
  };

  const handlePause = () => {
    setRunning(false);
  };

  const handleResetTimer = () => {
    setRunning(false);
    setElapsedSeconds(0);
    setLastSavedElapsedSeconds(0);
    lastCueSecondRef.current = null;
  };

  const handleProjectChange = (event) => {
    const nextProjectId = event.target.value;
    if (nextProjectId === selectedProjectId) return;

    if (!autosaveSuspendedRef.current) {
      persistDraft(selectedProjectId, contentHtml);
    }

    setSelectedProjectId(nextProjectId);
  };

  const handleNewDraft = () => {
    const currentStoredDraft = readStoredDraft(selectedProjectId);
    if (currentStoredDraft?.contentHtml) {
      setDraftHistory(
        appendStoredDraftVersion(selectedProjectId, currentStoredDraft, { force: true })
      );
    }
    removeStoredDraft(selectedProjectId);
    setContentHtml("");
    setLastAutosavedAt(null);
    setDraftPrompt(null);
    autosaveSuspendedRef.current = false;
    setLastSavedWords(0);
    setLastSavedElapsedSeconds(0);
    setElapsedSeconds(0);
    setRunning(false);
    lastCueSecondRef.current = null;
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.focus();
    }
  };

  const handleRestoreDraft = () => {
    if (!draftPrompt?.contentHtml) {
      setDraftPrompt(null);
      autosaveSuspendedRef.current = false;
      return;
    }

    setContentHtml(normalizeEditorHtml(draftPrompt.contentHtml));
    setLastAutosavedAt(draftPrompt.updatedAt ?? null);
    setDraftPrompt(null);
    autosaveSuspendedRef.current = false;
  };

  const handleDiscardDraft = () => {
    removeStoredDraft(selectedProjectId);
    setContentHtml("");
    setLastAutosavedAt(null);
    setDraftPrompt(null);
    setDraftHistory(readStoredDraftVersions(selectedProjectId));
    autosaveSuspendedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.focus();
    }
  };

  const handleRestoreVersion = (version) => {
    const currentStoredDraft = readStoredDraft(selectedProjectId);
    if (
      currentStoredDraft?.contentHtml &&
      currentStoredDraft.contentHtml !== version.contentHtml
    ) {
      appendStoredDraftVersion(selectedProjectId, currentStoredDraft, { force: true });
    }

    const restoredPayload = createDraftPayload(
      selectedProjectId,
      selectedProjectName,
      version.contentHtml
    );

    setStoredDraft(selectedProjectId, restoredPayload);
    setDraftHistory(readStoredDraftVersions(selectedProjectId));
    setContentHtml(normalizeEditorHtml(version.contentHtml));
    setLastAutosavedAt(restoredPayload.updatedAt);
    setDraftPrompt(null);
    autosaveSuspendedRef.current = false;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    openFeedback(
      "success",
      "Versão restaurada",
      "Uma versão anterior do rascunho foi restaurada no editor."
    );
  };

  const handleExport = async (format) => {
    if (!plainText.trim()) {
      openFeedback(
        "warning",
        "Nada para exportar",
        "Escreva algum conteúdo antes de exportar o texto."
      );
      return;
    }

    const title = selectedProject?.title ?? selectedProject?.name ?? "Editor de texto";

    if (format === "txt") {
      await exportTextAsTxt(plainText);
      return;
    }

    if (format === "doc") {
      await exportHtmlAsDoc(contentHtml, undefined, title);
      return;
    }

    await exportHtmlAsPdf(contentHtml, undefined, title);
  };

  const handleCopyText = async () => {
    if (!plainText.trim()) return;

    try {
      await navigator.clipboard?.writeText(plainText);
      openFeedback(
        "success",
        "Texto copiado",
        "O conteúdo do editor foi copiado para a área de transferência."
      );
    } catch (error) {
      console.error(error);
      openFeedback("error", "Nao foi possivel copiar", "Falha ao copiar o conteúdo do editor.");
    }
  };

  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
      openFeedback(
        "warning",
        "Projeto obrigatório",
        "Selecione um projeto antes de salvar o progresso do editor."
      );
      return;
    }

    if (unsavedWords <= 0) {
      openFeedback(
        "warning",
        "Nada para salvar",
        "Ainda não há novas palavras para registrar no projeto."
      );
      return;
    }

    setSaving(true);

    try {
      const deltaSeconds = Math.max(0, elapsedSeconds - lastSavedElapsedSeconds);
      const deltaMinutes = Math.floor(deltaSeconds / 60);

      await addProgress(selectedProjectId, {
        wordsWritten: unsavedWords,
        minutes: deltaMinutes > 0 ? deltaMinutes : undefined,
        date: new Date().toISOString(),
        notes: "Registrado pelo editor de texto com temporizador.",
      });

      setLastSavedWords(wordCount);
      setLastSavedElapsedSeconds(elapsedSeconds);
      openFeedback(
        "success",
        "Progresso salvo no projeto",
        `${fmt(unsavedWords)} palavras foram registradas em ${selectedProject?.title ?? selectedProject?.name ?? "seu projeto"}.`
      );
    } catch (error) {
      console.error(error);
      openFeedback(
        "error",
        "Erro ao salvar progresso",
        "Nao foi possivel salvar o progresso no projeto selecionado."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <section className="panel space-y-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Editor de texto</h1>
          <p className="text-muted mt-2">
            Escreva com um cronômetro contínuo, receba sinais sonoros periódicos e registre o progresso no projeto.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>Rascunho local separado por projeto.</span>
            <span>
              {lastAutosavedAt
                ? `Último autosave: ${formatDraftTimestamp(lastAutosavedAt)}`
                : "Nenhum rascunho salvo localmente neste projeto."}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_220px_auto]">
          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select
              className="input h-12"
              value={selectedProjectId}
              onChange={handleProjectChange}
            >
              <option value="">Selecione um projeto</option>
              {projects.map((project) => {
                const projectId = String(project.id ?? project.projectId);
                return (
                  <option key={projectId} value={projectId}>
                    {project.title ?? project.name ?? "Projeto sem titulo"}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Sinal sonoro (minutos)</span>
            <input
              type="number"
              min={0}
              className="input h-12"
              value={cueIntervalMinutes}
              onChange={(event) =>
                setCueIntervalMinutes(Math.max(0, Number(event.target.value) || 0))
              }
            />
            <span className="pl-1 text-xs text-muted">Use 0 para desativar o som.</span>
          </label>

          <div className="flex flex-col gap-1">
            <span className="label invisible">Ações</span>
            <div className="flex flex-wrap gap-2">
              {!running ? (
                <button
                  type="button"
                  className="btn-primary h-12 min-w-[132px] justify-center px-5"
                  onClick={() => void handleStart()}
                >
                  Iniciar
                </button>
              ) : (
                <button
                  type="button"
                  className="button h-12 min-w-[132px] justify-center px-5"
                  onClick={handlePause}
                >
                  Pausar
                </button>
              )}
              <button
                type="button"
                className="button h-12 min-w-[132px] justify-center px-5"
                onClick={handleResetTimer}
              >
                Zerar tempo
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="kpi">
            <div className="label">Tempo decorrido</div>
            <div className="value">{formatDuration(elapsedSeconds)}</div>
            <div className="hint">Cronômetro contínuo</div>
          </div>
          <div className="kpi">
            <div className="label">Palavras no texto</div>
            <div className="value">{fmt(wordCount)}</div>
            <div className="hint">Contagem atual</div>
          </div>
          <div className="kpi">
            <div className="label">Pronto para salvar</div>
            <div className="value">{fmt(unsavedWords)}</div>
            <div className="hint">Delta ainda não registrado</div>
          </div>
          <div className="kpi">
            <div className="label">Próximo sinal</div>
            <div className="value">
              {nextCueInSeconds === null ? "Desativado" : formatDuration(nextCueInSeconds)}
            </div>
            <div className="hint">
              {cueIntervalMinutes > 0
                ? `A cada ${cueIntervalMinutes} min`
                : "Sem alerta sonoro"}
            </div>
          </div>
        </div>

        <DraftHistoryPanel versions={draftHistory} onRestore={handleRestoreVersion} />
      </section>

      <section className="panel space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 bg-[#f2f2f2] px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarSelect
                value={toolbarState.block}
                onChange={handleBlockChange}
                options={BLOCK_OPTIONS}
              />
              <ToolbarSelect
                value={toolbarState.fontSize}
                onChange={handleFontSizeChange}
                options={FONT_SIZE_OPTIONS}
                width="132px"
              />
              <ToolbarSeparator />
              <ToolbarButton icon={Heading1} label="Heading 1" onClick={() => applyCommand("formatBlock", "h1")} active={toolbarState.block === "h1"} />
              <ToolbarButton icon={Heading2} label="Heading 2" onClick={() => applyCommand("formatBlock", "h2")} active={toolbarState.block === "h2"} />
              <ToolbarButton icon={Pilcrow} label="Parágrafo" onClick={() => applyCommand("formatBlock", "p")} active={toolbarState.block === "p"} />
              <ToolbarButton icon={Code2} label="Code block" onClick={() => applyCommand("formatBlock", "pre")} active={toolbarState.block === "pre"} />
              <ToolbarButton icon={Quote} label="Citação" onClick={() => applyCommand("formatBlock", "blockquote")} active={toolbarState.block === "blockquote"} />
              <ToolbarSeparator />
              <ToolbarButton icon={Link2} label="Inserir link" onClick={handleCreateLink} />
              <ToolbarButton icon={Unlink2} label="Remover link" onClick={() => applyCommand("unlink")} />
              <ToolbarButton icon={ImagePlus} label="Inserir imagem" onClick={handleInsertImage} />
              <ToolbarButton icon={Minus} label="Linha horizontal" onClick={() => applyCommand("insertHorizontalRule")} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ToolbarButton icon={Bold} label="Negrito" onClick={() => applyCommand("bold")} active={toolbarState.bold} />
              <ToolbarButton icon={Italic} label="Itálico" onClick={() => applyCommand("italic")} active={toolbarState.italic} />
              <ToolbarButton icon={Underline} label="Sublinhado" onClick={() => applyCommand("underline")} active={toolbarState.underline} />
              <ToolbarButton icon={Strikethrough} label="Riscado" onClick={() => applyCommand("strikeThrough")} active={toolbarState.strikeThrough} />
              <ToolbarButton icon={Superscript} label="Sobrescrito" onClick={() => applyCommand("superscript")} active={toolbarState.superscript} />
              <ToolbarButton icon={Subscript} label="Subscrito" onClick={() => applyCommand("subscript")} active={toolbarState.subscript} />
              <ToolbarSeparator />
              <ToolbarButton icon={Palette} label="Cor do texto" onClick={() => textColorInputRef.current?.click()} />
              <ToolbarButton icon={Highlighter} label="Destaque" onClick={() => highlightColorInputRef.current?.click()} />
              <ToolbarSeparator />
              <ToolbarButton icon={AlignLeft} label="Alinhar à esquerda" onClick={() => applyCommand("justifyLeft")} active={toolbarState.justifyLeft} />
              <ToolbarButton icon={AlignCenter} label="Centralizar" onClick={() => applyCommand("justifyCenter")} active={toolbarState.justifyCenter} />
              <ToolbarButton icon={AlignRight} label="Alinhar à direita" onClick={() => applyCommand("justifyRight")} active={toolbarState.justifyRight} />
              <ToolbarButton icon={AlignJustify} label="Justificar" onClick={() => applyCommand("justifyFull")} active={toolbarState.justifyFull} />
              <ToolbarSeparator />
              <ToolbarButton icon={List} label="Lista com marcadores" onClick={() => applyCommand("insertUnorderedList")} active={toolbarState.unorderedList} />
              <ToolbarButton icon={ListOrdered} label="Lista numerada" onClick={() => applyCommand("insertOrderedList")} active={toolbarState.orderedList} />
              <ToolbarButton icon={IndentDecrease} label="Diminuir recuo" onClick={() => applyCommand("outdent")} />
              <ToolbarButton icon={IndentIncrease} label="Aumentar recuo" onClick={() => applyCommand("indent")} />
              <ToolbarSeparator />
              <ToolbarButton icon={Undo2} label="Desfazer" onClick={() => applyCommand("undo")} />
              <ToolbarButton icon={Redo2} label="Refazer" onClick={() => applyCommand("redo")} />
              <ToolbarButton icon={Eraser} label="Limpar formatação" onClick={() => { applyCommand("removeFormat"); applyCommand("unlink"); }} />
            </div>
            <input
              ref={textColorInputRef}
              type="color"
              className="hidden"
              onChange={(event) => handleColorChange("foreColor", event.target.value)}
            />
            <input
              ref={highlightColorInputRef}
              type="color"
              className="hidden"
              onChange={(event) => handleColorChange("hiliteColor", event.target.value)}
            />
          </div>

          <div className="relative min-h-[500px] bg-white">
            {!plainText.trim() && (
              <div className="pointer-events-none absolute left-4 top-4 text-2xl text-black/45">
                Type or paste your content here!
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[500px] px-4 py-4 text-[1.02rem] leading-8 outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-[#caa46b] [&_blockquote]:pl-4 [&_blockquote]:italic [&_font[size='2']]:text-sm [&_font[size='4']]:text-xl [&_font[size='5']]:text-2xl [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#f7f3ec] [&_pre]:px-4 [&_pre]:py-3 [&_pre]:font-mono [&_ul]:list-disc [&_ul]:pl-6"
              onFocus={refreshToolbarState}
              onInput={handleEditorInput}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="button" onClick={handleNewDraft}>
            Novo texto
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void handleCopyText()}
            disabled={!plainText.trim()}
          >
            Copiar texto
          </button>
          <select
            className="input h-11 w-[150px]"
            aria-label="Formato de exportação"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
            disabled={!plainText.trim()}
          >
            <option value="txt">TXT</option>
            <option value="doc">DOCX</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            className="button"
            onClick={() => handleExport(exportFormat)}
            disabled={!plainText.trim()}
          >
            Exportar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSaveToProject()}
            disabled={saving || unsavedWords <= 0 || !selectedProjectId}
          >
            {saving ? "Salvando..." : "Salvar no projeto"}
          </button>
        </div>
      </section>

      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
      <DraftRecoveryModal
        draft={draftPrompt}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
        onClose={handleDiscardDraft}
      />
    </main>
  );
}
