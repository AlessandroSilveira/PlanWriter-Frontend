// src/components/ProgressModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Alert from "./Alert.jsx";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - projectId: string | number (obrigatório)
 *  - eventId?: string | number  (opcional – ignorado no POST atual)
 *  - onSaved?: () => void       (callback após salvar)
 *  - defaultWords?: number      (pré-preenche o campo de palavras)
 *  - defaultNote?: string       (pré-preenche o campo de notas)
 */
export default function ProgressModal({
  open,
  onClose,
  projectId,
  eventId,
  onSaved,
  defaultWords,
  defaultNote,
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // valores por unidade
  const [words, setWords] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");

  const [source, setSource] = useState("manual"); // mantido para UX
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const wasOpen = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;

    if (justOpened) {
      setErr("");
      setMsg("");
      setWords(
        defaultWords === undefined || defaultWords === null || Number(defaultWords) <= 0
          ? ""
          : String(defaultWords)
      );
      setSource("manual");
      setNotes(defaultNote ? String(defaultNote) : "");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultWords, defaultNote]);

  const unitLabel =
    goalUnit === "Minutes" ? "Minutos" :
    goalUnit === "Pages"   ? "Páginas" : "Palavras";

  // valida: pelo menos 1 campo (>0) conforme a unidade
  const valid = useMemo(() => {
    const nW = Number(words)   || 0;
    const nM = Number(minutes) || 0;
    const nP = Number(pages)   || 0;
    if (!projectId || !date) return false;
    if (goalUnit === "Minutes") return nM > 0;
    if (goalUnit === "Pages")   return nP > 0;
    return nW > 0; // Words (default)
  }, [projectId, date, words, minutes, pages, goalUnit]);

  const save = async () => {
    if (!valid) return;
    setBusy(true); setErr(""); setMsg("");

    try {
      const payload = {
        projectId,
        date, // YYYY-MM-DD
        notes: notes?.trim() || undefined,
        wordsWritten: goalUnit === "Words"   ? Number(words)   : undefined,
        minutes:      goalUnit === "Minutes" ? Number(minutes) : undefined,
        pages:        goalUnit === "Pages"   ? Number(pages)   : undefined,
      };

      await axios.post(`/api/projects/${projectId}/progress`, payload);

      setMsg("Progresso lançado com sucesso.");
      onSaved?.();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao lançar o progresso.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />

      {/* modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 shadow-xl p-5">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Adicionar progresso</h3>
          <button className="button" onClick={onClose} disabled={busy}>Fechar</button>
        </div>

        {/* mensagens */}
        {err && <Alert type="error">{err}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}

        {/* form */}
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="flex flex-col gap-1">
            <span className="label">Data</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0,10)}
            />
          </label>

          {/* Campo condicional por unidade */}
          {goalUnit === "Minutes" ? (
            <label className="flex flex-col gap-1">
              <span className="label">Minutos</span>
              <input
                type="number"
                min={1}
                step={1}
                className="input"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="ex: 45"
              />
            </label>
          ) : goalUnit === "Pages" ? (
            <label className="flex flex-col gap-1">
              <span className="label">Páginas</span>
              <input
                type="number"
                min={1}
                step={1}
                className="input"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="ex: 5"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="label">Palavras adicionadas</span>
              <input
                type="number"
                min={1}
                step={1}
                className="input"
                value={words}
                onChange={(e) => setWords(e.target.value)}
                placeholder="ex: 500"
              />
            </label>
          )}

          {/* Fonte (mantido para UX) */}
          <label className="flex flex-col gap-1">
            <span className="label">Fonte</span>
            <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="sprint">Sprint</option>
              <option value="import">Importação</option>
              <option value="api">API</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="label">Notas (opcional)</span>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Observações sobre este lançamento de ${unitLabel.toLowerCase()}…`}
            />
          </label>
        </div>

        {/* ações */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={!valid || busy}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
