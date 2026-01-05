// src/pages/admin/AdminEvents.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminEvents, deleteAdminEvent } from "../../api/events";
import ConfirmModal from "../../components/ConfirmModal";


export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await getAdminEvents();
      setEvents(data);
    } catch (err) {
      setError("Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDelete() {
  try {
    setDeleting(true);
    await deleteAdminEvent(deleteTarget.id);
    setDeleteTarget(null);
    await loadEvents();
  } catch {
    setError("Erro ao excluir evento.");
  } finally {
    setDeleting(false);
  }
}


  return (
    <>
    <div className="max-w-7xl mx-auto px-6 py-8">
  {/* CARD EXTERNO (igual "Seus projetos") */}
  <div className="bg-[#fbf7f1] rounded-2xl shadow-sm border border-[#e7dccd] p-8">

    {/* Header dentro do card */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-gray-900">
          Administração de Eventos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Aqui o admin pode cadastrar e gerenciar eventos.
        </p>
      </div>

      <button
        onClick={() => navigate("/admin/events/new")}
        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
      >
        + Criar evento
      </button>
    </div>

    {/* Card interno da tabela */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <div className="p-6 text-gray-500">Carregando eventos...</div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : events.length === 0 ? (
        <div className="p-6 text-gray-500">
          Nenhum evento cadastrado.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-600">
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Slug</th>
              <th className="px-6 py-3">Início</th>
              <th className="px-6 py-3">Fim</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">
                  {event.name}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {event.slug}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(event.startsAtUtc).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(event.endsAtUtc).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      event.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {event.isActive ? "Ativo" : "Encerrado"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                    className="px-3 py-1 rounded-md border hover:bg-gray-100"
                  >
                    Editar
                  </button>
                 <button
                    onClick={() => setDeleteTarget(event)}
                    className="px-3 py-1 rounded-md border text-rose-600 hover:bg-rose-50"
                  >
                    Excluir
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
</div>


  <ConfirmModal
  open={!!deleteTarget}
  title="Excluir evento"
  message={`Tem certeza que deseja excluir o evento "${deleteTarget?.name}"? Essa ação não pode ser desfeita.`}
  confirmText="Excluir"
  loading={deleting}
  onCancel={() => setDeleteTarget(null)}
  onConfirm={handleConfirmDelete}
/>
    </>
  );

  
}