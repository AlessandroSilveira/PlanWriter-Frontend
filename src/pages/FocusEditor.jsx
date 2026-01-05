// src/pages/FocusEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import ProgressModal from "../components/ProgressModal.jsx";

function countWords(s) {
  if (!s) return 0;
  // conta tokens com letras/números; ignora múltiplos espaços
  const m = String(s).trim().match(/[^\s]+/g);
  return m ? m.length : 0;
}

export default function FocusEditor() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // editor
  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // segundos
  const [sessionTarget, setSessionTarget] = useState(500); // palavras
  const [openModal, setOpenModal] = useState(false);

  const taRef = useRef(null);
  const tickRef = useRef(null);

  // carregar projetos
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const list = await getProjects();
        if (!alive) return;
        const arr = Array.isArray(list) ? list : [];
        setProjects(arr);
        const first = arr[0];
        if (first) setProjectId(first.id ?? first.projectId);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar projetos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // autosave por projeto
  useEffect(() => {
    if (!projectId) return;
    const key = `pw_editor_${projectId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) setText(saved);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const key = `pw_editor_${projectId}`;
    try { localStorage.setItem(key, text); } catch {}
  }, [text, projectId]);

  // timer
  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  const words = useMemo(() => countWords(text), [text]);
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
  const remainingToTarget = Math.max(0, sessionTarget - words);

  const mmss = useMemo(() => {
    const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const ss = Math.floor(elapsed % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [elapsed]);

  const start = () => {
    if (!projectId) return;
    setStartedAt(new Date());
    setRunning(true);
    setElapsed(0);
    // foco no textarea
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const stop = () => {
    setRunning(false);
  };

  const resetSession = () => {
    setRunning(false);
    setElapsed(0);
    setText("");
    setStartedAt(null);
  };

  const openSave = () => {
    if (!projectId) return;
    setOpenModal(true);
  };

  const onSaved = () => {
    setOpenModal(false);
    // mantém o texto (você pode preferir limpar)
    navigate(-1);
  };
  const onClose = () => setOpenModal(false);

  const goBack = () => navigate(-1);

  const exportTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `PlanWriter-${stamp}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // atalhos: Ctrl/Cmd+S salva no projeto
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, words]);

  return (
    <>
      <header className="hero">
        <div className="container hero-inner">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Editor de Foco</h1>
            <div className="flex items-center gap-2">
              <button className="button" onClick={goBack}>Voltar</button>
              <button className="button" onClick={exportTxt}>Exportar .txt</button>
            </div>
          </div>

          {err && <p className="text-red-600 mt-2">{err}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="label">Projeto</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loading || !projects.length || running}
            >
              {!projects.length && <option>Sem projetos</option>}
              {projects.map((p) => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>

            <label className="label">Meta da sessão</label>
            <input
              type="number"
              className="input w-28"
              min={50}
              step={50}
              value={sessionTarget}
              onChange={(e) => setSessionTarget(Math.max(0, Number(e.target.value) || 0))}
              disabled={running}
            />

            {!running ? (
              <button className="btn-primary" onClick={start} disabled={!projectId}>Iniciar</button>
            ) : (
              <button className="button" onClick={stop}>Pausar</button>
            )}
            <button className="button" onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}>
              Tela cheia
            </button>
            <button className="button" onClick={resetSession}>Resetar sessão</button>
            <button className="btn" onClick={openSave} disabled={!projectId || words<=0}>
              Salvar no projeto (⌘/Ctrl+S)
            </button>
          </div>

          {/* KPIs */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="kpi">
              <div className="label">Tempo</div>
              <div className="value tabular-nums">{mmss}</div>
              <div className="hint">{startedAt ? "em sessão" : "parado"}</div>
            </div>
            <div className="kpi">
              <div className="label">Palavras</div>
              <div className="value">{words.toLocaleString("pt-BR")}</div>
              <div className="hint">na sessão</div>
            </div>
            <div className="kpi">
              <div className="label">WPM</div>
              <div className="value">{wpm}</div>
              <div className="hint">palavras/min</div>
            </div>
            <div className="kpi">
              <div className="label">Meta</div>
              <div className="value">{sessionTarget.toLocaleString("pt-BR")}</div>
              <div className="hint">palavras</div>
            </div>
            <div className="kpi">
              <div className="label">Faltam</div>
              <div className={`value ${remainingToTarget === 0 ? "text-green-700 dark:text-green-400" : ""}`}>
                {remainingToTarget.toLocaleString("pt-BR")}
              </div>
              <div className="hint">{remainingToTarget === 0 ? "meta batida 🎉" : "hoje"}</div>
            </div>
          </div>
           <main className="flex-grow">
        <div className="container">
          <section className="panel">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva aqui, sem distrações…"
              className="w-full min-h-[60vh] resize-y leading-7 text-lg md:text-xl font-serif bg-transparent outline-none"
              spellCheck={false}
            />
          </section>
        </div>
      </main>
        </div>
      </header>

     

      {/* Registro no projeto usando o ProgressModal existente */}
      <ProgressModal
        open={openModal}
        onClose={onClose}
        projectId={projectId || undefined}
        onSaved={onSaved}
        // Se você aplicar o patch abaixo no ProgressModal,
        // estes dois campos serão usados para pré-preencher o formulário:
        defaultWords={words}
        defaultNote={
          startedAt
            ? `Sessão no Editor de Foco — ${words} palavras em ${mmss}`
            : `Sessão no Editor de Foco — ${words} palavras`
        }
      />
    </>
  );
}
