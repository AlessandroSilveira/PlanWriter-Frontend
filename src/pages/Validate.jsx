import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import { getActiveEvents, getEventProgress } from "../api/events";
import { previewValidation, submitValidation } from "../api/validation";

function countWordsStrict(text) {
  if (!text) return 0;
  // regra simples NaNo-like: tokens separados por espaço
  const m = text.trim().match(/[^\s]+/g);
  return m ? m.length : 0;
}

export default function Validate() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [eventId, setEventId] = useState("");
  const [mode, setMode] = useState("current"); // current | paste | manual

  const [paste, setPaste] = useState("");
  const [manual, setManual] = useState(0);

  const [target, setTarget] = useState(0);
  const [currentTotal, setCurrentTotal] = useState(0);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ps, evs] = await Promise.all([getProjects(), getActiveEvents()]);
        const list = Array.isArray(ps) ? ps : [];
        const eventsList = Array.isArray(evs) && evs.length ? evs : [];
        setProjects(list);
        setEvents(eventsList);
        if (list[0]) setProjectId(list[0].id ?? list[0].projectId);
        if (eventsList[0]) setEventId(eventsList[0].id ?? eventsList[0].Id);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar dados.");
      }
    })();
  }, []);

  // preview do servidor (meta e total apurado)
  useEffect(() => {
    if (!projectId || !eventId) return;
    (async () => {
      try {
        const p = await previewValidation(eventId, projectId);
        setTarget(Number(p.target) || 0);
        setCurrentTotal(Number(p.total) || 0);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao obter prévia.");
      }
    })();
  }, [projectId, eventId]);

  // total escolhido conforme modo
  const chosenTotal = useMemo(() => {
    if (mode === "current") return currentTotal;
    if (mode === "paste") return countWordsStrict(paste);
    return Math.max(0, Number(manual) || 0);
  }, [mode, currentTotal, paste, manual]);

  const canSubmit = projectId && eventId && chosenTotal >= target;

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      await submitValidation(eventId, projectId, chosenTotal, mode);
      navigate(`/u/me`); // ou onde preferir; se tiver slug, pode navegar para perfil público
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível validar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Validar contagem de palavras</h1>
        <button className="button" onClick={() => navigate(-1)}>Voltar</button>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <section className="panel">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Evento</span>
            <select className="input" value={eventId} onChange={e => setEventId(e.target.value)}>
              {!events.length && <option>Sem evento ativo</option>}
              {events.map(ev => (
                <option key={ev.id ?? ev.Id} value={ev.id ?? ev.Id}>
                  {ev.name ?? ev.Name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi">
            <div className="label">Meta do evento</div>
            <div className="value">{target.toLocaleString("pt-BR")}</div>
            <div className="hint">palavras</div>
          </div>
          <div className="kpi">
            <div className="label">Apurado (sistema)</div>
            <div className="value">{currentTotal.toLocaleString("pt-BR")}</div>
            <div className="hint">últimos dias do evento</div>
          </div>
          <div className="kpi">
            <div className="label">Escolhido</div>
            <div className="value">{chosenTotal.toLocaleString("pt-BR")}</div>
            <div className="hint">{mode === "current" ? "do sistema" : mode === "paste" ? "do texto colado" : "manual"}</div>
          </div>
          <div className="kpi">
            <div className="label">{chosenTotal >= target ? "Status" : "Faltam"}</div>
            <div className={`value ${chosenTotal >= target ? "text-green-700 dark:text-green-400" : ""}`}>
              {chosenTotal >= target ? "OK ✅" : (target - chosenTotal).toLocaleString("pt-BR")}
            </div>
            <div className="hint">{chosenTotal >= target ? "pronto para validar" : "palavras"}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <label className={`button ${mode==="current"?"ghost":""}`}>
              <input type="radio" className="sr-only" checked={mode==="current"} onChange={()=>setMode("current")} />
              Usar total do sistema
            </label>
            <label className={`button ${mode==="paste"?"ghost":""}`}>
              <input type="radio" className="sr-only" checked={mode==="paste"} onChange={()=>setMode("paste")} />
              Colar texto
            </label>
            <label className={`button ${mode==="manual"?"ghost":""}`}>
              <input type="radio" className="sr-only" checked={mode==="manual"} onChange={()=>setMode("manual")} />
              Informar manualmente
            </label>
          </div>

          {mode === "paste" && (
            <div className="mt-3">
              <textarea
                className="input w-full h-40"
                placeholder="Cole aqui o conteúdo do seu manuscrito para contagem…"
                value={paste}
                onChange={e => setPaste(e.target.value)}
              />
              <div className="text-sm text-muted mt-1">
                Contagem estimada: <b>{countWordsStrict(paste).toLocaleString("pt-BR")}</b> palavras
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="mt-3">
              <input
                type="number"
                className="input w-48"
                min={0}
                step={1}
                value={manual}
                onChange={e => setManual(Math.max(0, Number(e.target.value)||0))}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="button" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={!canSubmit || saving}>
            {saving ? "Validando…" : "Validar e comemorar 🎉"}
          </button>
        </div>
      </section>
    </div>
  );
}
