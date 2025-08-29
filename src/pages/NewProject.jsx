import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";

export default function NewProject() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wordCountGoal, setWordCountGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!title?.trim()) {
      setErr("Informe um título para o projeto.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description?.trim() || "",
        wordCountGoal: wordCountGoal ? Number(wordCountGoal) : null,
        deadline: deadline || null,
      };
      const created = await createProject(payload);
      const pid = created?.id ?? created?.projectId;
      if (pid) navigate(`/projects/${pid}`);
      else navigate("/");
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message ||
        e2?.response?.data?.error ||
        (typeof e2?.response?.data === "string" ? e2.response.data : null);
      setErr(apiMsg || "Falha ao criar projeto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel section-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="h1 m-0">Novo Projeto</h1>
          <p className="subhead">Defina um objetivo claro e uma data limite opcional.</p>
        </div>
      </div>

      <form className="grid md:grid-cols-2 gap-3 mt-4" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="kicker">Título</label>
          <input
            type="text"
            placeholder="Ex.: Romance: A Chuva e o Silêncio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="kicker">Descrição (opcional)</label>
          <textarea
            placeholder="Sobre o que é o projeto? Notas rápidas, contexto, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="kicker">Meta de palavras (opcional)</label>
          <input
            type="number"
            min="1"
            placeholder="Ex.: 50000"
            value={wordCountGoal}
            onChange={(e) => setWordCountGoal(e.target.value)}
          />
        </div>

        <div>
          <label className="kicker">Data limite (opcional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}

        <div className="md:col-span-2 flex items-center gap-2 pt-1">
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Criando..." : "Criar projeto"}
          </button>
          <button type="button" className="button secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
