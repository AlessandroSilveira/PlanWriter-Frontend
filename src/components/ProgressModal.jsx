// src/components/ProgressModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/http"; 
import Alert from "./Alert.jsx";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - projectId: string | number
 *  - goalUnit: "Words" | "Minutes" | "Pages"
 *  - initialDate?: string (ISO yyyy-mm-dd)
 *  - onSaved?: () => void
 *  - defaultWords?: number
 *  - defaultNote?: string
 */
export default function ProgressModal({
  open,
  onClose,
  projectId,
  goalUnit = "Words",
  initialDate,
  onSaved,
  defaultWords,
  defaultNote,
}) {
  /* ---------------- State ---------------- */
  const [date, setDate] = useState("");
  const [words, setWords] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");

  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const wasOpen = useRef(false);

  /* ---------------- Reset ao abrir ---------------- */
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;

    if (justOpened) {
      setErr("");
      setMsg("");
      setSource("manual");
      setNotes(defaultNote || "");

      // 🔥 Usa initialDate se vier do calendário
      const dt = initialDate || new Date().toISOString().slice(0, 10);
      setDate(dt);

      setWords(goalUnit === "Words" ? (defaultWords || "") : "");
      setMinutes(goalUnit === "Minutes" ? "" : "");
      setPages(goalUnit === "Pages" ? "" : "");
    }
  }, [open, defaultWords, defaultNote, goalUnit, initialDate]);

  const unitLabel =
    goalUnit === "Minutes"
      ? "Minutos"
      : goalUnit === "Pages"
      ? "Páginas"
      : "Palavras";

  /* ---------------- Validação ---------------- */
  const valid = useMemo(() => {
    const w = Number(words) || 0;
    const m = Number(minutes) || 0;
    const p = Number(pages) || 0;

    if (!projectId || !date) return false;

    if (goalUnit === "Minutes") return m > 0;
    if (goalUnit === "Pages") return p > 0;
    return w > 0;
  }, [projectId, date, words, minutes, pages, goalUnit]);

  /* ---------------- Salvar ---------------- */
  const save = async () => {
    if (!valid) return;

    setBusy(true);
    setErr("");
    setMsg("");

    try {
      const payload = {
        projectId,
        date,
        notes: notes?.trim() || undefined,
        wordsWritten: goalUnit === "Words" ? Number(words) : undefined,
        minutes: goalUnit === "Minutes" ? Number(minutes) : undefined,
        pages: goalUnit === "Pages" ? Number(pages) : undefined,
      };

      await api.post(`/projects/${projectId}/progress`, payload);

      onSaved?.(); // recarregar
      onClose?.(); // 🔥 fecha o modal automaticamente
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Falha ao lançar o progresso."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  /* ---------------- Render ---------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* fundo */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 shadow-xl p-5">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Adicionar progresso</h3>
          <button className="button" onClick={onClose} disabled={busy}>
            Fechar
          </button>
        </div>

        {err && <Alert type="error">{err}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}

        <div className="grid md:grid-cols-2 gap-3 mt-3">

          {/* Data */}
          <label className="flex flex-col gap-1">
            <span className="label">Data</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>

          {/* Campo condicional */}
          {goalUnit === "Minutes" ? (
            <label className="flex flex-col gap-1">
              <span className="label">Minutos</span>
              <input
                type="number"
                className="input"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
          ) : goalUnit === "Pages" ? (
            <label className="flex flex-col gap-1">
              <span className="label">Páginas</span>
              <input
                type="number"
                className="input"
                min={1}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="label">Palavras adicionadas</span>
              <input
                type="number"
                className="input"
                min={1}
                value={words}
                onChange={(e) => setWords(e.target.value)}
              />
            </label>
          )}

          {/* Fonte */}
          <label className="flex flex-col gap-1">
            <span className="label">Fonte</span>
            <select
              className="input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="sprint">Sprint</option>
              <option value="import">Importação</option>
              <option value="api">API</option>
            </select>
          </label>

          {/* Notas */}
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="label">Notas (opcional)</span>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={`Observações sobre este lançamento de ${unitLabel.toLowerCase()}…`}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={save}
            disabled={!valid || busy}
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
