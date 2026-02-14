import { useState } from "react";
import { createProject } from "../api/projects";

const INITIAL_FORM = {
  title: "",
  goal: 50000,
  genre: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function ProjectForm({
  onCreated,
  onCancel,
  submitLabel = "Criar projeto",
  showCancel = false,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

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
      if (!form.goal || form.goal <= 0) {
        throw new Error("A meta deve ser maior que zero.");
      }

      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        genre: form.genre,
        wordCountGoal: Number(form.goal) || null,
        startDate: form.startDate || null,
        deadline: form.endDate || null,
      };

      const created = await createProject(payload);
      setCreatedProject(created || {});
      setSuccessOpen(true);
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

  const handleSuccessConfirm = async () => {
    const created = createdProject;
    setSuccessOpen(false);
    setCreatedProject(null);

    if (typeof onCreated === "function") {
      await onCreated(created);
      return;
    }

    setForm(INITIAL_FORM);
  };

  const createdTitle =
    createdProject?.title ||
    createdProject?.data?.title ||
    form.title ||
    "Seu projeto";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
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
          <p className="text-xs text-gray-500 mt-1">Ex.: 50000 (padrão NaNoWriMo)</p>
        </div>

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

        {error && (
          <p className="text-sm text-red-600 border border-red-200 bg-red-50 p-3 rounded">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="button"
              disabled={saving}
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2"
          >
            {saving ? "Criando..." : submitLabel}
          </button>
        </div>
      </form>

      {successOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xl font-bold">
                ✓
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-2">Projeto criado com sucesso</h2>
            <p className="text-sm text-gray-600 mb-6">
              O projeto <strong>{createdTitle}</strong> já está disponível.
            </p>

            <button
              onClick={handleSuccessConfirm}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
