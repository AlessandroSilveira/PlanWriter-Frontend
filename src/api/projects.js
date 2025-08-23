import api from "./http";
import axios from 'axios';

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

// cria um projeto
export const createProject = async ({ title, description, wordCountGoal, deadline }) => {
  // ajuste os nomes para seu DTO do back:
  const body = {
    title: title,                      // ou "title" se o back usar esse nome
    description: description || "",
    wordCountGoal: wordCountGoal ? Number(wordCountGoal) : null, // ou "wordCountGoal"
    deadline: deadline
  };
  const { data } = await api.post("/projects", body);
  return data; // deve retornar o projeto criado (com id)
};

export const getProjectStats = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/stats`);
  return data;
};

export const getProjectProgress = async (projectId) => {
  const { data } = await axios.get(`/projects/${projectId}/progress`)
  return data
}

export const getProjectBadges = async (projectId) => {
  const {data} = await api.get(`/projects/${projectId}/badges`)
  return data;
}
