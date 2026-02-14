import { useEffect, useMemo, useState } from "react";

export default function JoinEventModal({
  event,
  projects,
  onConfirm,
  onClose,
  loading = false,
}) {
  const [projectId, setProjectId] = useState("");

  const normalizedProjects = useMemo(
    () =>
      (projects ?? [])
        .map((project) => ({
          ...project,
          resolvedId: project.id ?? project.projectId,
        }))
        .filter((project) => Boolean(project.resolvedId)),
    [projects]
  );

  useEffect(() => {
    if (normalizedProjects.length === 1) {
      setProjectId(String(normalizedProjects[0].resolvedId));
      return;
    }
    setProjectId("");
  }, [event?.id, normalizedProjects]);

  const selectedProject = normalizedProjects.find(
    (project) => String(project.resolvedId) === String(projectId)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(eventTarget) => {
        if (eventTarget.target === eventTarget.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-5" onClick={(eventTarget) => eventTarget.stopPropagation()}>
        <h2 className="text-xl font-semibold">Escolha o projeto</h2>

        <p className="text-sm text-gray-600">
          Evento: <b>{event?.name}</b>
        </p>

        <div className="space-y-1">
          <label className="label">Projeto</label>
          <select
            className="input"
            value={projectId}
            onChange={(changeEvent) => setProjectId(changeEvent.target.value)}
            disabled={loading}
          >
            <option value="">Selecione um projeto…</option>
            {normalizedProjects.map((project) => (
              <option key={project.resolvedId} value={project.resolvedId}>
                {project.title ?? project.name ?? "Projeto"}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="bg-[#fffaf2] border border-[#eadfce] rounded-lg p-3 text-sm space-y-1">
            <div>
              <b>{selectedProject.title ?? selectedProject.name}</b>
            </div>
            <div className="text-gray-600">
              {Number(selectedProject.currentWordCount ?? 0).toLocaleString("pt-BR")}
              {" / "}
              {Number(selectedProject.wordCountGoal ?? 0).toLocaleString("pt-BR")} palavras
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            className="px-4 py-2 border rounded-lg"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onConfirm(projectId)}
            disabled={!projectId || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60"
          >
            {loading ? "Confirmando..." : "Confirmar participação"}
          </button>
        </div>
      </div>
    </div>
  );
}
