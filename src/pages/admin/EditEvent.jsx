import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminEventById, updateAdminEvent } from "../../api/events";

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEvent();
  }, []);

  async function loadEvent() {
    try {
      const data = await getAdminEventById(id);
      setForm(data);
    } catch {
      setError("Erro ao carregar evento.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "name") {
        updated.slug = generateSlug(value);
      }

      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await updateAdminEvent(id, form);
      navigate("/admin/events");
    } catch (err) {
      setError("Erro ao salvar evento.");
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="max-w-4xl mx-auto mt-8 bg-[#fdf8f1] rounded-2xl shadow p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Editar Evento
      </h1>

      {error && (
        <div className="mb-4 text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <label className="block text-sm mb-1">Nome</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            className="w-full border rounded-lg p-2 bg-gray-100"
            required
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
                value={form.defaultTargetWords}
                onChange={handleChange}
                required
              />
            </div>
        {console.log(form.type)}
        <div>
          <label className="block text-sm mb-1">Tipo</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            required
          >
            <option value="" >Selecione</option>
            <option value="Nanowrimo" >NaNoWriMo</option>
            <option value="Desafio" selected={form.type === "Desafio"}>Desafio</option>
            <option value="Oficial" selected={form.type === "Oficial"}>Oficial</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Início</label>
            <input
              type="date"
              name="startDate"
              value={form.startsAtUtc?.substring(0, 10)}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Fim</label>
            <input
              type="date"
              name="endDate"
              value={form.endsAtUtc?.substring(0, 10)}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
        </div>

        {/* <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.checked })
            }
          />
          <span>Evento ativo</span>
        </div> */}
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


        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/events")}
            className="px-4 py-2 border rounded-md"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  );
}
