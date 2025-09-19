// src/components/TodayTargetCard.jsx
import { useEffect, useMemo, useState } from "react";
import { getActiveEvents, getEventProgress } from "../api/events";
import { getProjectHistory } from "../api/projects";

/**
 * Mostra: Hoje, Meta de hoje, Faltam (hoje), Modo (Evento ou Projeto).
 * Regras:
 *  - Se houver evento ativo e o projeto estiver inscrito → usa dailyTarget do evento.
 *  - Caso contrário:
 *      - Se houver deadline no projeto → calcula (goal - current) / dias restantes.
 *      - Senão → assume janela de 30 dias: ceil(goal / 30).
 */
export default function TodayTargetCard({ project }) {
  const projectId = project?.id ?? project?.projectId;
  const goal = Number(project?.wordCountGoal ?? 0) || 0;
  const current = Number(project?.currentWordCount ?? 0) || 0;

  const [todayWords, setTodayWords] = useState(0);
  const [mode, setMode] = useState("project"); // "event" | "project"
  const [dailyTarget, setDailyTarget] = useState(0);
  const [error, setError] = useState("");

  // pega palavras do projeto HOJE
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setError("");
      try {
        const hist = await getProjectHistory(projectId);
        const now = new Date(); now.setHours(0,0,0,0);
        const key = now.toISOString().slice(0,10);
        const v = (hist || [])
          .filter(h => {
            const d = new Date(h.date || h.Date || h.createdAt || h.CreatedAt);
            return d.toISOString().slice(0,10) === key;
          })
          .reduce((sum, h) => sum + (Number(h.wordsWritten ?? h.WordsWritten ?? h.words ?? 0) || 0), 0);
        setTodayWords(v);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Falha ao ler histórico de hoje.");
      }
    })();
  }, [projectId]);

  // tenta usar evento ativo; se não, calcula meta do projeto
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!projectId) return;
      try {
        const evs = await getActiveEvents();
        const active = Array.isArray(evs) && evs.length ? evs[0] : null;
        if (active) {
          try {
            const p = await getEventProgress({ projectId, eventId: active.id || active.Id });
            if (alive && p?.dailyTarget) {
              setMode("event");
              setDailyTarget(Number(p.dailyTarget) || 0);
              return;
            }
          } catch {
            // projeto não inscrito → cai para meta do projeto
          }
        }
      } catch {
        // sem eventos → cai para meta do projeto
      }

      // --- fallback: meta do projeto ---
      const today = new Date(); today.setHours(0,0,0,0);
      let daysRemaining = 30;
      if (project?.deadline) {
        const d = new Date(project.deadline);
        d.setHours(0,0,0,0);
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24));
        daysRemaining = Math.max(1, diff);
      }
      const remaining = Math.max(0, goal - current);
      const needPerDay = Math.ceil(remaining / daysRemaining);
      if (alive) {
        setMode("project");
        setDailyTarget(needPerDay);
      }
    })();

    return () => { alive = false; };
  }, [projectId, goal, current, project?.deadline]);

  const remainingToday = useMemo(() => Math.max(0, dailyTarget - todayWords), [dailyTarget, todayWords]);

  return (
    <section className="panel">
      <div className="flex items-start justify-between">
        <h2 className="section-title">Meta de hoje</h2>
        <span className="text-xs text-muted">{mode === "event" ? "Evento ativo" : "Projeto"}</span>
      </div>

      {error && <p className="text-red-600 mt-1">{error}</p>}

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi">
          <div className="label">Hoje</div>
          <div className="value">{todayWords.toLocaleString("pt-BR")}</div>
          <div className="hint">palavras</div>
        </div>
        <div className="kpi">
          <div className="label">Meta de hoje</div>
          <div className="value">{dailyTarget.toLocaleString("pt-BR")}</div>
          <div className="hint">palavras</div>
        </div>
        <div className="kpi">
          <div className="label">Faltam hoje</div>
          <div className={`value ${remainingToday > 0 ? "" : "text-green-700 dark:text-green-400"}`}>
            {remainingToday.toLocaleString("pt-BR")}
          </div>
          <div className="hint">{remainingToday > 0 ? "para bater a meta" : "meta batida 🎉"}</div>
        </div>

        {mode === "project" && (
          <div className="kpi">
            <div className="label">Para terminar</div>
            <div className="value">
              {(() => {
                const today = new Date(); today.setHours(0,0,0,0);
                let daysRemaining = 30;
                if (project?.deadline) {
                  const d = new Date(project.deadline);
                  d.setHours(0,0,0,0);
                  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24));
                  daysRemaining = Math.max(1, diff);
                }
                const remaining = Math.max(0, goal - current);
                const needPerDay = Math.ceil(remaining / daysRemaining);
                return needPerDay.toLocaleString("pt-BR");
              })()}
            </div>
            <div className="hint">palavras/dia</div>
          </div>
        )}
      </div>
    </section>
  );
}
