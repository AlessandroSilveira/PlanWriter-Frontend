// src/pages/WritingDiary.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/http";
import HistoryFilters from "../components/HistoryFilters.jsx";
import HistoryTable from "../components/HistoryTable.jsx";
import Pagination from "../components/Pagination.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { Skeleton } from "../components/Skeleton.jsx";
import { downloadCSV } from "../utils/csv";
import { getProjects } from "../api/projects";
import { getActiveEvents } from "../api/events";
import Alert from "../components/Alert.jsx";

// helpers
const fmtDateBR = (d) => {
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return String(d ?? ""); }
};

export default function WritingDiary() {
  // data
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);

  // filters / paging
  const [filters, setFilters] = useState({
    projectId: "",
    eventId: "",
    source: "",
    dateFrom: "",
    dateTo: "",
    minWords: "",
    maxWords: "",
    sort: "date_desc",
  });
  const [page, setPage] = useState(1);       // 1-based
  const [pageSize, setPageSize] = useState(20);

  // loading / error / rows
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(""); // sucesso/infos
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // boot: load projects + events
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, e] = await Promise.allSettled([getProjects(), getActiveEvents()]);
        if (!alive) return;
        setProjects(Array.isArray(p.value) ? p.value : []);
        setEvents(Array.isArray(e.value) ? e.value : []);
      } catch { /* suave */ }
    })();
    return () => { alive = false; };
  }, []);

  // fetcher with fallbacks
  const fetchHistory = useCallback(async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      if (!filters.projectId) {
        setErr("Selecione um projeto para ver o histórico.");
        setRows([]); setTotal(0);
        return;
      }

      const params = {
        projectId: filters.projectId || undefined,
        eventId: filters.eventId || undefined,
        source: filters.source || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        minWords: filters.minWords || undefined,
        maxWords: filters.maxWords || undefined,
        sort: filters.sort || undefined,
        page,
        pageSize,
      };

      const res = await api.get(
        `/projects/${filters.projectId}/progress/history`,
        { params }
      );
      const data = res?.data ?? null;

      // normaliza
      const items = Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data
        : [];

      const normalized = items.map((it) => {
        const date = it.dateUtc ?? it.dateISO ?? it.date ?? it.Date ?? it.createdAt ?? it.CreatedAt ?? null;
        const deltaWords = Number(
          it.wordsWritten ?? it.WordsWritten ?? it.wordsAdded ?? it.deltaWords ??
          it.WordsAdded ?? it.words ?? it.Words ?? 0
        ) || 0;
        const notes = it.notes ?? it.Notes ?? "";
        const projectTitle = it.projectTitle ?? it.ProjectTitle ?? it.projectName ?? it.ProjectName ?? "";
        const eventName = it.eventName ?? it.EventName ?? it.eventTitle ?? it.EventTitle ?? "";
        const source = it.source ?? it.Source ?? "";
        return { ...it, dateRaw: date, dateFmt: fmtDateBR(date), deltaWords, notes, projectTitle, eventName, source };
      });

      const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const to = filters.dateTo ? new Date(filters.dateTo) : null;
      if (from) from.setHours(0, 0, 0, 0);
      if (to) to.setHours(23, 59, 59, 999);
      const minWords = filters.minWords !== "" ? Number(filters.minWords) : null;
      const maxWords = filters.maxWords !== "" ? Number(filters.maxWords) : null;

      const filtered = normalized.filter((row) => {
        if (from || to) {
          const d = row.dateRaw ? new Date(row.dateRaw) : null;
          if (d && !Number.isNaN(d.getTime())) {
            if (from && d < from) return false;
            if (to && d > to) return false;
          }
        }
        if (minWords !== null && row.deltaWords < minWords) return false;
        if (maxWords !== null && row.deltaWords > maxWords) return false;
        return true;
      });

      const totalCount = filtered.length;
      const start = Math.max(0, (page - 1) * pageSize);
      const paged = filtered.slice(start, start + pageSize);

      setRows(paged);
      setTotal(totalCount);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Falha ao carregar histórico.");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // export CSV dos resultados atuais (filtros + página)
  const exportCsv = useCallback(() => {
    const headers = ["Data", "Projeto", "Evento", "Fonte", "Palavras", "Notas"];
    const data = rows.map((r) => [
      r.dateFmt || "",
      r.projectTitle || "",
      r.eventName || "",
      r.source || "",
      r.deltaWords || 0,
      r.notes || "",
    ]);
    const dateStr = new Date().toISOString().slice(0,10);
    const filename = `diario_escrita_${dateStr}.csv`;
    downloadCSV(filename, headers, data);
    setMsg("Exportado com sucesso.");
  }, [rows]);

  const hasData = useMemo(() => !loading && !err && rows.length > 0, [loading, err, rows]);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Diário da Escrita</h1>
        {hasData && (
          <button className="button" onClick={exportCsv}>Exportar CSV</button>
        )}
      </div>

      {/* Filtros */}
      <HistoryFilters
        projects={projects}
        events={events}
        initial={filters}
        onChange={(f) => {
          setFilters((prev) => ({ ...prev, ...f, submit: undefined }));
          if (f.submit) setPage(1);
        }}
      />

      {/* Mensagens globais */}
      {err && <Alert type="error">{err}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {/* Loading skeleton */}
      {loading && (
        <div className="panel">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </div>
      )}

      {/* Vazio */}
      {!loading && !err && rows.length === 0 && (
        <EmptyState
          icon="users"
          title="Nenhum registro encontrado"
          subtitle="Ajuste os filtros (datas, projeto, fonte) ou adicione progresso para ver aqui."
        />
      )}

      {/* Tabela + paginação */}
      {hasData && <div className="panel">
        <HistoryTable loading={false} rows={rows} />
        <div className="mt-4">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        </div>
      </div>}
    </div>
  );
}
