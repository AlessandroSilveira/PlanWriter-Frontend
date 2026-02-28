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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

const PDF_CP1252_MAP = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function getPdfByte(char) {
  const code = char.codePointAt(0);

  if (code >= 32 && code <= 126) return code;
  if (code >= 160 && code <= 255) return code;
  return PDF_CP1252_MAP.get(code) ?? 63;
}

function toPdfLiteralString(value) {
  let text = "(";

  for (const char of String(value ?? "")) {
    const byte = getPdfByte(char);

    if (byte === 40) {
      text += "\\(";
      continue;
    }

    if (byte === 41) {
      text += "\\)";
      continue;
    }

    if (byte === 92) {
      text += "\\\\";
      continue;
    }

    if (byte < 32 || byte > 126) {
      text += `\\${byte.toString(8).padStart(3, "0")}`;
      continue;
    }

    text += String.fromCharCode(byte);
  }

  text += ")";
  return text;
}

const PDF_FONT_RESOURCES = {
  F1: "/Helvetica",
  F2: "/Helvetica-Bold",
  F3: "/Helvetica-Oblique",
  F4: "/Helvetica-BoldOblique",
  F5: "/Courier",
};

let pdfMeasureContext = null;

function getPdfMeasureContext() {
  if (typeof document === "undefined") return null;
  if (pdfMeasureContext) return pdfMeasureContext;

  const canvas = document.createElement("canvas");
  pdfMeasureContext = canvas.getContext("2d");
  return pdfMeasureContext;
}

function getPdfFontKey(format = {}) {
  if (format.code) return "F5";
  if (format.bold && format.italic) return "F4";
  if (format.bold) return "F2";
  if (format.italic) return "F3";
  return "F1";
}

function getPdfFontSize(format = {}, fallback = 12) {
  return Number(format.sizeHalfPoints) > 0 ? Number(format.sizeHalfPoints) / 2 : fallback;
}

function buildPdfCanvasFont(format = {}, fallback = 12) {
  const fontSize = getPdfFontSize(format, fallback);

  if (format.code) {
    return `${fontSize}px "Courier New", monospace`;
  }

  const style = format.italic ? "italic " : "";
  const weight = format.bold ? "700 " : "400 ";
  return `${style}${weight}${fontSize}px Helvetica, Arial, sans-serif`;
}

function measurePdfText(text, format = {}, fallback = 12) {
  const value = String(text ?? "");
  if (!value) return 0;

  const context = getPdfMeasureContext();
  if (context) {
    context.font = buildPdfCanvasFont(format, fallback);
    return context.measureText(value).width;
  }

  const fontSize = getPdfFontSize(format, fallback);
  if (format.code) return value.length * fontSize * 0.6;

  let total = 0;
  for (const char of value) {
    if (char === " ") total += fontSize * 0.28;
    else if (/[ilIjtf]/.test(char)) total += fontSize * 0.28;
    else if (/[mwMW@#%&]/.test(char)) total += fontSize * 0.82;
    else total += fontSize * 0.56;
  }

  return total;
}

function hexToPdfRgb(color, fallback = [0, 0, 0]) {
  const normalized = normalizeHexColor(color);
  if (!normalized) return fallback;

  return [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
  );
}

function pdfRgbCommand(color, operator = "rg", fallback = [0, 0, 0]) {
  const [r, g, b] = hexToPdfRgb(color, fallback);
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${operator}`;
}

function trimPdfWhitespaceSegments(segments, preserveWhitespace = false) {
  if (preserveWhitespace) {
    return segments.map((segment) => ({ ...segment }));
  }

  const normalized = segments.map((segment) => ({ ...segment }));

  while (normalized.length && !normalized[0].lineBreak && /^\s+$/.test(normalized[0].text)) {
    normalized.shift();
  }

  while (
    normalized.length &&
    !normalized[normalized.length - 1].lineBreak &&
    /^\s+$/.test(normalized[normalized.length - 1].text)
  ) {
    normalized.pop();
  }

  return normalized;
}

function mergePdfSegments(segments) {
  return segments.reduce((result, segment) => {
    if (!segment) return result;
    if (segment.lineBreak) {
      result.push({ lineBreak: true });
      return result;
    }

    const value = String(segment.text ?? "");
    if (!value) return result;

    const current = { ...segment, text: value };
    const previous = result[result.length - 1];

    if (
      previous &&
      !previous.lineBreak &&
      previous.bold === current.bold &&
      previous.italic === current.italic &&
      previous.underline === current.underline &&
      previous.strike === current.strike &&
      previous.superscript === current.superscript &&
      previous.subscript === current.subscript &&
      previous.code === current.code &&
      previous.color === current.color &&
      previous.highlightColor === current.highlightColor &&
      previous.sizeHalfPoints === current.sizeHalfPoints
    ) {
      previous.text += current.text;
      return result;
    }

    result.push(current);
    return result;
  }, []);
}

function createPdfParagraphBlock(segments, options = {}) {
  return {
    type: "paragraph",
    segments: mergePdfSegments(segments),
    alignment: options.alignment ?? "left",
    indentLeft: options.indentLeft ?? 0,
    blockGap: options.blockGap ?? 14,
    lineHeightMultiplier: options.lineHeightMultiplier ?? 1.45,
    preserveWhitespace: options.preserveWhitespace ?? false,
    backgroundColor: options.backgroundColor ?? null,
  };
}

function createPdfRuleBlock(options = {}) {
  return {
    type: "rule",
    indentLeft: options.indentLeft ?? 0,
    blockGap: options.blockGap ?? 16,
    color: options.color ?? "C9B39B",
  };
}

function collectPdfSegmentsFromNodes(nodes, format = {}, options = {}) {
  return nodes.flatMap((node) => collectPdfSegments(node, format, options));
}

function collectPdfSegments(node, format = {}, options = {}) {
  if (!node) return [];

  if (node.nodeType === 3) {
    let value = String(node.nodeValue ?? "").replace(/\u00a0/g, " ");
    if (!options.preserveWhitespace) {
      value = value.replace(/\r?\n/g, " ");
    }

    return value ? [{ ...format, text: value }] : [];
  }

  if (node.nodeType !== 1) return [];

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return [{ lineBreak: true }];

  if (tag === "img") {
    const label =
      node.getAttribute("alt")?.trim() || node.getAttribute("src")?.trim() || "Imagem";

    return [
      {
        ...format,
        italic: true,
        color: "666666",
        text: `[${label}]`,
      },
    ];
  }

  const nextFormat = applyInlineFormatting(node, format);
  return collectPdfSegmentsFromNodes(Array.from(node.childNodes), nextFormat, options);
}

function listItemToPdfBlocks(item, prefix, depth = 0) {
  const children = Array.from(item.childNodes);
  const nestedLists = children.filter(
    (child) => child.nodeType === 1 && ["ul", "ol"].includes(child.tagName.toLowerCase())
  );
  const inlineNodes = children.filter(
    (child) => !(child.nodeType === 1 && ["ul", "ol"].includes(child.tagName.toLowerCase()))
  );

  const blocks = [
    createPdfParagraphBlock(
      [{ text: prefix }, ...collectPdfSegmentsFromNodes(inlineNodes)],
      {
        indentLeft: 20 + depth * 16,
        blockGap: 10,
      }
    ),
  ];

  nestedLists.forEach((list) => {
    blocks.push(...listToPdfBlocks(list, list.tagName.toLowerCase() === "ol", depth + 1));
  });

  return blocks;
}

function listToPdfBlocks(list, ordered, depth = 0) {
  const items = Array.from(list.children).filter(
    (child) => child.nodeType === 1 && child.tagName.toLowerCase() === "li"
  );

  return items.flatMap((item, index) =>
    listItemToPdfBlocks(item, ordered ? `${index + 1}. ` : "• ", depth)
  );
}

function nodeToPdfBlocks(node) {
  if (!node) return [];

  if (node.nodeType === 3) {
    const value = String(node.nodeValue ?? "").trim();
    return value ? [createPdfParagraphBlock([{ text: value }], { blockGap: 12 })] : [];
  }

  if (node.nodeType !== 1) return [];

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes);
  const alignment = getAlignment(node) ?? "left";

  if (tag === "ul" || tag === "ol") {
    return listToPdfBlocks(node, tag === "ol");
  }

  if (tag === "pre") {
    return normalizeText(node.textContent)
      .split("\n")
      .map((line) =>
        createPdfParagraphBlock([{ text: line || " ", code: true }], {
          indentLeft: 14,
          blockGap: 6,
          lineHeightMultiplier: 1.35,
          preserveWhitespace: true,
          backgroundColor: "F7F3EC",
        })
      );
  }

  if (tag === "blockquote") {
    return [
      createPdfParagraphBlock(
        collectPdfSegmentsFromNodes(children, { italic: true, color: "4B5563" }),
        {
          indentLeft: 24,
          blockGap: 14,
          lineHeightMultiplier: 1.45,
          alignment,
        }
      ),
    ];
  }

  if (tag === "hr") {
    return [createPdfRuleBlock()];
  }

  if (tag === "h1") {
    return [
      createPdfParagraphBlock(
        collectPdfSegmentsFromNodes(children, { bold: true, sizeHalfPoints: 34 }),
        {
          blockGap: 14,
          lineHeightMultiplier: 1.2,
          alignment,
        }
      ),
    ];
  }

  if (tag === "h2") {
    return [
      createPdfParagraphBlock(
        collectPdfSegmentsFromNodes(children, { bold: true, sizeHalfPoints: 28 }),
        {
          blockGap: 12,
          lineHeightMultiplier: 1.25,
          alignment,
        }
      ),
    ];
  }

  if (tag === "div") {
    const hasBlockChildren = children.some(
      (child) =>
        child.nodeType === 1 &&
        ["p", "div", "h1", "h2", "blockquote", "pre", "ul", "ol", "hr"].includes(
          child.tagName.toLowerCase()
        )
    );

    if (hasBlockChildren) {
      return children.flatMap((child) => nodeToPdfBlocks(child));
    }
  }

  return [
    createPdfParagraphBlock(collectPdfSegmentsFromNodes(children), {
      blockGap: 12,
      lineHeightMultiplier: 1.45,
      alignment,
    }),
  ];
}

function htmlToPdfBlocks(html) {
  const sanitized = sanitizeRichTextHtml(html);

  if (typeof DOMParser === "undefined") {
    return normalizeText(sanitized.replace(/<[^>]+>/g, " "))
      .split("\n")
      .map((line) => createPdfParagraphBlock([{ text: line || " " }], { blockGap: 12 }));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  if (!root) {
    return [createPdfParagraphBlock([{ text: " " }])];
  }

  const blocks = Array.from(root.childNodes).flatMap((node) => nodeToPdfBlocks(node));
  return blocks.length ? blocks : [createPdfParagraphBlock([{ text: " " }])];
}

function splitPdfTokenToFit(text, format, maxWidth, fallback = 12) {
  if (!text) return "";

  let piece = "";
  for (const char of text) {
    const candidate = `${piece}${char}`;
    if (measurePdfText(candidate, format, fallback) <= maxWidth || !piece) {
      piece = candidate;
      continue;
    }

    break;
  }

  return piece || text[0];
}

function tokenizePdfText(text, preserveWhitespace = false) {
  const value = String(text ?? "");
  if (!value) return [];

  const pattern = preserveWhitespace ? /[^\S\n]+|\n|[^\s\n]+/g : /\S+|\s+/g;
  return value.match(pattern) ?? [];
}

function layoutPdfParagraph(block, availableWidth) {
  const lines = [];
  let current = [];
  let currentWidth = 0;

  const commitLine = (force = false) => {
    const segments = trimPdfWhitespaceSegments(current, block.preserveWhitespace);
    if (segments.length || force || !lines.length) {
      const width = segments.reduce(
        (sum, segment) => sum + (segment.lineBreak ? 0 : measurePdfText(segment.text, segment)),
        0
      );
      lines.push({ segments, width });
    }
    current = [];
    currentWidth = 0;
  };

  const pushSegment = (segment) => {
    const width = measurePdfText(segment.text, segment);
    current.push(segment);
    currentWidth += width;
  };

  for (const segment of block.segments) {
    if (segment.lineBreak) {
      commitLine(true);
      continue;
    }

    const tokens = tokenizePdfText(segment.text, block.preserveWhitespace);
    for (const token of tokens) {
      if (token === "\n") {
        commitLine(true);
        continue;
      }

      const whitespace = /^\s+$/.test(token);
      let remaining = whitespace && !block.preserveWhitespace ? " " : token;
      if (!remaining) continue;

      while (remaining) {
        if (/^\s+$/.test(remaining) && current.length === 0) {
          remaining = "";
          break;
        }

        const targetWidth = current.length ? availableWidth - currentWidth : availableWidth;
        const remainingWidth = measurePdfText(remaining, segment);

        if (remainingWidth <= targetWidth && remainingWidth <= availableWidth) {
          pushSegment({ ...segment, text: remaining });
          remaining = "";
          continue;
        }

        if (/^\s+$/.test(remaining)) {
          commitLine();
          remaining = "";
          continue;
        }

        const fitWidth = targetWidth > 0 ? targetWidth : availableWidth;
        const chunk = splitPdfTokenToFit(remaining, segment, fitWidth);

        if (!chunk) {
          if (current.length) {
            commitLine();
            continue;
          }

          pushSegment({ ...segment, text: remaining[0] });
          remaining = remaining.slice(1);
          commitLine();
          continue;
        }

        pushSegment({ ...segment, text: chunk });
        remaining = remaining.slice(chunk.length);

        if (remaining) {
          commitLine();
        }
      }
    }
  }

  if (current.length || !lines.length) {
    commitLine();
  }

  return lines;
}

function getPdfLineHeight(line, block) {
  const maxFontSize = Math.max(
    12,
    ...line.segments.map((segment) => getPdfFontSize(segment, 12))
  );
  return maxFontSize * (block.lineHeightMultiplier ?? 1.45);
}

function buildPdfDocumentFromPages(pages) {
  const encoder = new TextEncoder();
  const pageWidth = 595;
  const pageHeight = 842;
  const objects = new Map();
  const catalogId = 1;
  const pagesId = 2;
  let nextId = 3;

  const fontIds = Object.fromEntries(
    Object.keys(PDF_FONT_RESOURCES).map((key) => [key, nextId++])
  );

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

  Object.entries(PDF_FONT_RESOURCES).forEach(([key, baseFont]) => {
    objects.set(fontIds[key], `<< /Type /Font /Subtype /Type1 /BaseFont ${baseFont} >>`);
  });

  const fontResourceList = Object.entries(fontIds)
    .map(([key, id]) => `/${key} ${id} 0 R`)
    .join(" ");

  pages.forEach((page, index) => {
    const stream = page.join("\n");
    const contentId = contentIds[index];
    const pageId = pageIds[index];

    objects.set(
      contentId,
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << ${fontResourceList} >> >> /Contents ${contentId} 0 R >>`
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

function buildRichPdfBlobFromBlocks(blocks) {
  const pageWidth = 595;
  const top = 792;
  const left = 48;
  const right = 48;
  const bottom = 56;
  const contentWidth = pageWidth - left - right;

  const pages = [[]];
  let currentPage = pages[0];
  let y = top;

  const ensurePage = (requiredHeight = 16) => {
    if (y - requiredHeight >= bottom) return;
    currentPage = [];
    pages.push(currentPage);
    y = top;
  };

  blocks.forEach((block) => {
    if (block.type === "rule") {
      ensurePage(18);
      const lineY = y - 4;
      const startX = left + block.indentLeft;
      const endX = pageWidth - right;
      currentPage.push(
        `${pdfRgbCommand(block.color, "RG")} 0.8 w ${startX.toFixed(2)} ${lineY.toFixed(2)} m ${endX.toFixed(2)} ${lineY.toFixed(2)} l S`
      );
      y -= block.blockGap;
      return;
    }

    const availableWidth = contentWidth - block.indentLeft;
    const lines = layoutPdfParagraph(block, availableWidth);

    lines.forEach((line, index) => {
      const lineHeight = getPdfLineHeight(line, block);
      ensurePage(lineHeight + 4);

      const freeSpace = Math.max(0, availableWidth - line.width);
      const offsetX =
        block.alignment === "center"
          ? freeSpace / 2
          : block.alignment === "right"
          ? freeSpace
          : 0;

      let x = left + block.indentLeft + offsetX;
      const baselineY = y;

      if (block.backgroundColor) {
        const rectHeight = Math.max(lineHeight * 0.88, 16);
        const rectY = baselineY - rectHeight * 0.72;
        currentPage.push(
          `${pdfRgbCommand(block.backgroundColor)} ${(left + block.indentLeft - 4).toFixed(2)} ${rectY.toFixed(2)} ${(availableWidth + 8).toFixed(2)} ${rectHeight.toFixed(2)} re f`
        );
      }

      line.segments.forEach((segment) => {
        const value = String(segment.text ?? "");
        if (!value) return;

        const fontKey = getPdfFontKey(segment);
        const fontSize = getPdfFontSize(segment, 12);
        const textWidth = measurePdfText(value, segment, 12);
        const textColor = segment.color ?? "000000";
        const baselineOffset = segment.superscript
          ? fontSize * 0.32
          : segment.subscript
          ? -fontSize * 0.18
          : 0;
        const textY = baselineY + baselineOffset;

        if (segment.highlightColor) {
          const highlightHeight = Math.max(fontSize * 0.95, 12);
          const highlightY = textY - fontSize * 0.28;
          currentPage.push(
            `${pdfRgbCommand(segment.highlightColor)} ${x.toFixed(2)} ${highlightY.toFixed(2)} ${textWidth.toFixed(2)} ${highlightHeight.toFixed(2)} re f`
          );
        }

        currentPage.push(
          `BT\n/${fontKey} ${fontSize.toFixed(2)} Tf\n${pdfRgbCommand(textColor)}\n1 0 0 1 ${x.toFixed(2)} ${textY.toFixed(2)} Tm\n${toPdfLiteralString(value)} Tj\nET`
        );

        if (segment.underline) {
          const underlineY = textY - Math.max(1.1, fontSize * 0.14);
          currentPage.push(
            `${pdfRgbCommand(textColor, "RG")} 0.7 w ${x.toFixed(2)} ${underlineY.toFixed(2)} m ${(x + textWidth).toFixed(2)} ${underlineY.toFixed(2)} l S`
          );
        }

        if (segment.strike) {
          const strikeY = textY + fontSize * 0.28;
          currentPage.push(
            `${pdfRgbCommand(textColor, "RG")} 0.7 w ${x.toFixed(2)} ${strikeY.toFixed(2)} m ${(x + textWidth).toFixed(2)} ${strikeY.toFixed(2)} l S`
          );
        }

        x += textWidth;
      });

      y -= lineHeight;
      if (index === lines.length - 1) {
        y -= block.blockGap;
      }
    });
  });

  const normalizedPages = pages.filter((page) => page.length);
  return buildPdfDocumentFromPages(normalizedPages.length ? normalizedPages : [[]]);
}

function buildPdfBlob(text, title) {
  const blocks = [
    createPdfParagraphBlock([{ text: title, bold: true, sizeHalfPoints: 32 }], {
      blockGap: 12,
      lineHeightMultiplier: 1.25,
    }),
    createPdfParagraphBlock(
      [
        {
          text: `Exportado em ${new Date().toLocaleString("pt-BR")}`,
          color: "666666",
          sizeHalfPoints: 20,
        },
      ],
      {
        blockGap: 18,
        lineHeightMultiplier: 1.2,
      }
    ),
    ...normalizeText(text)
      .split("\n")
      .flatMap((line) => wrapLine(line, 86))
      .map((line) => createPdfParagraphBlock([{ text: line || " " }], { blockGap: 8 })),
  ];

  return buildRichPdfBlobFromBlocks(blocks);
}

function buildRichPdfBlob(html, title) {
  const blocks = [
    createPdfParagraphBlock([{ text: title, bold: true, sizeHalfPoints: 32 }], {
      blockGap: 12,
      lineHeightMultiplier: 1.25,
    }),
    createPdfParagraphBlock(
      [
        {
          text: `Exportado em ${new Date().toLocaleString("pt-BR")}`,
          color: "666666",
          sizeHalfPoints: 20,
        },
      ],
      {
        blockGap: 18,
        lineHeightMultiplier: 1.2,
      }
    ),
    ...htmlToPdfBlocks(html),
  ];

  return buildRichPdfBlobFromBlocks(blocks);
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

function shouldPreserveSpace(text) {
  return /^\s|\s$|\s{2,}/.test(text);
}

function mapFontSize(value) {
  const sizeMap = {
    1: 16,
    2: 20,
    3: 24,
    4: 28,
    5: 36,
    6: 48,
    7: 56,
  };

  return sizeMap[Number(value)] ?? null;
}

function normalizeHexColor(color) {
  if (!color) return null;

  const trimmed = String(color).trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const [, hex] = hexMatch;
    if (hex.length === 3) {
      return hex
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
        .toUpperCase();
    }

    return hex.toUpperCase();
  }

  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgbMatch) return null;

  return rgbMatch
    .slice(1, 4)
    .map((value) => Number(value).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function toWordHighlight(color) {
  if (!color) return null;

  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  const mapping = {
    "FFFF00": "yellow",
    "FFEB3B": "yellow",
    "00FF00": "green",
    "00FFFF": "cyan",
    "FF00FF": "magenta",
    "0000FF": "blue",
    "FF0000": "red",
    "C0C0C0": "lightGray",
    "808080": "darkGray",
  };

  return mapping[normalized] ?? "yellow";
}

function createTextRun(text, format = {}) {
  const content = String(text ?? "");
  if (!content) return "";

  const properties = [];
  if (format.bold) properties.push("<w:b/>");
  if (format.italic) properties.push("<w:i/>");
  if (format.underline) properties.push('<w:u w:val="single"/>');
  if (format.strike) properties.push("<w:strike/>");
  if (format.superscript) properties.push('<w:vertAlign w:val="superscript"/>');
  if (format.subscript) properties.push('<w:vertAlign w:val="subscript"/>');
  if (format.color) properties.push(`<w:color w:val="${format.color}"/>`);
  if (format.highlight) {
    properties.push(`<w:highlight w:val="${format.highlight}"/>`);
  }
  if (format.sizeHalfPoints) {
    properties.push(`<w:sz w:val="${format.sizeHalfPoints}"/>`);
    properties.push(`<w:szCs w:val="${format.sizeHalfPoints}"/>`);
  }
  if (format.code) {
    properties.push('<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>');
  }

  const space = shouldPreserveSpace(content) ? ' xml:space="preserve"' : "";
  return `<w:r>${properties.length ? `<w:rPr>${properties.join("")}</w:rPr>` : ""}<w:t${space}>${escapeXml(
    content
  )}</w:t></w:r>`;
}

function createBreakRun() {
  return "<w:r><w:br/></w:r>";
}

function createParagraph(runs, options = {}) {
  const paragraphRuns = runs.filter(Boolean);
  const properties = [];

  if (options.alignment) {
    properties.push(`<w:jc w:val="${options.alignment}"/>`);
  }

  if (
    options.spacingBefore != null ||
    options.spacingAfter != null ||
    options.lineSpacing != null
  ) {
    const attrs = [];
    if (options.spacingBefore != null) attrs.push(`w:before="${options.spacingBefore}"`);
    if (options.spacingAfter != null) attrs.push(`w:after="${options.spacingAfter}"`);
    if (options.lineSpacing != null) attrs.push(`w:line="${options.lineSpacing}"`);
    properties.push(`<w:spacing ${attrs.join(" ")}/>`);
  }

  if (options.indentLeft != null || options.indentHanging != null) {
    const attrs = [];
    if (options.indentLeft != null) attrs.push(`w:left="${options.indentLeft}"`);
    if (options.indentHanging != null) attrs.push(`w:hanging="${options.indentHanging}"`);
    properties.push(`<w:ind ${attrs.join(" ")}/>`);
  }

  if (options.shading) {
    properties.push(`<w:shd w:val="clear" w:color="auto" w:fill="${options.shading}"/>`);
  }

  return `<w:p>${properties.length ? `<w:pPr>${properties.join("")}</w:pPr>` : ""}${
    paragraphRuns.length ? paragraphRuns.join("") : createTextRun(" ")
  }</w:p>`;
}

function applyInlineFormatting(node, baseFormat = {}) {
  if (node.nodeType !== 1) return baseFormat;

  const tag = node.tagName.toLowerCase();
  const next = { ...baseFormat };

  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  if (tag === "sup") next.superscript = true;
  if (tag === "sub") next.subscript = true;
  if (tag === "code") next.code = true;
  if (tag === "a") {
    next.underline = true;
    next.color = next.color ?? "0563C1";
  }

  const fontSize = mapFontSize(node.getAttribute("size"));
  if (fontSize) next.sizeHalfPoints = fontSize;

  const color = normalizeHexColor(node.style?.color || node.getAttribute("color"));
  if (color) next.color = color;

  const backgroundColor = node.style?.backgroundColor;
  const highlight = toWordHighlight(backgroundColor);
  if (highlight) next.highlight = highlight;

  const highlightColor = normalizeHexColor(backgroundColor);
  if (highlightColor) next.highlightColor = highlightColor;

  if (/(bold|[5-9]00)/i.test(node.style?.fontWeight || "")) next.bold = true;
  if (/italic/i.test(node.style?.fontStyle || "")) next.italic = true;
  if (/underline/i.test(node.style?.textDecoration || "")) next.underline = true;
  if (/line-through/i.test(node.style?.textDecoration || "")) next.strike = true;
  if (/super/i.test(node.style?.verticalAlign || "")) next.superscript = true;
  if (/sub/i.test(node.style?.verticalAlign || "")) next.subscript = true;

  return next;
}

function collectRunsFromNodes(nodes, format = {}, options = {}) {
  return nodes.flatMap((node) => collectRuns(node, format, options));
}

function collectRuns(node, format = {}, options = {}) {
  if (!node) return [];

  if (node.nodeType === 3) {
    let text = String(node.nodeValue ?? "").replace(/\u00a0/g, " ");
    if (!options.preserveWhitespace) {
      text = text.replace(/\r?\n/g, " ");
    }

    return text ? [createTextRun(text, format)] : [];
  }

  if (node.nodeType !== 1) return [];

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return [createBreakRun()];

  if (tag === "img") {
    const label =
      node.getAttribute("alt")?.trim() || node.getAttribute("src")?.trim() || "Imagem";
    return [createTextRun(`[${label}]`, { ...format, italic: true, color: "666666" })];
  }

  const nextFormat = applyInlineFormatting(node, format);
  return collectRunsFromNodes(Array.from(node.childNodes), nextFormat, options);
}

function getAlignment(element) {
  const align = element?.style?.textAlign;
  if (align === "center") return "center";
  if (align === "right") return "right";
  if (align === "justify") return "both";
  return null;
}

function listItemToParagraphs(item, prefix, depth = 0) {
  const children = Array.from(item.childNodes);
  const nestedLists = children.filter(
    (child) => child.nodeType === 1 && ["ul", "ol"].includes(child.tagName.toLowerCase())
  );
  const inlineNodes = children.filter(
    (child) => !(child.nodeType === 1 && ["ul", "ol"].includes(child.tagName.toLowerCase()))
  );

  const paragraphs = [
    createParagraph([createTextRun(prefix), ...collectRunsFromNodes(inlineNodes)], {
      indentLeft: 720 + depth * 360,
      indentHanging: 360,
      spacingAfter: 100,
    }),
  ];

  nestedLists.forEach((list) => {
    paragraphs.push(...listToParagraphs(list, list.tagName.toLowerCase() === "ol", depth + 1));
  });

  return paragraphs;
}

function listToParagraphs(list, ordered, depth = 0) {
  const items = Array.from(list.children).filter(
    (child) => child.nodeType === 1 && child.tagName.toLowerCase() === "li"
  );

  return items.flatMap((item, index) =>
    listItemToParagraphs(item, ordered ? `${index + 1}. ` : "• ", depth)
  );
}

function nodeToParagraphs(node) {
  if (!node) return [];

  if (node.nodeType === 3) {
    const text = String(node.nodeValue ?? "").trim();
    return text ? [createParagraph([createTextRun(text)], { spacingAfter: 120 })] : [];
  }

  if (node.nodeType !== 1) return [];

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes);

  if (tag === "ul" || tag === "ol") {
    return listToParagraphs(node, tag === "ol");
  }

  if (tag === "pre") {
    return normalizeText(node.textContent)
      .split("\n")
      .map((line) =>
        createParagraph([createTextRun(line || " ", { code: true })], {
          indentLeft: 240,
          spacingAfter: 80,
          lineSpacing: 320,
          shading: "F7F3EC",
        })
      );
  }

  if (tag === "blockquote") {
    return [
      createParagraph(collectRunsFromNodes(children, { italic: true, color: "4B5563" }), {
        indentLeft: 720,
        spacingAfter: 140,
        lineSpacing: 320,
        alignment: getAlignment(node),
      }),
    ];
  }

  if (tag === "hr") {
    return [
      createParagraph([createTextRun("────────────────────────", { color: "999999" })], {
        alignment: "center",
        spacingAfter: 140,
      }),
    ];
  }

  if (tag === "h1") {
    return [
      createParagraph(collectRunsFromNodes(children, { bold: true, sizeHalfPoints: 34 }), {
        spacingBefore: 180,
        spacingAfter: 140,
        alignment: getAlignment(node),
      }),
    ];
  }

  if (tag === "h2") {
    return [
      createParagraph(collectRunsFromNodes(children, { bold: true, sizeHalfPoints: 28 }), {
        spacingBefore: 160,
        spacingAfter: 120,
        alignment: getAlignment(node),
      }),
    ];
  }

  if (tag === "div") {
    const hasBlockChildren = children.some(
      (child) =>
        child.nodeType === 1 && ["p", "div", "h1", "h2", "blockquote", "pre", "ul", "ol", "hr"].includes(child.tagName.toLowerCase())
    );

    if (hasBlockChildren) {
      return children.flatMap((child) => nodeToParagraphs(child));
    }
  }

  return [
    createParagraph(collectRunsFromNodes(children), {
      spacingAfter: 120,
      lineSpacing: 320,
      alignment: getAlignment(node),
    }),
  ];
}

function htmlToParagraphs(html) {
  const sanitized = sanitizeRichTextHtml(html);

  if (typeof DOMParser === "undefined") {
    return normalizeText(sanitized.replace(/<[^>]+>/g, " "))
      .split("\n")
      .map((line) => createParagraph([createTextRun(line || " ")], { spacingAfter: 120 }));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  if (!root) {
    return [createParagraph([createTextRun(" ")])];
  }

  const paragraphs = Array.from(root.childNodes).flatMap((node) => nodeToParagraphs(node));
  return paragraphs.length ? paragraphs : [createParagraph([createTextRun(" ")])];
}

function buildDocumentXml(paragraphs, title) {
  const now = new Date().toLocaleString("pt-BR");
  const content = [
    createParagraph([createTextRun(title, { bold: true, sizeHalfPoints: 32 })], {
      spacingAfter: 80,
    }),
    createParagraph(
      [createTextRun(`Exportado em ${now}`, { sizeHalfPoints: 20, color: "666666" })],
      { spacingAfter: 200 }
    ),
    ...paragraphs,
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function buildZipBlob(entries) {
  const encoder = new TextEncoder();
  const normalizedEntries = entries.map((entry) => ({
    name: entry.name,
    data: entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data),
  }));

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, date } = getDosDateTime();

  normalizedEntries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const entryCrc = crc32(entry.data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, entryCrc);
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, entryCrc);
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  });

  const centralDirectory = concatUint8Arrays(centralParts);
  const centralDirectoryOffset = offset;
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, normalizedEntries.length);
  writeUint16(endView, 10, normalizedEntries.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, centralDirectoryOffset);
  writeUint16(endView, 20, 0);

  return new Blob(
    [concatUint8Arrays([...localParts, centralDirectory, endRecord])],
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
  );
}

function buildDocxBlob(paragraphs, title) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return buildZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: buildDocumentXml(paragraphs, title) },
  ]);
}

function buildDocxFromText(text, title) {
  const paragraphs = normalizeText(text)
    .split("\n")
    .map((line) => createParagraph([createTextRun(line || " ")], { spacingAfter: 120 }));

  return buildDocxBlob(paragraphs, title);
}

function buildDocxFromHtml(html, title) {
  return buildDocxBlob(htmlToParagraphs(html), title);
}

export function exportTextAsTxt(text, filename = buildSprintFilename("txt")) {
  const blob = new Blob([normalizeText(text)], {
    type: "text/plain;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

export function exportTextAsDoc(
  text,
  filename = buildSprintFilename("docx"),
  title = "Word Sprint"
) {
  const blob = buildDocxFromText(text, title);
  triggerDownload(filename, blob);
}

export function exportHtmlAsDoc(
  html,
  filename = buildSprintFilename("docx"),
  title = "Word Sprint"
) {
  const blob = buildDocxFromHtml(html, title);
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

export function exportHtmlAsPdf(
  html,
  filename = buildSprintFilename("pdf"),
  title = "Word Sprint"
) {
  const blob = buildRichPdfBlob(html, title);
  triggerDownload(filename, blob);
}
