import api from "./http";

export async function previewValidation(eventId, projectId) {
  const { data } = await api.get(`/events/${eventId}/validate/preview`, {
    params: { projectId }
  });
  return data; // { target, total }
}

export async function submitValidation(eventId, projectId, words, source = "manual") {
  await api.post(`/events/${eventId}/validate`, { projectId, words, source });
}

export async function getValidationStatus(eventId, projectId) {
  const { data } = await api.get(`/events/${eventId}/validate/status`, {
    params: { projectId },
  });
  return data;
}
