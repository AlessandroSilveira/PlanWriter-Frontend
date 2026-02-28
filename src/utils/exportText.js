function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export function buildSprintFilename(extension, date = new Date()) {
  return `word-sprint-${buildTimestamp(date)}.${extension}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");
}

function wrapLine(line, maxChars = 86) {
  if (!line) return [""];

  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = "";

  const pushWord = (word) => {
    if (!current) {
      current = word;
      return;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  };

  for (const word of words) {
    if (word.length <= maxChars) {
      pushWord(word);
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    for (let index = 0; index < word.length; index += maxChars) {
      lines.push(word.slice(index, index + maxChars));
    }
  }

  if (current) lines.push(current);
  return lines;
}

function toPdfHex(value) {
  const text = String(value ?? "");
  let hex = "FEFF";

  for (let index = 0; index < text.length; index += 1) {
    hex += text.charCodeAt(index).toString(16).padStart(4, "0");
  }

  return `<${hex.toUpperCase()}>`;
}

function buildPdfBlob(text, title) {
  const encoder = new TextEncoder();
  const pageWidth = 595;
  const pageHeight = 842;
  const top = 792;
  const left = 48;
  const bottom = 56;

  const entries = [
    { text: title, fontSize: 16, step: 24 },
    {
      text: `Exportado em ${new Date().toLocaleString("pt-BR")}`,
      fontSize: 10,
      step: 20,
    },
    { text: "", fontSize: 12, step: 16 },
    ...normalizeText(text)
      .split("\n")
      .flatMap((line) => wrapLine(line, 86))
      .map((line) => ({ text: line, fontSize: 12, step: 16 })),
  ];

  const pages = [];
  let current = [];
  let y = top;

  for (const entry of entries) {
    if (y < bottom) {
      pages.push(current);
      current = [];
      y = top;
    }

    current.push({ ...entry, y });
    y -= entry.step;
  }

  if (current.length) {
    pages.push(current);
  }

  const objects = new Map();
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let nextId = 4;

  const contentIds = [];
  const pageIds = [];
  for (let index = 0; index < pages.length; index += 1) {
    contentIds.push(nextId++);
    pageIds.push(nextId++);
  }

  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects.set(
    pagesId,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`
  );
  objects.set(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  pages.forEach((page, index) => {
    const stream = page
      .map(
        (line) =>
          `BT\n/F1 ${line.fontSize} Tf\n1 0 0 1 ${left} ${line.y} Tm\n${toPdfHex(
            line.text
          )} Tj\nET`
      )
      .join("\n");

    const contentId = contentIds[index];
    const pageId = pageIds[index];

    objects.set(
      contentId,
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  const ids = Array.from(objects.keys()).sort((a, b) => a - b);

  for (const id of ids) {
    offsets[id] = encoder.encode(pdf).length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${ids.length + 1}\n0000000000 65535 f \n`;
  for (const id of ids) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${ids.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildDocHtml(content, title) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Georgia, serif; margin: 32px; color: #1f2937; }
      h1 { margin-bottom: 8px; }
      p.meta { color: #555; margin-bottom: 24px; }
      article { font-size: 12pt; line-height: 1.7; }
      article h1, article h2 { margin-top: 24px; margin-bottom: 12px; }
      article p { margin: 0 0 14px; }
      article ul, article ol { margin: 0 0 16px 24px; }
      article blockquote {
        margin: 0 0 16px;
        padding-left: 16px;
        border-left: 4px solid #caa46b;
        color: #374151;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Exportado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
    <article>${content}</article>
  </body>
</html>`;
}

function sanitizeRichTextHtml(html) {
  const raw = String(html ?? "").trim();
  if (!raw) return "<p></p>";

  if (typeof DOMParser === "undefined") {
    return `<p>${escapeHtml(raw)}</p>`;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  if (!root) {
    return "<p></p>";
  }

  root.querySelectorAll("script, style").forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return root.innerHTML || "<p></p>";
}

export function exportTextAsTxt(text, filename = buildSprintFilename("txt")) {
  const blob = new Blob([normalizeText(text)], {
    type: "text/plain;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

export function exportTextAsDoc(
  text,
  filename = buildSprintFilename("doc"),
  title = "Word Sprint"
) {
  const html = buildDocHtml(
    `<pre style="white-space: pre-wrap; word-break: break-word; font-family: Georgia, serif; margin: 0;">${escapeHtml(
      normalizeText(text)
    )}</pre>`,
    title
  );

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

export function exportHtmlAsDoc(
  html,
  filename = buildSprintFilename("doc"),
  title = "Word Sprint"
) {
  const blob = new Blob(["\ufeff", buildDocHtml(sanitizeRichTextHtml(html), title)], {
    type: "application/msword;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

export function exportTextAsPdf(
  text,
  filename = buildSprintFilename("pdf"),
  title = "Word Sprint"
) {
  const blob = buildPdfBlob(text, title);
  triggerDownload(filename, blob);
}
