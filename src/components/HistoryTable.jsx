import { Skeleton } from "./Skeleton";

export default function HistoryTable({ loading, rows }) {
  if (loading) {
    return (
      <div className="mt-3">
        <div className="grid grid-cols-6 gap-2 text-xs text-muted mb-2">
          <div>Data</div><div>Projeto</div><div>Evento</div><div>Fonte</div><div className="text-right">Δ Palavras</div><div>Notas</div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-2">
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b">
            <th className="py-2 pr-2">Data</th>
            <th className="py-2 pr-2">Projeto</th>
            <th className="py-2 pr-2">Evento</th>
            <th className="py-2 pr-2">Fonte</th>
            <th className="py-2 pr-2 text-right">Δ Palavras</th>
            <th className="py-2 pr-2">Notas</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => {
            const key = `${r.id ?? r.Id ?? i}-${r.createdAt ?? r.date ?? r.dateUtc ?? i}`;
            return (
              <tr key={key} className="border-b last:border-0 align-top">
                <td className="py-2 pr-2 whitespace-nowrap">{r.dateFmt}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{r.projectTitle ?? "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{r.eventName ?? "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{r.source ?? "—"}</td>
                <td className="py-2 pr-2 text-right">{(r.deltaWords || 0).toLocaleString("pt-BR")}</td>
                <td className="py-2 pr-2 max-w-[480px]">
                  <div className="truncate" title={r.notes ?? ""}>{r.notes ?? "—"}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
