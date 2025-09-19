// src/api/events.js
import axios from "axios";

export async function getActiveEvents() {
  const { data } = await axios.get("/api/events/active");
  return data;
}

export async function getEventById(id) {
  const { data } = await axios.get(`/api/events/${id}`);
  return data;
}

/**
 * Retorna progresso do projeto no evento:
 * { percent, totalWritten, targetWords, dailyTarget, joined, won, ... }
 */
export async function getEventProgress({ projectId, eventId }) {
  const { data } = await axios.get(`/api/events/${eventId}/progress`, {
    params: { projectId },
  });
  return data;
}

/** Inscreve um projeto no evento com uma meta (se omitido, usa a default do evento) */
export async function joinEvent(eventId, { projectId, targetWords }) {
  const { data } = await axios.post(`/api/events/${eventId}/join`, {
    projectId,
    targetWords,
  });
  return data;
}

/** Atualiza a meta do projeto no evento */
export async function updateProjectEvent(eventId, projectId, payload) {
  const { data } = await axios.put(
    `/api/events/${eventId}/projects/${projectId}`,
    payload
  );
  return data;
}

/** Remove o projeto do evento */
export async function leaveEvent(eventId, projectId) {
  await axios.delete(`/api/events/${eventId}/projects/${projectId}`);
}
