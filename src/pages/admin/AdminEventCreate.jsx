// src/pages/admin/AdminEventCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../../api/events";

export default function AdminEventCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    type:"",
    description: "",
    startDate: "",
    endDate: "",
    active: true,
    targetWords: 0
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  if (!form.name || !form.startDate || !form.endDate) {
    setError("Preencha todos os campos obrigatórios.");
    return;
  }

  if (form.endDate < form.startDate) {
    setError("A data final não pode ser menor que a inicial.");
    return;
  }

  try {
    setLoading(true);

    await createEvent({
      name: form.name,
      type: form.type,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      active: form.active,
      targetWords: form.targetWords,
    });

    navigate("/admin/events", { replace: true });

  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      "Erro ao criar evento.";
    setError(msg);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-[#f8f3ec] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Criar novo evento</h1>
          <p className="text-sm text-gray-600 mt-1">
            Preencha os dados do evento.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome do evento *
              </label>
              <input
                type="text"
                name="name"
                className="w-full border rounded-lg p-2 text-sm"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full border rounded-lg p-2 text-sm"
                value={form.description}
                onChange={handleChange}
              />
            </div>
            {/* Meta de palavras */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Meta de palavras *
              </label>
              <input
                type="number"
                name="targetWords"
                className="w-full border rounded-lg p-2 text-sm"
                value={form.targetWords}
                onChange={handleChange}
                required
              />
            </div>
{/* Tipo do evento */}
            <div>
  <label className="block text-sm font-medium mb-1">
    Tipo do evento *
  </label>
  
  <select
    name="type"
    className="w-full border rounded-lg p-2 text-sm"
    value={form.type}
    onChange={handleChange}
    required
  >
    <option value="">Selecione</option>
    <option value="Nanowrimo">NaNoWriMo</option>
    <option value="Desafio">Desafio</option>
    <option value="Oficial">Oficial</option>
  </select>
</div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Data de início *
                </label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Data de fim *
                </label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
  <div>
    <label className="block text-sm font-medium text-gray-700">
      Evento ativo
    </label>
    <p className="text-xs text-gray-500">
      Define se o evento estará disponível para os usuários
    </p>
  </div>

  <input
    type="checkbox"
    checked={form.isActive}
    onChange={(e) =>
      setForm({ ...form, isActive: e.target.checked })
    }
    className="h-5 w-5 accent-indigo-600 cursor-pointer"
  />
</div>


            {/* Erro */}
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/admin/events")}
                className="px-5 py-2 rounded-lg border text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                {loading ? "Salvando..." : "Salvar evento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
