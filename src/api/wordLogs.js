// src/api/wordLogs.js
import api from "./http";

/**
 * Lista registros diários de palavras de um projeto
 * GET /api/word-logs/project/{projectId}
 */
export async function getProjectWordLogs(projectId) {
  if (!projectId) throw new Error("projectId é obrigatório");
  const { data } = await api.get(`/word-logs/project/${projectId}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Cria/atualiza (upsert) o registro diário de palavras
 * POST /api/word-logs
 *
 * payload esperado:
 * { projectId: guid, date: 'YYYY-MM-DD', wordsWritten: number }
 */
export async function upsertWordLog({ projectId, date, wordsWritten }) {
  if (!projectId) throw new Error("projectId é obrigatório");
  if (!date) throw new Error("date é obrigatório (YYYY-MM-DD)");

  const payload = {
    projectId,
    date, // "YYYY-MM-DD" -> o backend deve bindar para DateOnly
    wordsWritten: Number(wordsWritten ?? 0),
  };

  await api.post("/word-logs", payload);
}
