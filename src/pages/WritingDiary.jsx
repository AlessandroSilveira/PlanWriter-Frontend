// src/pages/WritingDiary.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import HistoryFilters from "../components/HistoryFilters.jsx";
import HistoryTable from "../components/HistoryTable.jsx";
import Pagination from "../components/Pagination.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Skeleton from "../components/Skeleton.jsx"; // default import
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
  const [msg, setMsg] = useState("");
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
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  // fetcher with fallbacks
  const fetchHistory = useCallback(async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
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

      const tryGet = async (url) => {
        try {
          const res = await axios.get(url, { params });
          if (res?.data) return res.data;
        } catch {}
        return null;
      };

      // prioridades
      let data =
        await tryGet("/api/writing/history") ||
        await tryGet("/api/progress/history") ||
        (filters.projectId ? await tryGet(`/api/projects/${filters.projectId}/progress/history`) : null) ||
        await tryGet("/api/me/progress/history");

      const items = Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data
        : [];
      const totalCount = Number(data?.total ?? data?.totalCount ?? items.length) || items.length;

      const normalized = items.map((it) => {
        const date = it.dateUtc ?? it.dateISO ?? it.date ?? it.createdAt ?? it.CreatedAt ?? null;
        const deltaWords = Number(it.wordsAdded ?? it.deltaWords ?? it.WordsAdded ?? it.words ?? it.Words ?? 0) || 0;
        const notes = it.notes ?? it.Notes ?? "";
        const projectTitle = it.projectTitle ?? it.ProjectTitle ?? it.projectName ?? it.ProjectName ?? "";
        const eventName = it.eventName ?? it.EventName ?? it.eventTitle ?? it.EventTitle ?? "";
        const source = it.source ?? it.Source ?? "";
        return { ...it, dateFmt: fmtDateBR(date), deltaWords, notes, projectTitle, eventName, source };
      });

      setRows(normalized);
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

      <HistoryFilters
        projects={projects}
        events={events}
        initial={filters}
        onChange={(f) => {
          setFilters((prev) => ({ ...prev, ...f, submit: undefined }));
          if (f.submit) setPage(1);
        }}
      />

      {err && <Alert type="error">{err}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {loading && (
        <div className="panel">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <EmptyState
          icon="users"
          title="Nenhum registro encontrado"
          subtitle="Ajuste os filtros (datas, projeto, fonte) ou adicione progresso para ver aqui."
        />
      )}

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
