// src/api/events.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Lista eventos ativos
export async function getActiveEvents() {
  const { data } = await api.get("/events/active");
  return data; // EventDto[]
}

// (novo) Detalhe por id
export async function getEventById(eventId) {
  const { data } = await api.get(`/events/${eventId}`);
  return data; // EventDto
}

// Progresso do projeto dentro do evento (rota com 2 path params)
export async function getEventProgress(eventId, projectId) {
  const { data } = await api.get(`/events/${eventId}/projects/${projectId}/progress`);
  return data; // EventProgressDto
}

// Inscrever ou atualizar meta (upsert no back)
export async function joinEvent({ eventId, projectId, targetWords }) {
  await api.post("/events/join", { eventId, projectId, targetWords });
}

// Atualizar meta (mesma rota de join — upsert)
export async function updateEventTarget({ eventId, projectId, targetWords }) {
  await api.post("/events/join", { eventId, projectId, targetWords });
}

// (novo) Sair do evento
export async function leaveEvent(eventId, projectId) {
  await api.delete(`/events/${eventId}/projects/${projectId}`);
}

// Leaderboard
export async function getEventLeaderboard(eventId, scope = "total", top = 50) {
  const { data } = await api.get(`/events/${eventId}/leaderboard`, {
    params: { scope, top },
  });
  return data; // EventLeaderboardRowDto[]
}

// Validação (preview + validate) — usa seu controlador de validação existente
export async function previewValidation(eventId, projectId) {
  const { data } = await api.get(`/events/${eventId}/validate/preview`, {
    params: { projectId },
  });
  return data; // { target, total }
}

export async function validateWinner(eventId, { projectId, words, source = "manual" }) {
  await api.post(`/events/${eventId}/validate`, { projectId, words, source });
}