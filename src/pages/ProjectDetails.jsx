// src/pages/ProjectDetails.jsx
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
        else {
          setError("Falha ao carregar o projeto.");
          console.error(err);
        }
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
        date: new Date(date).toISOString(), // ISO
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

      if (pRes.status === "rejected" || hRes.status === "rejected") {
        console.warn("Reload parcial após salvar progresso:", {
          projectError: pRes.status === "rejected" ? pRes.reason : null,
          historyError: hRes.status === "rejected" ? hRes.reason : null,
        });
      }
    } catch (err) {
      console.error(
        "ADD PROGRESS ERROR:",
        err?.response?.status,
        err?.response?.data,
        err?.message
      );
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(
        apiMsg ||
          "Falha ao adicionar progresso. Verifique autenticação e tente novamente."
      );
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
      console.error(err?.response || err);
      setError("Falha ao excluir progresso.");
    }
  };

  if (loading) return <p>Carregando...</p>;

  if (notFound)
    return (
      <div className="container">
        <div className="card">
          <button onClick={() => navigate(-1)} className="button secondary mb-3">
            ← Voltar
          </button>
          <h1>Projeto não encontrado</h1>
          <p className="text-gray-600">
            Verifique se a URL está correta e se você está autenticado.
          </p>
        </div>
      </div>
    );

  const pct = Math.min(
    100,
    Math.round(project?.progressPercent ?? 0)
  );

  return (
    <div className="container space-y-6">
      {/* Cabeçalho do projeto */}
      <div className="card">
        <button onClick={() => navigate(-1)} className="button secondary mb-3">
          ← Voltar
        </button>

        <h1>Projeto: {project?.title}</h1>
        {project?.description && (
          <p className="text-gray-600">Descrição: {project.description}</p>
        )}

        <div className="mt-2">
          <div className="badge" title="Progresso do projeto">Progresso: 
            {(project?.currentWordCount ?? 0).toLocaleString("pt-BR")} /{" "}
            {(project?.wordCountGoal ?? 0).toLocaleString("pt-BR") || "—"} palavras
          </div>
        </div>

        {project?.wordCountGoal ? (
          <div className="progress mt-2" aria-label="Barra de progresso">
            <div
              className="fill"
              style={{ width: `${pct}%` }}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
        ) : null}
      </div>

{/* Formulário para adicionar progresso */}
      <div className="card">
        <h2 className="mb-2">Adicionar progresso</h2>
        <form className="grid md:grid-cols-4 gap-3 items-end" onSubmit={submitProgress}>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Palavras escritas</label>
            <input
              type="number"
              min="1"
              value={wordsWritten}
              onChange={(e) => setWordsWritten(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Data/Hora</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm mb-1">Nota (opcional)</label>
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
      </div>
      {/* Evolução (gráfico) */}
      <div className="card">
        <h2 className="mb-2">Evolução</h2>
        <ProgressChart
          history={history}
          currentWordCount={project?.currentWordCount ?? 0}
          wordCountGoal={project?.wordCountGoal ?? null}
        />
        {project?.wordCountGoal ? (
          <p className="text-gray-600" style={{ marginTop: 8 }}>
            Meta: {project.wordCountGoal.toLocaleString("pt-BR")} palavras
          </p>
        ) : null}
      </div>

      

      {/* Histórico */}
      <div className="card">
        <h2 className="mb-3">Histórico</h2>
        {!history?.length ? (
          <p className="text-gray-600">Sem entradas ainda.</p>
        ) : (
          <ul className="history">
            {history.map((h, idx) => (
              <li key={h.id ?? idx}>
                <span>
                  {new Date(h.date).toLocaleString("pt-BR")} —{" "}
                  <b>{(h.wordsWritten ?? 0).toLocaleString("pt-BR")}</b> palavras
                  {h.note || h.notes ? (
                    <span className="text-gray-600"> — {h.note ?? h.notes}</span>
                  ) : null}
                </span>
                {h.id ? (
                  <button className="button secondary" onClick={() => removeProgress(h.id)}>
                    Excluir
                  </button>
                ) : (
                  <span className="text-xs text-gray-500"></span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
