// src/api/projects.js
import api from "./http";

// =====================
// Projetos
// =====================
export const getProjects = async () => {
  const { data } = await api.get("/projects");
  return Array.isArray(data) ? data : [];
};

export const getProject = async (id) => {
  const { data } = await api.get(`/projects/${id}`);
  return data;
};

// =====================
// Histórico (progresso)
// BACKEND: GET /projects/{id}/history
// =====================
export const getProjectHistory = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/history`);
  return Array.isArray(data) ? data : [];
};

// =====================
// Estatísticas
// BACKEND: GET /projects/{id}/stats
// =====================
export const getProjectStats = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/stats`);
  return data;
};

// =====================
// Criar projeto
// BACKEND: POST /projects
// =====================
export const createProject = async ({
  title,
  description,
  wordCountGoal,
  deadline,
  genre,
  startDate,
}) => {
  const body = {
    title,
    description: description || "",
    genre: genre || null,
    wordCountGoal:
      wordCountGoal !== "" && wordCountGoal !== null && wordCountGoal !== undefined
        ? Number(wordCountGoal)
        : null,
    startDate: startDate || null,   // yyyy-MM-dd
    deadline: deadline || null,     // yyyy-MM-dd
  };

  const { data } = await api.post("/projects", body);

  // normaliza id
  const id = data?.id ?? data?.Id ?? data?.projectId ?? data?.projectID;
  return { ...data, id };
};

// =====================
// Progresso
// BACKEND: POST /projects/{id}/progress
// =====================
export const addProgress = async (
  projectId,
  { wordsWritten, minutes, pages, date, notes }
) => {
  const body = {
    projectId,
    wordsWritten:
      wordsWritten !== undefined ? Number(wordsWritten) : undefined,
    minutes:
      minutes !== undefined ? Number(minutes) : undefined,
    pages:
      pages !== undefined ? Number(pages) : undefined,
    date,
    notes: notes ?? null,
  };

  const { data } = await api.post(
    `/projects/${projectId}/progress`,
    body
  );
  return data;
};

// =====================
// Badges
// BACKEND: GET /badges/projectid/{id}
// =====================
export const getProjectBadges = async (projectId) => {
  const { data } = await api.get(`/badges/projectid/${projectId}`);
  return Array.isArray(data) ? data : [];
};

// =====================
// Aliases (compatibilidade)
// =====================
export const getProjectProgress = getProjectHistory;
