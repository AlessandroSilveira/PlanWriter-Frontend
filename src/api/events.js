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
export async function joinEvent(eventId, payload = {}) {
  const { data } = await api.post(`/events/${eventId}/join`, payload);
  return data;
}

/**
 * Sair de um evento (opcional)
 */
export async function leaveEvent(eventId) {
  const { data } = await api.post(`/events/${eventId}/leave`);
  return data;
}

/**
 * 🔥 Atualizar a meta/target de um evento
 * Muitos backends fazem PATCH /events/{id}/target ou POST /events/{id}/target
 * Aqui vamos de POST por ser mais comum em APIs .NET não-restful.
 *
 * payload esperado: { targetWords: number } ou { goal: number }
 */
export async function updateEventTarget(eventId, payload) {
  const { data } = await api.post(`/events/${eventId}/target`, payload);
  return data;
}
