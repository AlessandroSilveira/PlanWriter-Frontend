// src/components/ProgressModal.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as ProjectsAPI from "../api/projects";

/**
 * Props:
 *  - open: boolean
 *  - onClose: fn()
 *  - projectId?: string
 *  - onSaved?: fn()
 *  - defaultWords?: number
 *  - defaultNote?: string
 */
export default function ProgressModal({
  open,
  onClose,
  projectId,
  onSaved,
  defaultWords,
  defaultNote,
}) {
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [words, setWords] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // carrega projetos se não veio pid
  useEffect(() => {
    let alive = true;
    if (!open) return;
    (async () => {
      setErr("");
      try {
        if (!projectId && ProjectsAPI.getProjects) {
          const list = await ProjectsAPI.getProjects();
          if (!alive) return;
          const arr = Array.isArray(list) ? list : [];
          setProjects(arr);
          const first = arr[0];
          if (first) setPid(first.id ?? first.projectId ?? "");
        } else {
          setProjects([]);
          setPid(projectId || "");
        }
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar projetos.");
      }
    })();
    return () => { alive = false; };
  }, [open, projectId]);

  // aplica defaults ao abrir
  useEffect(() => {
    if (!open) return;
    setWords(Number(defaultWords) || 0);
    setNote(defaultNote || "");
    setDate(new Date().toISOString().slice(0, 10));
  }, [open, defaultWords, defaultNote]);

  const submittingFn = useMemo(() => {
    // tenta descobrir a função de criação existente
    return (
      ProjectsAPI.addWritingEntry ||
      ProjectsAPI.addProjectProgress ||
      ProjectsAPI.addProgress ||
      ProjectsAPI.createWritingEntry ||
      ProjectsAPI.createProgress ||
      null
    );
  }, []);

  const canSubmit = pid && Number.isFinite(Number(words)) && Number(words) > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setErr("");
    try {
      const payload = {
        words: Number(words),
        note: note?.trim() || null,
        date, // YYYY-MM-DD
      };

      if (typeof submittingFn === "function") {
        await submittingFn(pid, payload);
      } else {
        // fallback genérico
        await axios.post(`/api/projects/${pid}/progress`, payload);
      }

      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível salvar o progresso.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="text-lg font-semibold">Adicionar progresso</h3>
          <button className="button" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {err && <p className="text-red-600 mt-1">{err}</p>}

        <div className="modal-body space-y-3">
          {/* Projeto */}
          {!projectId && (
            <label className="flex flex-col gap-1">
              <span className="label">Projeto</span>
              <select
                className="input"
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                disabled={loading}
              >
                {!projects.length && <option>Sem projetos</option>}
                {projects.map((p) => (
                  <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                    {p.title ?? p.name ?? "Projeto"}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Data */}
          <label className="flex flex-col gap-1">
            <span className="label">Data</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
          </label>

          {/* Palavras */}
          <label className="flex flex-col gap-1">
            <span className="label">Palavras</span>
            <input
              type="number"
              min={1}
              step={1}
              className="input"
              value={words}
              onChange={(e) => setWords(Math.max(0, Number(e.target.value) || 0))}
              disabled={loading}
            />
          </label>

          {/* Nota */}
          <label className="flex flex-col gap-1">
            <span className="label">Nota (opcional)</span>
            <textarea
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              placeholder="Ex.: Sprint de 20min, cena 3 finalizada…"
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={submit}
            disabled={!canSubmit || loading}
          >
            {loading ? "Salvando…" : "Salvar progresso"}
          </button>
        </div>
      </div>
    </div>
  );
}
