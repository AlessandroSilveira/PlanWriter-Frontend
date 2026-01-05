// src/api/events.js
import api from "./http";

/**
 * Eventos ativos (NaNo-like)
 */
export async function getActiveEvents() {
  const { data } = await api.get("/events/active");
  return data;
}

/**
 * Detalhe de um evento
 */
export async function getEventById(id) {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

/**
 * Preview de validação
 */
export async function getValidatePreview(eventId, projectId) {
  const { data } = await api.get(`/events/${eventId}/validate/preview`, {
    params: { projectId },
  });
  return data;
}

/**
 * Validação efetiva
 */
export async function postValidate(eventId, payload) {
  const { data } = await api.post(`/events/${eventId}/validate`, payload);
  return data;
}

/**
 * Goodies / perks do evento
 */
export async function getWinnerGoodies(eventId) {
  const { data } = await api.get(`/events/${eventId}/goodies`);
  return data;
}

/**
 * Progresso do evento (para cards de progresso)
 */
export async function getEventProgress(eventId) {
  const { data } = await api.get(`/events/${eventId}/progress`);
  return data;
}

/**
 * Leaderboard do evento
 */
export async function getEventLeaderboard(eventId) {
  const { data } = await api.get(`/events/${eventId}/leaderboard`);
  return data;
}

/**
 * Entrar/participar de um evento
 * POST /events/{id}/join
 */
export async function joinEvent({ eventId, projectId, targetWords }) {
  const body = {
    eventId,
    projectId: projectId || null,
    targetWords: targetWords ?? null,
  };

  const { data } = await api.post("/events/join", body);
  return data;
}

/**
 * Sair de um evento (opcional)
 */
export async function leaveEvent(eventId) {
  const { data } = await api.post(`/events/${eventId}/leave`);
  return data;
}


export async function updateEventTarget(eventId, payload) {
  const { data } = await api.post(`/events/${eventId}/target`, payload);
  return data;
}

export const getEventProjectProgress = async (eventId, projectId) => {
  const { data } = await api.get(
    `/events/${eventId}/projects/${projectId}/progress`
  );
  return data;
};

export const getMyEvents = async () => {
  const { data } = await api.get("/events/my");
  return Array.isArray(data) ? data : [];
};






/**
 * ADMIN FUNCTIONS
 */
export async function createEvent(eventData) {
  const { data } = await api.post("/admin/events", eventData);
  return data;
}

export async function getAdminEvents(){
  const response = await api.get("/admin/events");
  return response.data;
}

export async function getAdminEventById(id){
  const response = await api.get(`/admin/events/${id}`);
  return response.data;
}

export async function updateAdminEvent(id, payload) {
  const { data } = await api.put(`/admin/events/${id}`, payload);
  return data;
}

export async function deleteAdminEvent(id) {
  const { data } = await api.delete(`/admin/events/${id}`);
  return data;
}