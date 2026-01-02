// src/pages/WritingDiary.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/http";

export default function WritingDiary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    projectId: "",
    from: "",
    to: "",
    page: 1,
    pageSize: 50,
  });
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (filters.projectId) p.projectId = filters.projectId;
    if (filters.from) p.from = filters.from;
    if (filters.to) p.to = filters.to;
    if (filters.page) p.page = filters.page;
    if (filters.pageSize) p.pageSize = filters.pageSize;
    return p;
  }, [filters]);

  useEffect(() => {
    let mounted = true;

    const tryGet = async (url) => {
      try {
        const res = await api.get(url, { params });
        if (res?.data) return res.data;
      } catch {
        // tenta a próxima rota
      }
      return null;
    };

    (async () => {
      setLoading(true);
      setError("");

      // Ordem de fallback: /writing/history -> /progress/history -> /projects/:id/progress/history -> /me/progress/history
      let data =
        (await tryGet("/writing/history")) ||
        (await tryGet("/progress/history")) ||
        (filters.projectId
          ? await tryGet(`/projects/${filters.projectId}/progress/history`)
          : null) ||
        (await tryGet("/me/progress/history"));

      if (!mounted) return;

      if (!data) {
        setError("Não foi possível carregar o diário de escrita.");
        setItems([]);
      } else {
        // normaliza para um array [{date, words, projectId, note}]
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems(list);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [params, filters.projectId]);

  const onExportCsv = () => {
    const header = ["date", "words", "projectId", "note"];
    const rows = items.map((x) => [
      x.date ?? "",
      x.words ?? x.wordCount ?? "",
      x.projectId ?? "",
      (x.note ?? "").replace(/\r?\n/g, " "),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "writing-diary.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Writing Diary</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded p-2"
          placeholder="Project Id"
          value={filters.projectId}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
        />
        <input
          type="date"
          className="border rounded p-2"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
        />
        <input
          type="date"
          className="border rounded p-2"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
        />
        <button
          className="border rounded p-2"
          onClick={() => setFilters((f) => ({ ...f, page: 1 }))}>
          Aplicar
        </button>
      </div>

      <div className="mb-3">
        <button className="border rounded px-3 py-2" onClick={onExportCsv}>
          Exportar CSV
        </button>
      </div>

      {loading && <p>Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Words</th>
                <th className="text-left p-2 border">Project</th>
                <th className="text-left p-2 border">Note</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="p-3 border" colSpan={4}>
                    Nenhum registro.
                  </td>
                </tr>
              )}
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{formatDate(it.date)}</td>
                  <td className="p-2 border">{it.words ?? it.wordCount ?? "-"}</td>
                  <td className="p-2 border">{it.projectId ?? "-"}</td>
                  <td className="p-2 border">{it.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  // aceita "2025-10-24", ISO, etc.
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toISOString().slice(0, 10);
  } catch {
    return d;
  }
}

function escapeCsv(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
