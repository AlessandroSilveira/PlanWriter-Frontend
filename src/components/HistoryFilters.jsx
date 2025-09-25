import { useEffect, useMemo, useState } from "react";

/**
 * Props:
 *  - projects: []
 *  - events: []
 *  - initial: objeto com filtros iniciais
 *  - onChange(filters)
 */
export default function HistoryFilters({ projects = [], events = [], initial = {}, onChange }) {
  const [projectId, setProjectId] = useState(initial.projectId ?? "");
  const [eventId, setEventId] = useState(initial.eventId ?? "");
  const [source, setSource] = useState(initial.source ?? "");
  const [dateFrom, setDateFrom] = useState(initial.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initial.dateTo ?? "");
  const [minWords, setMinWords] = useState(initial.minWords ?? "");
  const [maxWords, setMaxWords] = useState(initial.maxWords ?? "");
  const [sort, setSort] = useState(initial.sort ?? "date_desc"); // date_desc | date_asc | words_desc | words_asc

  const canSubmit = useMemo(() => true, []);

  useEffect(() => {
    onChange?.({ projectId, eventId, source, dateFrom, dateTo, minWords, maxWords, sort });
  }, [projectId, eventId, source, dateFrom, dateTo, minWords, maxWords, sort]); // eslint-disable-line

  return (
    <div className="panel">
      <div className="grid md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Projeto</span>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                {p.title ?? p.name ?? "Projeto"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Evento</span>
          <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Todos</option>
            {events.map((ev) => {
              const id = ev.id ?? ev.Id;
              const name = ev.name ?? ev.Name ?? "Evento";
              return <option key={id} value={id}>{name}</option>;
            })}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Fonte</span>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Todas</option>
            <option value="manual">Manual</option>
            <option value="sprint">Sprint</option>
            <option value="import">Importação</option>
            <option value="api">API</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Início</span>
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Fim</span>
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Ordenação</span>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date_desc">Mais recentes</option>
            <option value="date_asc">Mais antigos</option>
            <option value="words_desc">Mais palavras primeiro</option>
            <option value="words_asc">Menos palavras primeiro</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Mín. palavras</span>
          <input type="number" className="input" min={0} value={minWords}
                 onChange={(e) => setMinWords(e.target.value)} placeholder="ex: 50" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Máx. palavras</span>
          <input type="number" className="input" min={0} value={maxWords}
                 onChange={(e) => setMaxWords(e.target.value)} placeholder="ex: 2000" />
        </label>

        <div className="flex items-end">
          <button
            className="button w-full"
            disabled={!canSubmit}
            onClick={() => onChange?.({ projectId, eventId, source, dateFrom, dateTo, minWords, maxWords, sort, submit: true })}
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}
