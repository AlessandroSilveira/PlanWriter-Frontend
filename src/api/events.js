// src/api/events.js
import api from "./http";

const WORD_WAR_MISSING_ENDPOINT_STATUSES = new Set([404, 405]);

function shouldTryNextWordWarCandidate(error) {
  const status = Number(error?.response?.status ?? 0);
  return WORD_WAR_MISSING_ENDPOINT_STATUSES.has(status);
}

async function requestWordWarWithFallback(candidates) {
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await api.request(candidate);
    } catch (error) {
      lastError = error;
      if (!shouldTryNextWordWarCandidate(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Nenhum endpoint de Word War disponível.");
}

function normalizeWordWarStatus(value) {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number") {
    if (value === 0) return "waiting";
    if (value === 1) return "running";
    if (value === 2) return "finished";
  }
  return "unknown";
}

function parseServerNowUtc(headers) {
  const fromHeader = headers?.date ? new Date(headers.date) : null;
  if (fromHeader && Number.isFinite(fromHeader.getTime())) {
    return fromHeader.toISOString();
  }
  return new Date().toISOString();
}

function normalizeParticipant(participant, index) {
  const rankRaw = Number(participant?.rank ?? participant?.finalRank ?? index + 1);
  return {
    id: participant?.id ?? null,
    wordWarId: participant?.wordWarId ?? null,
    userId: participant?.userId ?? null,
    projectId: participant?.projectId ?? null,
    wordsInRound: Number(participant?.wordsInRound ?? 0),
    joinedAtUtc: participant?.joinedAtUtc ?? null,
    lastCheckpointAtUtc: participant?.lastCheckpointAtUtc ?? null,
    finalRank: Number.isFinite(rankRaw) ? rankRaw : index + 1,
  };
}

function normalizeWordWar(data, headers) {
  const participantsRaw = Array.isArray(data?.participants) ? data.participants : [];
  const remainingRaw = Number(data?.remainingSeconds ?? data?.remainingSecnds ?? 0);

  return {
    id: data?.id ?? null,
    eventId: data?.eventId ?? null,
    status: normalizeWordWarStatus(data?.status),
    durationMinutes: Number(data?.durationMinutes ?? 0),
    startsAtUtc: data?.startsAtUtc ?? null,
    endsAtUtc: data?.endsAtUtc ?? null,
    finishedAtUtc: data?.finishedAtUtc ?? null,
    remainingSeconds: Number.isFinite(remainingRaw) ? Math.max(0, remainingRaw) : 0,
    serverNowUtc: data?.serverNowUtc ?? parseServerNowUtc(headers),
    participants: participantsRaw.map(normalizeParticipant),
  };
}

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

export async function getEventGoodies(eventId, projectId) {
  if (!eventId || !projectId) {
    throw new Error("eventId e projectId são obrigatórios.");
  }

  const { data } = await api.get(`/events/${eventId}/projects/${projectId}/goodies`);
  return data;
}

export async function downloadEventCertificate(eventId, projectId) {
  if (!eventId || !projectId) {
    throw new Error("eventId e projectId são obrigatórios.");
  }

  const response = await api.get(`/events/${eventId}/projects/${projectId}/certificate`, {
    responseType: "blob",
  });
  return response?.data;
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
 * Progresso do evento (para cards de progresso)
 */
export async function getEventProgress(eventIdOrParams, projectId) {
  let eventId = eventIdOrParams;
  if (eventIdOrParams && typeof eventIdOrParams === "object") {
    eventId = eventIdOrParams.eventId ?? eventIdOrParams.id;
    projectId = eventIdOrParams.projectId;
  }

  if (!eventId || !projectId) {
    throw new Error("eventId e projectId são obrigatórios.");
  }

  return getEventProjectProgress(eventId, projectId);
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

export const getEventProjectProgress = async (eventId, projectId) => {
  const { data } = await api.get(
    `/events/${eventId}/projects/${projectId}/progress`
  );
  return data;
};

/**
 * Sair de um evento
 */
export async function leaveEvent(eventId, projectId) {
  if (!eventId || !projectId) {
    throw new Error("eventId e projectId são obrigatórios.");
  }
  await api.delete(`/events/${eventId}/projects/${projectId}`);
}

export const getMyEvents = async () => {
  const { data } = await api.get("/events/my");
  return Array.isArray(data) ? data : [];
};

/**
 * WORD WAR
 */
export async function getActiveWordWar(eventId) {
  if (!eventId) {
    throw new Error("eventId é obrigatório.");
  }

  const response = await requestWordWarWithFallback([
    { method: "get", url: `/events/${eventId}/wordwars/active` },
    { method: "get", url: "/events/wordwars/active", params: { eventId } },
    { method: "get", url: "/Active", params: { eventId, warId: eventId }, data: eventId },
  ]);

  if (!response?.data) return null;
  return normalizeWordWar(response.data, response.headers);
}

export async function createWordWar({ eventId, durationMinutes }) {
  if (!eventId) throw new Error("eventId é obrigatório.");

  const response = await requestWordWarWithFallback([
    {
      method: "post",
      url: `/events/${eventId}/wordwars`,
      data: { durationMinutes },
    },
    {
      method: "post",
      url: "/events/wordwars/create",
      data: { eventId, durationMinutes },
    },
    {
      method: "post",
      url: "/Create",
      params: { durationsInMinutes: durationMinutes },
      data: eventId,
    },
  ]);

  const raw = response?.data;
  if (typeof raw === "string") return raw;
  if (raw?.warId) return raw.warId;
  if (raw?.id) return raw.id;
  return null;
}

export async function startWordWar(warId) {
  if (!warId) throw new Error("warId é obrigatório.");

  await requestWordWarWithFallback([
    { method: "post", url: `/events/wordwars/${warId}/start` },
    { method: "post", url: "/events/wordwars/start", data: { warId } },
    { method: "post", url: "/Start", data: warId },
  ]);
}

export async function joinWordWar({ warId, projectId }) {
  if (!warId || !projectId) {
    throw new Error("warId e projectId são obrigatórios.");
  }

  await requestWordWarWithFallback([
    { method: "post", url: `/events/wordwars/${warId}/join`, data: { projectId } },
    { method: "post", url: "/events/wordwars/join", data: { warId, projectId } },
    { method: "post", url: "/Join", params: { projectId }, data: warId },
  ]);
}

export async function leaveWordWar(warId) {
  if (!warId) throw new Error("warId é obrigatório.");

  await requestWordWarWithFallback([
    { method: "post", url: `/events/wordwars/${warId}/leave` },
    { method: "post", url: "/events/wordwars/leave", data: { warId } },
    { method: "post", url: "/Leave", data: warId },
  ]);
}

export async function finishWordWar(warId) {
  if (!warId) throw new Error("warId é obrigatório.");

  await requestWordWarWithFallback([
    { method: "post", url: `/events/wordwars/${warId}/finish` },
    { method: "post", url: "/events/wordwars/finish", data: { warId } },
    { method: "post", url: "/Finish", data: warId },
  ]);
}

export async function submitWordWarCheckpoint({ warId, wordsInRound }) {
  if (!warId) throw new Error("warId é obrigatório.");

  await requestWordWarWithFallback([
    {
      method: "post",
      url: `/events/wordwars/${warId}/checkpoint`,
      data: { wordsInRound },
    },
    {
      method: "post",
      url: "/events/wordwars/checkpoint",
      data: { warId, wordsInRound },
    },
    {
      method: "post",
      url: "/checkpoint",
      params: { wordsInRound },
      data: warId,
    },
  ]);
}

export async function getWordWarScoreboard(warId) {
  if (!warId) throw new Error("warId é obrigatório.");

  const response = await requestWordWarWithFallback([
    { method: "get", url: `/events/wordwars/${warId}/scoreboard` },
    { method: "get", url: "/events/wordwars/scoreboard", params: { warId } },
    { method: "get", url: "/scoreboard", params: { warId }, data: warId },
  ]);

  return normalizeWordWar(response?.data ?? {}, response?.headers);
}

/**
 * ADMIN FUNCTIONS
 */
export async function createEvent(eventData) {
  const { data } = await api.post("/admin/events", eventData);
  return data;
}

export async function getAdminEvents() {
  const response = await api.get("/admin/events");
  return response.data;
}

export async function getAdminEventById(id) {
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
