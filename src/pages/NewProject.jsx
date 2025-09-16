// src/pages/NewProject.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";

export default function NewProject() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [wordCountGoal, setWordCountGoal] = useState("");
  const [genre, setGenre] = useState("");
  const [deadline, setDeadline] = useState(""); // YYYY-MM-DD
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        wordCountGoal,
        deadline,
        genre,
      };
      const created = await createProject(payload);
      const pid = created?.id ?? created?.projectId;
      if (pid) navigate(`/projects/${pid}`);
      else navigate("/");
    } catch (ex) {
      const msg =
        ex?.response?.data?.message ||
        ex?.response?.data ||
        "Falha ao criar o projeto.";
      setErr(typeof msg === "string" ? msg : "Falha ao criar o projeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* BOX 1600px */}
      <div className="container container--wide">
        <section className="panel section-panel">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Novo projeto</h2>
            <Link to="/" className="btn-primary">Voltar</Link>
          </div>

          <form onSubmit={onSubmit} className="form-stack mt-4">
            {/* Linha 1: Título e Meta de palavras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Título</label>
                <input
                  type="text"
                  className="input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Meta de palavras</label>
                <input
                  type="number"
                  min={0}
                  className="input w-full"
                  value={wordCountGoal}
                  onChange={(e) => setWordCountGoal(e.target.value)}
                  placeholder="ex.: 50000"
                />
              </div>
            </div>

            {/* Linha 2: Gênero e Prazo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Gênero</label>
                <input
                  type="text"
                  className="input w-full"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="ex.: Romance"
                />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input
                  type="date"
                  className="input w-full"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            {/* Linha 3: Descrição */}
            <div>
              <label className="label">Descrição</label>
              <textarea
                rows={4}
                className="input w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fale um pouco sobre o projeto…"
              />
            </div>

            {/* Linha 4: Botões */}
            <div className="flex gap-3">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar projeto"}
              </button>
              <Link to="/" className="button">Cancelar</Link>
            </div>

            {err && <div className="text-red-600 mt-3">{err}</div>}
          </form>
        </section>
      </div>
    </div>
  );
}
