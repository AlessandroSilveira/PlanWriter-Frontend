// src/pages/NewProject.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";

export default function NewProject() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    goal: 50000,
    genre: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "goal" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.title.trim()) throw new Error("Informe um título.");
      if (!form.genre.trim()) throw new Error("Informe um gênero.");
      if (!form.goal || form.goal <= 0)
        throw new Error("A meta deve ser maior que zero.");

      // Payload final enviado para API
   const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        genre: form.genre,
        wordCountGoal: Number(form.goal) || null, // 🔥 nome correto
        startDate: form.startDate || null,         // 🔥 enviado
        deadline: form.endDate || null              // 🔥 enviado
      };


      const created = await createProject(payload);
      const id =
        created?.id || created?.projectId || created?.data?.id || null;

      navigate(id ? `/projects/${id}` : "/projects");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível criar o projeto.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-6">
      <section className="panel max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Novo Projeto</h1>
          <Link to="/projects" className="text-sm text-indigo-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* TÍTULO */}
          <div>
            <label className="block text-sm mb-1">Título</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              className="input w-full"
              placeholder="Meu romance de novembro"
            />
          </div>

          {/* GÊNERO */}
          <div>
            <label className="block text-sm mb-1">Gênero</label>
            <select
              name="genre"
              value={form.genre}
              onChange={onChange}
              className="input w-full"
            >
              <option value="">Selecione um gênero…</option>
              <option value="Romance">Romance</option>
              <option value="Fantasia">Fantasia</option>
              <option value="Ficção Científica">Ficção Científica</option>
              <option value="Suspense">Suspense</option>
              <option value="Terror">Terror</option>
              <option value="Drama">Drama</option>
              <option value="Não Ficção">Não Ficção</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* META */}
          <div>
            <label className="block text-sm mb-1">Meta (palavras)</label>
            <input
              type="number"
              name="goal"
              value={form.goal}
              onChange={onChange}
              className="input w-full"
              min={1}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ex.: 50000 (padrão NaNoWriMo)
            </p>
          </div>

          {/* DATAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Início</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={onChange}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fim</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={onChange}
                className="input w-full"
              />
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div>
            <label className="block text-sm mb-1">Descrição</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="input w-full resize-none"
              placeholder="Resumo do projeto..."
            />
          </div>

          {/* ERRO */}
          {error && (
            <p className="text-sm text-red-600 border border-red-200 bg-red-50 p-3 rounded">
              {error}
            </p>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full md:w-auto px-6 py-2"
          >
            {saving ? "Criando…" : "Criar projeto"}
          </button>
        </form>
      </section>
    </div>
  );
}
