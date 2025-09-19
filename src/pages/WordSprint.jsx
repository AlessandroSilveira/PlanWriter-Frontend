// src/pages/WordSprint.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import ProgressModal from "../components/ProgressModal.jsx";

const PRESETS = [5, 10, 15, 25];

export default function WordSprint() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [remaining, setRemaining] = useState(0); // em segundos
  const [running, setRunning] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const tickRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getProjects();
        if (!alive) return;
        setProjects(list || []);
        if (list?.length) setProjectId(list[0].id ?? list[0].projectId);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Falha ao carregar projetos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          tickRef.current = null;
          setRunning(false);
          setOpenModal(true); // abre registro ao terminar
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  const mmss = useMemo(() => {
    const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
    const ss = Math.floor(remaining % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remaining]);

  const start = () => {
    if (!projectId) return;
    setRemaining(minutes * 60);
    setRunning(true);
  };

  const stop = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRunning(false);
  };

  const onSaved = () => {
    setOpenModal(false);
    // volta para a página anterior ou detalhes do projeto
    navigate(-1, { replace: true });
  };

  const onCloseModal = () => setOpenModal(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hero">
        <div className="container hero-inner">
          <h1 className="text-xl font-semibold">Word Sprint</h1>
          <p className="text-sm text-muted mt-1">
            Escolha um projeto, selecione a duração e comece o sprint. Ao terminar, registre as palavras no projeto.
          </p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="label">Projeto</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loading || !projects.length || running}
            >
              {!projects.length && <option>Sem projetos</option>}
              {projects.map(p => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>

            <label className="label">Duração</label>
            <div className="flex items-center gap-2">
              <select
                className="input w-28"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                disabled={running}
              >
                {PRESETS.map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
              <div className="flex gap-1">
                {PRESETS.map(m => (
                  <button
                    key={`p-${m}`}
                    className={`button ${minutes===m ? 'ghost' : ''}`}
                    onClick={() => !running && setMinutes(m)}
                    disabled={running}
                    type="button"
                  >
                    {m}'
                  </button>
                ))}
              </div>
            </div>

            {!running ? (
              <button className="btn-primary" onClick={start} disabled={!projectId}>
                Iniciar
              </button>
            ) : (
              <button className="button" onClick={stop}>
                Parar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="container">
          <section className="panel flex flex-col items-center justify-center py-12">
            <div className="text-6xl font-semibold tabular-nums tracking-wider">
              {mmss}
            </div>
            <div className="mt-2 text-sm text-muted">
              {running ? "Sprint em andamento…" : "Pronto para começar."}
            </div>
            <div className="mt-6">
              {!running ? (
                <button className="btn-primary" onClick={start} disabled={!projectId}>
                  Iniciar sprint
                </button>
              ) : (
                <button className="button" onClick={stop}>
                  Parar sprint
                </button>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Registro de progresso ao final do sprint */}
      <ProgressModal
        open={openModal}
        onClose={onCloseModal}
        projectId={projectId || undefined}
        onSaved={onSaved}
        // Dica: se quiser, no backend aceite uma "nota" e aqui podemos
        // passar essa anotação via props do modal (ex.: "Sprint de X min")
      />
    </div>
  );
}
