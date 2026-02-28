import { useEffect, useMemo, useRef, useState } from "react";
import { addProgress, getProjects } from "../api/projects";
import FeedbackModal from "../components/FeedbackModal.jsx";
import {
  exportTextAsDoc,
  exportTextAsPdf,
  exportTextAsTxt,
} from "../utils/exportText.js";
import { isOngoing } from "../utils/overviewAggregation";

function countWords(text) {
  return (text.trim().match(/\b\w+\b/gu) || []).length;
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

export default function FocusEditor() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cueIntervalMinutes, setCueIntervalMinutes] = useState(10);
  const [lastSavedWords, setLastSavedWords] = useState(0);
  const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  const audioContextRef = useRef(null);
  const lastCueSecondRef = useRef(null);

  const wordCount = useMemo(() => countWords(text), [text]);
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
          return exists ? current : String(activeProjects[0]?.id ?? activeProjects[0]?.projectId ?? "");
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
    return () => {
      if (audioContextRef.current && typeof audioContextRef.current.close === "function") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

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
    setText("");
    setLastSavedWords(0);
    setLastSavedElapsedSeconds(0);
    setElapsedSeconds(0);
    setRunning(false);
    lastCueSecondRef.current = null;
  };

  const handleExport = (format) => {
    if (!text.trim()) {
      openFeedback(
        "warning",
        "Nada para exportar",
        "Digite ou cole um texto antes de exportar o conteúdo."
      );
      return;
    }

    const title = selectedProject?.title ?? selectedProject?.name ?? "Editor de texto";

    if (format === "txt") {
      exportTextAsTxt(text);
      return;
    }

    if (format === "doc") {
      exportTextAsDoc(text, undefined, title);
      return;
    }

    exportTextAsPdf(text, undefined, title);
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
        <textarea
          className="input min-h-[420px]"
          placeholder="Escreva ou cole seu texto aqui..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className="button" onClick={handleNewDraft}>
            Novo texto
          </button>
          <button
            type="button"
            className="button"
            onClick={() => navigator.clipboard?.writeText(text)}
            disabled={!text.trim()}
          >
            Copiar texto
          </button>
          <button
            type="button"
            className="button"
            onClick={() => handleExport("txt")}
            disabled={!text.trim()}
          >
            Exportar TXT
          </button>
          <button
            type="button"
            className="button"
            onClick={() => handleExport("doc")}
            disabled={!text.trim()}
          >
            Exportar DOC
          </button>
          <button
            type="button"
            className="button"
            onClick={() => handleExport("pdf")}
            disabled={!text.trim()}
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
