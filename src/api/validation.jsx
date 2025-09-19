import axios from "axios";

export async function previewValidation(eventId, projectId) {
  const { data } = await axios.get(`/api/events/${eventId}/validate/preview`, {
    params: { projectId }
  });
  return data; // { target, total }
}

export async function submitValidation(eventId, projectId, words, source = "manual") {
  await axios.post(`/api/events/${eventId}/validate`, { projectId, words, source });
}
