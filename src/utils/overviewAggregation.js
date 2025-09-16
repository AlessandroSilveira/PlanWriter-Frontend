// src/utils/overviewAggregation.js

// Helper: date -> 'YYYY-MM-DD' local
function toYMDLocal(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Decide se um projeto está "em andamento"
export function isOngoing(project) {
  if (!project) return false;
  // Status explícito
  if (project.status) {
    const s = String(project.status).toUpperCase();
    if (s === 'ONGOING' || s === 'EM_ANDAMENTO' || s === 'IN_PROGRESS') return true;
    if (s === 'COMPLETED' || s === 'ARCHIVED' || s === 'ARQUIVADO') return false;
  }
  // Inferência por meta x atual
  const cur = Number(project.currentWordCount ?? 0);
  const goal = project.wordCountGoal != null ? Number(project.wordCountGoal) : null;
  if (goal != null) return cur < goal;
  return true; // sem meta -> assume em andamento
}

/**
 * Calcula overview agregado a partir de um mapa diário totalizado.
 * @param {Map<string, number>} perDay - chave 'YYYY-MM-DD' -> total de palavras do dia (todos os projetos)
 * @param {number} daysWindow - janela da média diária (padrão 7)
 */
export function computeOverviewFromPerDay(perDay, daysWindow = 7) {
  // ontem (no fuso do navegador)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const keyYesterday = toYMDLocal(yesterday);
  const yesterdayWords = perDay.get(keyYesterday) ?? 0;

  // melhor dia
  let bestDayWords = 0;
  let bestDayDate = null;
  for (const [d, v] of perDay.entries()) {
    if (v > bestDayWords) {
      bestDayWords = v;
      bestDayDate = d;
    }
  }

  // streak (dias consecutivos a partir de ontem com >0)
  let streak = 0;
  const cursor = new Date(yesterday);
  while (true) {
    const key = toYMDLocal(cursor);
    const v = perDay.get(key) ?? 0;
    if (v > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // média últimos N dias (sem hoje)
  const totals = [];
  const cursor2 = new Date(yesterday);
  for (let i = 0; i < daysWindow; i++) {
    const k = toYMDLocal(cursor2);
    totals.push(perDay.get(k) ?? 0);
    cursor2.setDate(cursor2.getDate() - 1);
  }
  const avgDaily = totals.reduce((a,b)=>a+b,0) / (totals.length || 1);

  return {
    yesterdayWords,
    averagePerDay: avgDaily,
    bestDay: bestDayDate ? { date: bestDayDate, words: bestDayWords } : null,
    activeDays: streak,
  };
}

/**
 * Agrega o histórico de múltiplos projetos em um mapa diário.
 * @param {Array<{date:string, wordsWritten:number}>[]} histories
 * @returns {Map<string, number>}
 */
export function mergeHistoriesToPerDay(histories) {
  const perDay = new Map();
  for (const hist of histories) {
    if (!Array.isArray(hist)) continue;
    for (const e of hist) {
      const key = toYMDLocal(e.date ?? e.createdAt ?? e.Date);
      if (!key) continue;
      const w = Number(e.wordsWritten ?? e.words ?? e.wordCount ?? e.added ?? 0);
      if (!Number.isFinite(w)) continue;
      perDay.set(key, (perDay.get(key) ?? 0) + w);
    }
  }
  return perDay;
}
