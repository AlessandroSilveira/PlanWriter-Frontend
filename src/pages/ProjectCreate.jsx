import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";

export default function ProjectCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [wordCountGoal, setGoal] = useState("");
  const [deadline, setDeadLine] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const p = await createProject({ title, description, wordCountGoal, deadline });
      // navega direto para o detalhe se vier id
      if (p?.id) navigate(`/projects/${p.id}`);
      else navigate("/"); // fallback
    } catch (err) {
      console.error(err?.response || err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Falha ao criar projeto.";
      setError(msg);
    }
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-3">← Voltar</button>
      <h1 className="text-xl font-semibold mb-4">Novo projeto</h1>
      <form className="grid gap-3" onSubmit={submit}>
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Meta de palavras (opcional)</label>
          <input type="number" min="1" value={wordCountGoal} onChange={(e) => setGoal(e.target.value)} />
        </div>
         <div>
          <label className="block text-sm mb-1">Data de témino</label>
          <input type="date" min="1" value={deadline} onChange={(e) => setDeadLine(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Descrição (opcional)</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit">Criar</button>
          <button type="button" className="secondary" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
