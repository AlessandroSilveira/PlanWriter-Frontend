import { useEffect, useState } from "react";
import { addProgress } from "../api/projects";

export default function ProgressModal({ open, onClose, projectId, onSaved }) {
  const [words, setWords] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm
  );
  const [notes, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await addProgress(projectId, {
        wordsWritten: Number(words),
        date,
        notes: notes || null,
      });
      setWords("");
      setNote("");
      onClose?.();
      onSaved?.();
    } catch (ex) {
      const msg =
        ex?.response?.data?.message ||
        ex?.message ||
        "Falha ao salvar progresso";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Adicionar progresso</h3>
          <button className="button" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Palavras</label>
            <input
              type="number"
              min={0}
              className="input w-full"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Data e hora</label>
            <input
              type="datetime-local"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Nota (opcional)</label>
            <textarea
              rows={3}
              className="input w-full"
              value={notes}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Como foi sua sessão de escrita?"
            />
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
