import api from "./http";

// use SEMPRE `api` (não axios)
export const getProjects = async () => {
  const { data } = await api.get("/projects");
  return Array.isArray(data) ? data : [];
};

export const getProject = async (id) => {
  const { data } = await api.get(`/projects/${id}`);
  return data;
};

export const getProjectHistory = async (id) => {
  const { data } = await api.get(`/projects/${id}/progress`);
  return Array.isArray(data) ? data : [];
};

export const addProgress = async (projectId, { wordsWritten, date, note }) => {
  const body = {
    projectId,                                 // ok enviar mesmo vindo na rota
    wordsWritten: Number(wordsWritten),   // NOME que o back espera    
    date,                                      // ISO string
    notes: note ?? null,                       // se seu DTO usa Notes/Note, ajuste
  };
  const { data } = await api.post(`/projects/${projectId}/progress`, body);
  return data;
};

export const deleteProgress = async (projectId, progressId) => {
  await api.delete(`/projects/${projectId}/progress/${progressId}`);
};
