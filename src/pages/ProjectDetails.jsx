import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProgressChart from "../components/ProgressChart.jsx";
import {
  getProject,
  getProjectHistory,
  addProgress,
  deleteProgress,
} from "../api/projects.js";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [wordsWritten, setWordsWritten] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const p = await getProject(id);
        if (abort.signal.aborted) return;
        setProject(p);
        try {
          const h = await getProjectHistory(id);
          if (!abort.signal.aborted) setHistory(h);
        } catch (err) {
          console.warn("Falha ao carregar histórico:", err);
        }
      } catch (err) {
        if (err?.response?.status === 404) setNotFound(true);
        else setError("Falha ao carregar o projeto.");
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => abort.abort();
  }, [id]);

  const submitProgress = async (e) => {
    e.preventDefault();
    setError("");

    const n = Number(wordsWritten);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Informe um número de palavras válido.");
      return;
    }

    try {
      await addProgress(id, {
        wordsWritten: n,
        date: new Date(date).toISOString(),
        note: note || undefined,
      });

      setWordsWritten("");
      setNote("");

      const [pRes, hRes] = await Promise.allSettled([
        getProject(id),
        getProjectHistory(id),
      ]);
      if (pRes.status === "fulfilled") setProject(pRes.value);
      if (hRes.status === "fulfilled") setHistory(hRes.value);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(apiMsg || "Falha ao adicionar progresso. Verifique autenticação e tente novamente.");
    }
  };

  const removeProgress = async (progressId) => {
    setError("");
    try {
      await deleteProgress(id, progressId);
      const [p, h] = await Promise.all([getProject(id), getProjectHistory(id)]);
      setProject(p);
      setHistory(h);
    } catch (err) {
      setError("Falha ao excluir progresso.");
    }
  };

  if (loading) return <p>Carregando...</p>;

  if (notFound)
    return (
      <section className="panel section-panel">
        <button onClick={() => navigate(-1)} className="button secondary mb-3">← Voltar</button>
        <h1 className="h2">Projeto não encontrado</h1>
        <p className="text-muted">Verifique se a URL está correta e se você está autenticado.</p>
      </section>
    );

  const pct = Math.min(
    100,
    Math.round(project?.progressPercent ?? ((project?.currentWordCount ?? 0) / (project?.wordCountGoal || 1)) * 100)
  );

  return (
    
    <div className="dashboard-gap">
        <main className="flex-grow dashboard-gap">
      {/* HERO */}
      <header className="hero">
         <div className="container hero-inner">
          <div className="container grid">      
        
          <div className="min-w-0">
            <button onClick={() => navigate(-1)} className="button secondary mb-3">← Voltar</button>
            <h1 className="h1 m-0">{project?.title}</h1>
            {project?.description && (
              <p className="subhead">{project.description}</p>
            )}
          </div>
          {project?.wordCountGoal ? (
            <div className="min-w-[220px]">
              <div className="kpi kpi--lg">
                <div className="label">Progresso</div>
                <div className="value">{pct}%</div>
                <div className="progress mt-2">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="hint mt-1">
                  {(project?.currentWordCount ?? 0).toLocaleString("pt-BR")} /{" "}
                  {project?.wordCountGoal?.toLocaleString("pt-BR")} palavras
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </header>
      </main>

      {/* FORM + HISTÓRICO + GRÁFICO */}
      <div className="container grid">
        <section className="panel section-panel">
          <h2 className="section-title">Adicionar progresso</h2>
          <form className="grid md:grid-cols-4 gap-3 items-end mt-3" onSubmit={submitProgress}>
            <div className="md:col-span-2">
              <label className="kicker">Palavras escritas</label>
              <input
                type="number"
                min="1"
                value={wordsWritten}
                onChange={(e) => setWordsWritten(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="kicker">Data/Hora</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-4">
              <label className="kicker">Nota (opcional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Escrevi cena do capítulo 5"
              />
            </div>
            <div className="md:col-span-4">
              <button type="submit" className="button">Adicionar</button>
            </div>
          </form>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </section>
 <section className="panel section-panel">
        <h2 className="section-title">Histórico</h2>
        {!history?.length ? (
          <p className="text-muted mt-2">Sem entradas ainda.</p>
        ) : (
          <ul className="space-y-2 mt-3">
            {history.map((h, idx) => (
              <li key={h.id ?? idx} className="card card--lg flex items-center justify-between">
                <span>
                  {new Date(h.date).toLocaleString()} — <b>{h.wordsWritten}</b> palavras
                  {h.note || h.notes ? (
                    <span className="text-muted text-sm"> — {h.note ?? h.notes}</span>
                  ) : null}
                </span>
                {h.id ? (
                  <button className="button secondary" onClick={() => removeProgress(h.id)}>Excluir</button>
                ) : (
                  <span className="text-xs text-muted">sem id</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>


      </div>

      <main className="flex-grow dashboard-gap">
        {/* <div className="container">
           <section className="panel2">
          <h2 className="section-title">Evolução</h2>
          <div className="mt-3">
            <ProgressChart
              history={history}
              currentWordCount={project?.currentWordCount ?? 0}
              wordCountGoal={project?.wordCountGoal ?? null}
            />
            {project?.wordCountGoal ? (
              <p className="text-xs text-muted mt-2">
                Meta: {project.wordCountGoal.toLocaleString("pt-BR")} palavras
              </p>
            ) : null}
           
          </div>
           </section>
        </div> */}
 <div className="container">
            <section className="panel2">
              <h2 className="section-title">Comparativo entre Projetos</h2>
              <div className="mt-3">
                 <ProgressChart
              history={history}
              currentWordCount={project?.currentWordCount ?? 0}
              wordCountGoal={project?.wordCountGoal ?? null}
            />
             {project?.wordCountGoal ? (
              <p className="text-xs text-muted mt-2">
                Meta: {project.wordCountGoal.toLocaleString("pt-BR")} palavras
              </p>
            ) : null}
              </div>
            </section>
          </div>

</main>
     
    </div>
  );
}
