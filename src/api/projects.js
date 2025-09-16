// src/api/projects.js
import api from "./http";

// ===== Projetos =====
export const getProjects = async () => {
  const { data } = await api.get("/projects");
  return Array.isArray(data) ? data : [];
};

export const getProject = async (id) => {
  const { data } = await api.get(`/projects/${id}`);
  return data;
};

// Histórico (progresso) do projeto
export const getProjectHistory = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/progress`);
  return Array.isArray(data) ? data : [];
};

// Estatísticas do projeto
export const getProjectStats = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/stats`);
  return data;
};

// Cria um projeto (JSON)
export const createProject = async ({ title, description, wordCountGoal, deadline, genre }) => {
  const body = {
    title,
    description: description || "",
    wordCountGoal:
      wordCountGoal !== "" && wordCountGoal !== null && wordCountGoal !== undefined
        ? Number(wordCountGoal)
        : null,
    deadline: deadline || null,  // pode ser "YYYY-MM-DD" ou null
    genre: genre || null,
  };
  const { data } = await api.post("/projects", body);
  // normaliza o id (Id/projectId/etc)
  const id = data?.id ?? data?.Id ?? data?.projectId ?? data?.projectID;
  return { ...data, id };
};

// ===== Progresso =====
export const addProgress = async (projectId, { wordsWritten, date, notes }) => {
  const body = {
    projectId,
    wordsWritten: Number(wordsWritten),
    date,
    notes: notes ?? null,
  };
  const { data } = await api.post(`/projects/${projectId}/progress`, body);
  return data;
};

export const deleteProgress = async (projectId, progressId) => {
  await api.delete(`/projects/${projectId}/progress/${progressId}`);
};

// ===== Badges =====
export const getProjectBadges = async (projectId) => {
  const { data } = await api.get(`/badges/projectid/${projectId}`);
  return data;
};

// (alias usado em alguns lugares)
export const getProjectProgress = getProjectHistory;
