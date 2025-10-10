// src/utils/paceAndStreak.js

// daily: [{ date: "YYYY-MM-DD", words: number }]
export function buildDailyMap(daily) {
  const map = new Map();
  for (const d of daily) {
    map.set(d.date, (map.get(d.date) || 0) + (d.words || 0));
  }
  return map;
}

export function dateRange(startISO, endISO) {
  const out = [];
  const cur = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// Constrói série acumulada real e alvo (pace)
export function buildCumulativeSeries({ daily, startISO, endISO, targetTotal }) {
  const days = dateRange(startISO, endISO);
  const map = buildDailyMap(daily);
  const perDay = targetTotal > 0 ? targetTotal / Math.max(days.length, 1) : 0;

  let cumReal = 0;
  let cumTarget = 0;

  const series = days.map((iso) => {
    const value = map.get(iso) || 0;
    cumReal += value;
    cumTarget += perDay;
    return {
      date: iso,
      real: cumReal,
      target: Math.round(cumTarget),
      value, // do dia (não acumulado)
    };
  });

  return series;
}

// Streak atual e recorde: conta dias consecutivos com >0, olhando a série ordenada até "todayISO" (default = hoje)
export function computeStreak(daily, todayISO = new Date().toISOString().slice(0,10)) {
  if (!daily?.length) return { current: 0, best: 0 };

  // normaliza por data
  const map = buildDailyMap(daily);
  const minDate = daily.map(d => d.date).sort()[0];
  const days = dateRange(minDate, todayISO);

  let cur = 0;
  let best = 0;
  for (let i = 0; i < days.length; i++) {
    const iso = days[i];
    const wrote = (map.get(iso) || 0) > 0;
    if (wrote) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  // current streak é o contador no final do loop
  return { current: cur, best };
}
