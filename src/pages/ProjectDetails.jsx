// src/pages/ProjectDetails.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  // carrega projeto e, se ok, depois o histórico (evita "corrida" e 2x chamadas)
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
      // 1) Faz o POST. Se falhar aqui, mostramos erro e saímos
      await addProgress(id, {
        wordsWritten: n,
        date: new Date(date).toISOString(), // ISO
        note: note || undefined,
      });

      // 2) Limpa o formulário
      setWordsWritten("");
      setNote("");

      // 3) Recarrega (se alguma das leituras falhar, não derruba a UI)
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
        // não mostramos "Falha ao adicionar..." porque o POST foi OK
      }
    } catch (err) {
      // Aqui só cai se o POST falhar
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
        apiMsg || "Falha ao adicionar progresso. Verifique autenticação e tente novamente."
      );
    }
  };

  const removeProgress = async (progressId) => {
    setError("");
    try {
      await deleteProgress(id, progressId);
      // recarrega após excluir
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
      <div className="card">
        <button onClick={() => navigate(-1)} className="mb-3">
          ← Voltar
        </button>
        <h1 className="text-xl font-semibold">Projeto não encontrado</h1>
        <p className="text-sm text-gray-600">
          Verifique se a URL está correta e se você está autenticado.
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Cabeçalho do projeto */}
      <div className="card">
        <button onClick={() => navigate(-1)} className="mb-3">
          ← Voltar
        </button>
        <h1 className="text-xl font-semibold">{project?.title}</h1>
        {project?.description && (
          <p className="text-gray-600">{project.description}</p>
        )}
        <p className="mt-2">
          <b>{project?.currentWordCount ?? 0}</b> /{" "}
          {project?.wordCountGoal ?? "—"} palavras
        </p>
        {project?.wordCountGoal ? (
          <div className="w-full bg-gray-200 rounded h-2 mt-2">
            <div
              className="bg-gray-800 h-2 rounded"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(project?.progressPercent ?? 0)
                )}%`,
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Formulário para adicionar progresso */}
      <div className="card">
        <h2 className="font-semibold mb-2">Adicionar progresso</h2>
        <form
          className="grid md:grid-cols-4 gap-3 items-end"
          onSubmit={submitProgress}
        >
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
            <button type="submit">Adicionar</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Histórico */}
      <div className="card">
        <h2 className="font-semibold mb-3">Histórico</h2>
        {!history?.length ? (
          <p className="text-sm text-gray-600">Sem entradas ainda.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h, idx) => (
              <li key={h.id ?? idx} className="flex items-center justify-between">
                <span>
                  {new Date(h.date).toLocaleString()} —{" "}
                  <b>{h.wordsWritten}</b> palavras
                  {h.note || h.notes ? (
                    <span className="text-gray-600 text-sm">
                      {" "}
                      — {h.note ?? h.notes}
                    </span>
                  ) : null}
                </span>
                {h.id ? (
                  <button onClick={() => removeProgress(h.id)}>Excluir</button>
                ) : (
                  <span className="text-xs text-gray-500">sem id</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
