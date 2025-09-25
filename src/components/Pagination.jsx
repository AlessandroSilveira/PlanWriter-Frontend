export default function Pagination({
  page,         // 1-based
  pageSize,
  total,        // total items
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 10)));

  const goto = (p) => {
    const clamped = Math.min(totalPages, Math.max(1, p));
    if (clamped !== page) onPageChange?.(clamped);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted">
        Página <b>{page}</b> de <b>{totalPages}</b> • {total || 0} registros
      </div>

      <div className="flex items-center gap-2">
        <button className="button" onClick={() => goto(1)} disabled={page <= 1}>«</button>
        <button className="button" onClick={() => goto(page - 1)} disabled={page <= 1}>Anterior</button>
        <button className="button" onClick={() => goto(page + 1)} disabled={page >= totalPages}>Próxima</button>
        <button className="button" onClick={() => goto(totalPages)} disabled={page >= totalPages}>»</button>

        <select
          className="input ml-2"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          title="Itens por página"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n} / pág.</option>
          ))}
        </select>
      </div>
    </div>
  );
}
