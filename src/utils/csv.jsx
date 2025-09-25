// Gera e baixa um CSV no navegador
export function downloadCSV(filename, headers, rows) {
  const escapeCell = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // se contém separador, aspas ou quebra de linha, envolve em aspas e escapa aspas internas
    if (/[",\n;]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const sep = ";"; // pt-BR costuma usar ; como separador
  const headerLine = headers.map(escapeCell).join(sep);
  const dataLines = rows.map((r) => r.map(escapeCell).join(sep));
  const csv = [headerLine, ...dataLines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
