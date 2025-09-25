// src/pages/WordSprint.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { getProjects } from "../api/projects";
import { getActiveEvents } from "../api/events";
import Alert from "../components/Alert.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Skeleton from "../components/Skeleton.jsx"; // default import

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const wordCount = (text) => {
  if (!text) return 0;
  return (text.trim().match(/\b[\p{L}\p{N}’'-]+\b/gu) || []).length;
};

function playBeep({ duration = 0.2, frequency = 880, type = "sine", volume = 0.05 } = {}) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, Math.round(duration * 1000));
  } catch {}
}

export default function WordSprint() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);

  const [projectId, setProjectId] = useState("");
  const [eventId, setEventId] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [target, setTarget] = useState("");
  const [autoLog, setAutoLog] = useState(true);
  const [beep, setBeep] = useState(true);

  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);

  const [text, setText] = useState("");
  const [startWords, setStartWords] = useState(0);
  const [endWords, setEndWords] = useState(0);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const editorRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [p, e] = await Promise.allSettled([getProjects(), getActiveEvents()]);
        if (!alive) return;
        const pArr = Array.isArray(p.value) ? p.value : [];
        const eArr = Array.isArray(e.value) ? e.value : [];
        setProjects(pArr);
        setEvents(eArr);
        if (pArr[0]) setProjectId(pArr[0].id ?? pArr[0].projectId ?? "");
        if (eArr[0]) setEventId(eArr[0].id ?? eArr[0].Id ?? "");
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar dados.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const totalWords = useMemo(() => wordCount(text), [text]);
  const deltaWords = useMemo(() => Math.max(0, totalWords - startWords), [totalWords, startWords]);
  const percent = useMemo(() => {
    const t = Number(target) || 0;
    if (!t) return 0;
    return Math.min(100, Math.round((deltaWords / t) * 100));
  }, [deltaWords, target]);

  useEffect(() => {
    if (!running) return;
    const startTick = Date.now();
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          clearInterval(tickRef.current);
          setRunning(false);
          setEndedAt(new Date().toISOString());
          if (beep) playBeep();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, beep]);

  useEffect(() => {
    const onKey = (e) => {
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea";

      if (e.code === "Space" && !typing) {
        e.preventDefault();
        if (!startedAt) handleStart();
        else handleToggle();
      } else if (e.code === "Escape") {
        if (running) handleToggle(false);
        else if (!running && (secondsLeft > 0 || startedAt)) handleCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.code === "Enter") {
        if (!running && secondsLeft === 0 && startedAt) handleFinish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, secondsLeft, startedAt]);

  const handleStart = () => {
    if (!projectId) {
      setErr("Selecione um projeto para começar o sprint.");
      return;
    }
    setErr(""); setMsg("");
    const secs = Math.max(1, Math.floor((Number(minutes) || 0) * 60));
    setSecondsLeft(secs);
    setStartedAt(new Date().toISOString());
    setStartWords(totalWords);
    setRunning(true);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const handleToggle = (force) => {
    const next = typeof force === "boolean" ? force : !running;
    setRunning(next);
  };

  const handleCancel = () => {
    if (!confirm("Cancelar este sprint? O texto digitado ficará salvo localmente, mas nada será lançado.")) return;
    setRunning(false);
    setSecondsLeft(0);
    setStartedAt(null);
    setEndedAt(null);
    setStartWords(0);
    setEndWords(0);
    setMsg("Sprint cancelado.");
  };

  const handleFinish = async () => {
    setRunning(false);
    setEndedAt(new Date().toISOString());
    setEndWords(totalWords);
    if (autoLog) await handleLog();
  };

  const handleLog = async () => {
    if (!projectId) return;
    const delta = Math.max(0, (endWords || totalWords) - startWords);
    if (!delta) {
      setMsg("Nada para lançar (0 palavras adicionadas).");
      return;
    }

    setBusy(true); setErr(""); setMsg("");
    try {
      const payload = {
        projectId,
        eventId: eventId || undefined,
        date: new Date().toISOString().slice(0,10),
        words: delta,
        source: "sprint",
        notes: `Word sprint de ${minutes} min${target ? `, meta ${target} palavras` : ""}.`,
      };

      const tryPost = async (url) => {
        try { const r = await axios.post(url, payload); return r?.data || true; } catch { return null; }
      };

      let ok =
        await tryPost("/api/progress") ||
        await tryPost(`/api/projects/${projectId}/progress`) ||
        (eventId ? await tryPost(`/api/events/${eventId}/progress`) : null);

      if (!ok) throw new Error("Não foi possível lançar o progresso.");

      setMsg(`Lançado: ${delta.toLocaleString("pt-BR")} palavras.`);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao lançar o progresso.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const exportTxt = () => {
    const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0,16).replace(/[:T]/g,"-");
    a.href = url;
    a.download = `sprint_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>

        <section className="panel">
          <div className="grid md:grid-cols-3 gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </section>

        <section className="panel">
          <Skeleton className="h-96 w-full" />
        </section>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="container py-6">
        <EmptyState
          icon="alert"
          title="Você ainda não tem projetos"
          subtitle="Crie um projeto para poder começar um Sprint de escrita."
          actions={[{ label: "Criar projeto", to: "/projects/new" }]}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Word Sprint</h1>
        <div className="flex gap-2">
          <button className="button" onClick={toggleFullscreen} title="Tela cheia">Tela cheia</button>
          <button className="button" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>

      <section className="panel">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={running}>
              {projects.map((p) => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Evento (opcional)</span>
            <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={running}>
              <option value="">—</option>
              {events.map((ev) => (
                <option key={ev.id ?? ev.Id} value={ev.id ?? ev.Id}>
                  {ev.name ?? ev.Name ?? "Evento"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Duração (min)</span>
            <input
              type="number" className="input" min={1} step={1}
              value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
              disabled={running}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Meta (palavras, opcional)</span>
            <input
              type="number" className="input" min={1} step={1}
              value={target} onChange={(e) => setTarget(e.target.value)}
              disabled={running}
              placeholder="ex: 500"
            />
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" className="checkbox" checked={autoLog} onChange={(e) => setAutoLog(e.target.checked)} disabled={running} />
            <span className="text-sm">Lançar automaticamente ao terminar</span>
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" className="checkbox" checked={beep} onChange={(e) => setBeep(e.target.checked)} disabled={running} />
            <span className="text-sm">Beep ao finalizar</span>
          </label>
        </div>

        {err && <Alert type="error">{err}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}
      </section>

      {!!startedAt && (
        <section className="panel">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="kpi">
              <div className="label">Tempo</div>
              <div className="value">{fmtTime(secondsLeft)}</div>
              <div className="hint">{running ? "rodando…" : "pausado/encerrado"}</div>
            </div>
            <div className="kpi">
              <div className="label">Total</div>
              <div className="value">{totalWords.toLocaleString("pt-BR")}</div>
              <div className="hint">palavras no editor</div>
            </div>
            <div className="kpi">
              <div className="label">Δ sessão</div>
              <div className="value">{deltaWords.toLocaleString("pt-BR")}</div>
              <div className="hint">desde o início</div>
            </div>
            <div className="kpi">
              <div className="label">% da meta</div>
              <div className="value">{percent}%</div>
              <div className="hint">{target ? `${Number(target).toLocaleString("pt-BR")} palavras` : "sem meta"}</div>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        {!startedAt ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted">
              Atalhos: <b>Espaço</b> inicia/pausa • <b>Esc</b> cancela • <b>⌘/Ctrl + ⏎</b> confirma no fim
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={handleStart}>Começar Sprint</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted">
              {running ? "Escreva sem parar! " : "Pausado. "}
              Atalhos: <b>Espaço</b> inicia/pausa • <b>Esc</b> cancela • <b>⌘/Ctrl + ⏎</b> confirmar
            </div>
            <div className="flex gap-2">
              {secondsLeft > 0 && (
                <button className="button" onClick={() => handleToggle()}>{running ? "Pausar" : "Retomar"}</button>
              )}
              {secondsLeft === 0 && (
                <button className="btn-primary" onClick={handleFinish} disabled={busy}>
                  {autoLog ? "Finalizar e lançar" : "Finalizar"}
                </button>
              )}
              <button className="button" onClick={handleCancel} disabled={busy}>Cancelar</button>
            </div>
          </div>
        )}

        <textarea
          ref={editorRef}
          className="input mt-3 h-[50vh] resize-y"
          placeholder="Comece a digitar aqui durante o sprint..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted">
            Palavras: <b>{totalWords.toLocaleString("pt-BR")}</b> • Δ sessão: <b>{deltaWords.toLocaleString("pt-BR")}</b>
          </div>
          <div className="flex gap-2">
            <button className="button" onClick={exportTxt}>Exportar texto (.txt)</button>
            {startedAt && !running && secondsLeft === 0 && !autoLog && (
              <button className="btn-primary" onClick={handleLog} disabled={busy || deltaWords === 0}>
                Lançar progresso agora
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
