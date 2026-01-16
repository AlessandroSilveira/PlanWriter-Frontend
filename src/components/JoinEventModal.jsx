import { useEffect, useState } from "react";

export default function JoinEventModal({
  event,
  projects,
  onConfirm,
  onClose,
}) {
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (projects.length === 1) {
      setProjectId(projects[0].id);
    }
  }, [projects]);

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-5">

        <h2 className="text-xl font-semibold">
          Escolha o projeto
        </h2>

        <p className="text-sm text-gray-600">
          Evento: <b>{event.name}</b>
        </p>

        {/* COMBOBOX */}
        <div className="space-y-1">
          <label className="label">Projeto</label>
          <select
            className="input"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option value="">Selecione um projeto…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* INFO DO PROJETO */}
        {selectedProject && (
          <div className="bg-[#fffaf2] border border-[#eadfce] rounded-lg p-3 text-sm space-y-1">
            <div>
              <b>{selectedProject.title}</b>
            </div>
            <div className="text-gray-600">
              {Number(selectedProject.currentWordCount ?? 0).toLocaleString("pt-BR")}
              {" / "}
              {Number(selectedProject.wordCountGoal ?? 0).toLocaleString("pt-BR")} palavras
            </div>
          </div>
        )}

        {/* AÇÕES */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            className="px-4 py-2 border rounded-lg"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            onClick={() => onConfirm(projectId)}
            disabled={!projectId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60"
          >
            Confirmar participação
          </button>
        </div>
      </div>
    </div>
  );
}
