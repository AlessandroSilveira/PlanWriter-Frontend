import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addProgress, getProjects } from "../api/projects";
import FeedbackModal from "../components/FeedbackModal.jsx";
import {
  exportHtmlAsDoc,
  exportTextAsPdf,
  exportTextAsTxt,
} from "../utils/exportText.js";
import { isOngoing } from "../utils/overviewAggregation";

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

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(remainingSeconds)}`;
}

const fmt = (value) => (Number(value) || 0).toLocaleString("pt-BR");

const DEFAULT_TOOLBAR_STATE = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  block: "p",
};

const TOOLBAR_ITEMS = [
  { key: "undo", label: "Desfazer", command: "undo" },
  { key: "redo", label: "Refazer", command: "redo" },
  { key: "bold", label: "B", command: "bold", activeKey: "bold" },
  { key: "italic", label: "I", command: "italic", activeKey: "italic" },
  { key: "underline", label: "U", command: "underline", activeKey: "underline" },
  {
    key: "paragraph",
    label: "P",
    command: "formatBlock",
    value: "p",
    activeBlock: "p",
  },
  {
    key: "heading1",
    label: "H1",
    command: "formatBlock",
    value: "h1",
    activeBlock: "h1",
  },
  {
    key: "heading2",
    label: "H2",
    command: "formatBlock",
    value: "h2",
    activeBlock: "h2",
  },
  {
    key: "quote",
    label: "Citação",
    command: "formatBlock",
    value: "blockquote",
    activeBlock: "blockquote",
  },
  {
    key: "unorderedList",
    label: "Lista",
    command: "insertUnorderedList",
    activeKey: "unorderedList",
  },
  {
    key: "orderedList",
    label: "1.",
    command: "insertOrderedList",
    activeKey: "orderedList",
  },
  { key: "clear", label: "Limpar estilo", command: "removeFormat" },
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

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
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

  const block = node.closest("h1, h2, blockquote, ul, ol, p, div");
  if (!block) return "p";
  if (block.tagName.toLowerCase() === "div") return "p";
  return block.tagName.toLowerCase();
}

export default function FocusEditor() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cueIntervalMinutes, setCueIntervalMinutes] = useState(10);
  const [lastSavedWords, setLastSavedWords] = useState(0);
  const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toolbarState, setToolbarState] = useState(DEFAULT_TOOLBAR_STATE);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  const audioContextRef = useRef(null);
  const editorRef = useRef(null);
  const lastCueSecondRef = useRef(null);

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
      unorderedList: document.queryCommandState?.("insertUnorderedList") ?? false,
      orderedList: document.queryCommandState?.("insertOrderedList") ?? false,
      block: getCurrentBlock(editor),
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
    return () => {
      if (audioContextRef.current && typeof audioContextRef.current.close === "function") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setContentHtml(normalizeEditorHtml(editor.innerHTML));
    refreshToolbarState();
  };

  const applyCommand = (command, value = undefined) => {
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus();

    if (!normalizeEditorHtml(editor.innerHTML) && command !== "undo" && command !== "redo") {
      editor.innerHTML = "<p><br></p>";
    }

    if (command === "formatBlock" && value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, value);
    }

    setContentHtml(normalizeEditorHtml(editor.innerHTML));
    refreshToolbarState();
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

  const handleNewDraft = () => {
    setContentHtml("");
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

  const handleExport = (format) => {
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
      exportTextAsTxt(plainText);
      return;
    }

    if (format === "doc") {
      exportHtmlAsDoc(contentHtml, undefined, title);
      return;
    }

    exportTextAsPdf(plainText, undefined, title);
  };

  const handleCopyText = async () => {
    if (!plainText.trim()) return;

    try {
      await navigator.clipboard?.writeText(plainText);
      openFeedback("success", "Texto copiado", "O conteúdo do editor foi copiado para a área de transferência.");
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
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="label">Projeto</span>
            <select
              className="input"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
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
              className="input"
              value={cueIntervalMinutes}
              onChange={(event) =>
                setCueIntervalMinutes(Math.max(0, Number(event.target.value) || 0))
              }
            />
            <span className="text-xs text-muted">Use 0 para desativar o som.</span>
          </label>

          <div className="flex flex-wrap items-end gap-2">
            {!running ? (
              <button type="button" className="btn-primary" onClick={() => void handleStart()}>
                Iniciar
              </button>
            ) : (
              <button type="button" className="button" onClick={handlePause}>
                Pausar
              </button>
            )}
            <button type="button" className="button" onClick={handleResetTimer}>
              Zerar tempo
            </button>
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
      </section>

      <section className="panel space-y-4">
        <div className="rounded-[28px] border border-black/10 bg-white/60 shadow-sm overflow-hidden">
          <div className="border-b border-black/10 bg-[#f6f2ea] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {TOOLBAR_ITEMS.map((item) => {
                const isActive =
                  (item.activeKey && toolbarState[item.activeKey]) ||
                  (item.activeBlock && toolbarState.block === item.activeBlock);

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#2f5d73] bg-[#2f5d73] text-white"
                        : "border-black/10 bg-white text-[#1f2937] hover:bg-black/5"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand(item.command, item.value)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[420px] bg-white">
            {!plainText.trim() && (
              <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted">
                Comece a escrever. Use a barra acima para aplicar estilos no texto.
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[420px] px-4 py-4 outline-none text-[1.02rem] leading-8 [&_blockquote]:border-l-4 [&_blockquote]:border-[#caa46b] [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
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
          <button
            type="button"
            className="button"
            onClick={() => handleExport("txt")}
            disabled={!plainText.trim()}
          >
            Exportar TXT
          </button>
          <button
            type="button"
            className="button"
            onClick={() => handleExport("doc")}
            disabled={!plainText.trim()}
          >
            Exportar DOC
          </button>
          <button
            type="button"
            className="button"
            onClick={() => handleExport("pdf")}
            disabled={!plainText.trim()}
          >
            Exportar PDF
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
    </main>
  );
}
