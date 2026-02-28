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
  const textColorInputRef = useRef(null);
  const highlightColorInputRef = useRef(null);
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
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)_minmax(320px,auto)]">
          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select
              className="input h-[60px]"
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
              className="input h-[60px]"
              value={cueIntervalMinutes}
              onChange={(event) =>
                setCueIntervalMinutes(Math.max(0, Number(event.target.value) || 0))
              }
            />
            <span className="pl-1 text-xs text-muted">Use 0 para desativar o som.</span>
          </label>

          <div className="flex flex-col gap-1">
            <span className="label invisible">Ações</span>
            <div className="grid grid-cols-2 gap-2">
              {!running ? (
                <button
                  type="button"
                  className="btn-primary h-[60px] w-full justify-center"
                  onClick={() => void handleStart()}
                >
                  Iniciar
                </button>
              ) : (
                <button
                  type="button"
                  className="button h-[60px] w-full justify-center"
                  onClick={handlePause}
                >
                  Pausar
                </button>
              )}
              <button
                type="button"
                className="button h-[60px] w-full justify-center"
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
            Exportar DOCX
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
