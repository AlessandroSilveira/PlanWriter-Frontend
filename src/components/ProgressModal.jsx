// src/components/ProgressModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Alert from "./Alert.jsx";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - projectId: string | number (obrigatório)
 *  - eventId?: string | number  (opcional, mas melhora o vínculo)
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
  const [words, setWords] = useState("");
  const [source, setSource] = useState("manual");
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

  const valid = useMemo(() => {
    const n = Number(words);
    return projectId && !isNaN(n) && n > 0 && date;
  }, [projectId, words, date]);

  const save = async () => {
    if (!valid) return;
    setBusy(true); setErr(""); setMsg("");

    try {
      const payload = {
        projectId,
        eventId: eventId || undefined,
        date, // YYYY-MM-DD
        words: Number(words),
        source,
        notes: notes?.trim() || undefined,
      };

      // Tente endpoints comuns em ordem
      const tryPost = async (url) => {
        try { const r = await axios.post(url, payload); return r?.data || true; } catch { return null; }
      };

      // 1) /api/progress (genérico)
      let ok =
        await tryPost("/api/progress") ||
        // 2) /api/projects/{projectId}/progress
        await tryPost(`/api/projects/${projectId}/progress`) ||
        // 3) /api/events/{eventId}/progress (se houver)
        (eventId ? await tryPost(`/api/events/${eventId}/progress`) : null);

      if (!ok) {
        throw new Error("Não foi possível lançar o progresso.");
      }

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
              placeholder="Observações sobre este lançamento…"
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
