import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SprintTimer from "../components/SprintTimer.jsx";
import { saveSprintProgress } from "../api/progress";
import { getProjects } from "../api/projects";

/* util simples de contagem de palavras */
function countWords(text) {
  return (text.trim().match(/\b\w+\b/gu) || []).length;
}
const fmt = (n) => (Number(n) || 0).toLocaleString("pt-BR");

const HISTORY_KEY = "sprint_history";
const HISTORY_LIMIT = 50;

function loadHistorySafe() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function WordSprint() {
  /* =========================
     STATES
     ========================= */
  const [minutes, setMinutes] = useState(15);
  const [goal, setGoal] = useState(500);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [baseline, setBaseline] = useState(0);
  const [finished, setFinished] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [timerKey, setTimerKey] = useState(0);
  const [history, setHistory] = useState(() => loadHistorySafe());
  const [flash, setFlash] = useState("");
  const [savedToProject, setSavedToProject] = useState(false);

  const startedByTyping = useRef(false);

  /* =========================
     DERIVED VALUES
     ========================= */
  const words = useMemo(() => countWords(text), [text]);
  const written = Math.max(0, words - baseline);
  const pct = Math.min(100, Math.round((written / Math.max(1, goal)) * 100));

  /* =========================
     TIMER FINISH (VISUAL ONLY)
     ========================= */
  const handleFinish = useCallback(() => {
    setRunning(false);
    setFinished(true);
    setFlash("Sprint finalizado!");
  }, []);

  /* =========================
     SAVE TO PROJECT (MANUAL)
     ========================= */
  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
      setFlash("Selecione um projeto para salvar o progresso");
      return;
    }

    if (written <= 0) {
      setFlash("Nenhuma palavra escrita para salvar");
      return;
    }

    if (savedToProject) return;

    setSavedToProject(true);
    setFlash("Salvando progresso no projeto...");

    try {
      await saveSprintProgress({
        projectId: selectedProjectId,
        words: written,
        minutes,
        date: new Date().toISOString(),
      });

      setFlash("Progresso salvo no projeto ✅");
    } catch (err) {
      console.error(err);
      setSavedToProject(false);
      setFlash("Erro ao salvar progresso 😕");
    }
  };

  /* =========================
     CONTROLS
     ========================= */
  const startSprint = () => {
    setBaseline(countWords(text));
    setFinished(false);
    setRunning(true);
    startedByTyping.current = true;
    setSavedToProject(false);
  };

  const pauseSprint = () => setRunning(false);

  const resetSprint = () => {
    setRunning(false);
    setFinished(false);
    setBaseline(0);
    setText("");
    startedByTyping.current = false;
    setTimerKey((k) => k + 1);
    setSavedToProject(false);
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setText(value);

    if (!running && !finished && !startedByTyping.current) {
      setBaseline(countWords(value));
      startedByTyping.current = true;
      setRunning(true);
    }
  };

  /* =========================
     LOCAL HISTORY
     ========================= */
  const saveLocalHistory = () => {
    const entry = {
      at: new Date().toISOString(),
      minutes,
      goal,
      written,
    };

    const updated = [entry, ...history].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
    setFlash("Sprint salvo localmente ✅");
  };

  /* =========================
     LOAD PROJECTS
     ========================= */
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      }
    }
    loadProjects();
  }, []);

  /* =========================
     RENDER
     ========================= */
  return (
    <header className="hero">
    <div className="container hero-inner">
      <h1 className="text-xl font-semibold">Word Sprint</h1>

      {/* Projeto */}
      <label className="flex flex-col gap-1">
        <span className="label">Projeto</span>
        <select
          className="input"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={running}
        >
          <option value="">Selecione um projeto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      {/* Configurações */}
      <section className="panel">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Duração (minutos)</span>
            <input
              className="input"
              type="number"
              min={1}
              value={minutes}
              disabled={running}
              onChange={(e) =>
                setMinutes(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Meta de palavras</span>
            <input
              className="input"
              type="number"
              min={50}
              step={50}
              value={goal}
              disabled={running}
              onChange={(e) => setGoal(Number(e.target.value) || 0)}
            />
          </label>

          <div className="flex items-end gap-2">
            {!running ? (
              <button
                className="btn-primary"
                onClick={startSprint}
                disabled={!selectedProjectId}
              >
                Iniciar
              </button>
            ) : (
              <button className="button" onClick={pauseSprint}>
                Pausar
              </button>
            )}
            <button className="button" onClick={resetSprint} disabled={running}>
              Resetar
            </button>
          </div>
        </div>

        {!selectedProjectId && (
          <p className="text-sm text-muted mt-1">
            Selecione um projeto para iniciar o sprint
          </p>
        )}

        <div className="mt-4 flex justify-center">
          <SprintTimer
            key={timerKey}
            minutes={minutes}
            running={running}
            onZero={handleFinish}
          />
        </div>
      </section>

      {/* Editor */}
      <section className="panel">
        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-3 mb-3">
          <div className="kpi">
            <div className="label">Palavras nessa sessão</div>
            <div className="value">{fmt(written)}</div>
            <div className="hint">baseline: {fmt(baseline)}</div>
          </div>

          <div className="kpi">
            <div className="label">Meta</div>
            <div className="value">{fmt(goal)}</div>
            <div className="hint">{pct}% atingido</div>
          </div>
        </div>

        <textarea
          className="input min-h-[240px]"
          placeholder="Escreva aqui durante o sprint…"
          value={text}
          onChange={handleTyping}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="button" onClick={() => setText(text.trim())}>
            Limpar espaços
          </button>
          <button
            className="button"
            onClick={() => navigator.clipboard?.writeText(text)}
          >
            Copiar texto
          </button>

          {finished && (
            <>
              <button
                className="btn-primary"
                onClick={handleSaveToProject}
                disabled={savedToProject}
              >
                Salvar no projeto
              </button>

              <button className="button" onClick={saveLocalHistory}>
                Salvar apenas local
              </button>
            </>
          )}
        </div>

        {flash && <p className="mt-2 text-sm text-green-600">{flash}</p>}
      </section>

      {/* Histórico */}
      <section className="panel">
        <h2 className="section-title">Histórico local</h2>
        <HistoryList items={history} setItems={setHistory} />
      </section>
    </div>
    </header>
  );
}

/* =========================
   HISTÓRICO
   ========================= */
function HistoryList({ items, setItems }) {
  const clear = () => {
    localStorage.removeItem(HISTORY_KEY);
    setItems([]);
  };

  if (!items.length)
    return <p className="text-sm text-muted">Sem sprints salvos localmente.</p>;

  return (
    <>
      <table className="w-full text-sm mt-2">
        <thead>
          <tr className="border-b">
            <th>Quando</th>
            <th>Duração</th>
            <th>Meta</th>
            <th>Produção</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b">
              <td>{new Date(it.at).toLocaleString("pt-BR")}</td>
              <td>{it.minutes} min</td>
              <td>{fmt(it.goal)}</td>
              <td>{fmt(it.written)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="button mt-3" onClick={clear}>
        Limpar histórico
      </button>
    </>
  );
}
