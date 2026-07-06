import type { AdaptedStudyMaterialData, StudyCard } from "../components/AdaptedStudyMaterial";

export interface AdaptationPdfInput {
  fileName: string;
  startPage: number;
  endPage: number;
  createdAt: string;
  material: AdaptedStudyMaterialData;
}

type RGB = [number, number, number];

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  ink: [15, 45, 74] as RGB,
  muted: [82, 98, 127] as RGB,
  green: [44, 110, 99] as RGB,
  blueSoft: [238, 247, 255] as RGB,
  greenSoft: [233, 247, 239] as RGB,
  yellowSoft: [255, 247, 223] as RGB,
  white: [255, 255, 255] as RGB,
  border: [216, 226, 234] as RGB,
};

interface PdfBuilder {
  pages: string[];
  content: string;
  y: number;
}

function plainText(value: string): string {
  const normalized = value
    .normalize("NFC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[•✓]/g, "-")
    .replace(/→/g, " -> ")
    .replace(/\s+/g, " ");

  return Array.from(normalized)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code >= 32 && code <= 126) return char;
      if (code >= 160 && code <= 255) return char;
      return "";
    })
    .join("")
    .trim();
}

function escapePdfText(value: string): string {
  return plainText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function encodeWinAnsi(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of Array.from(value)) {
    const code = char.codePointAt(0) ?? 0;
    bytes.push(code >= 0 && code <= 255 ? code : 63);
  }
  return new Uint8Array(bytes);
}

function color([r, g, b]: RGB): string {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

function wrapText(text: string, size: number, width: number): string[] {
  const clean = plainText(text);
  if (!clean) return [];

  const maxChars = Math.max(18, Math.floor(width / (size * 0.48)));
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const wordParts: string[] = [];
    if (word.length > maxChars) {
      for (let index = 0; index < word.length; index += maxChars) {
        wordParts.push(word.slice(index, index + maxChars));
      }
    } else {
      wordParts.push(word);
    }

    for (const part of wordParts) {
      const candidate = current ? `${current} ${part}` : part;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }

      if (current) lines.push(current);
      current = part;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function lineHeight(size: number): number {
  return size * 1.35;
}

function startBuilder(): PdfBuilder {
  return { pages: [], content: "", y: PAGE_HEIGHT - MARGIN };
}

function finishPage(builder: PdfBuilder) {
  if (builder.content.trim()) {
    builder.pages.push(builder.content);
  }
  builder.content = "";
  builder.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(builder: PdfBuilder, height: number) {
  if (builder.y - height < MARGIN) {
    finishPage(builder);
  }
}

function drawText(builder: PdfBuilder, text: string, x: number, y: number, size: number, options?: { bold?: boolean; fill?: RGB }) {
  const font = options?.bold ? "F2" : "F1";
  const fill = color(options?.fill ?? COLORS.ink);
  builder.content += `${fill} rg BT /${font} ${size} Tf ${x} ${Math.round(y)} Td (${escapePdfText(text)}) Tj ET\n`;
}

function drawRect(builder: PdfBuilder, x: number, yTop: number, width: number, height: number, fill: RGB, stroke = COLORS.border) {
  const bottom = yTop - height;
  builder.content += `${color(fill)} rg ${color(stroke)} RG ${x} ${Math.round(bottom)} ${width} ${height} re B\n`;
}

function drawRule(builder: PdfBuilder, y: number, stroke = COLORS.border) {
  builder.content += `${color(stroke)} RG ${MARGIN} ${Math.round(y)} ${CONTENT_WIDTH} 0 m ${MARGIN + CONTENT_WIDTH} ${Math.round(y)} l S\n`;
}

function textHeight(text: string, size: number, width: number): number {
  return wrapText(text, size, width).length * lineHeight(size);
}

function drawWrappedText(builder: PdfBuilder, text: string, x: number, width: number, size: number, options?: { bold?: boolean; fill?: RGB }) {
  for (const line of wrapText(text, size, width)) {
    drawText(builder, line, x, builder.y, size, options);
    builder.y -= lineHeight(size);
  }
}

function drawSectionTitle(builder: PdfBuilder, title: string) {
  ensureSpace(builder, 42);
  drawText(builder, title, MARGIN, builder.y, 16, { bold: true, fill: COLORS.ink });
  builder.y -= 14;
  drawRule(builder, builder.y, COLORS.border);
  builder.y -= 18;
}

function drawBox(builder: PdfBuilder, title: string, body: string, fill: RGB = COLORS.white) {
  const pad = 14;
  const bodyWidth = CONTENT_WIDTH - pad * 2;
  const height = 18 + textHeight(title, 13, bodyWidth) + textHeight(body, 12, bodyWidth) + pad * 2;
  ensureSpace(builder, height + 10);

  const top = builder.y;
  drawRect(builder, MARGIN, top, CONTENT_WIDTH, height, fill);
  builder.y -= pad + 3;
  drawWrappedText(builder, title, MARGIN + pad, bodyWidth, 13, { bold: true, fill: COLORS.ink });
  builder.y -= 5;
  drawWrappedText(builder, body, MARGIN + pad, bodyWidth, 12, { fill: COLORS.muted });
  builder.y = top - height - 12;
}

function drawCards(builder: PdfBuilder, cards: StudyCard[], fill: RGB = COLORS.blueSoft) {
  for (const card of cards.filter((item) => item.title || item.description)) {
    drawBox(builder, card.title || "Ideia importante", card.description || "Revise este ponto.", fill);
  }
}

function drawNumberedList(builder: PdfBuilder, items: string[]) {
  items.filter(Boolean).forEach((item, index) => {
    const pad = 12;
    const numberWidth = 30;
    const bodyWidth = CONTENT_WIDTH - numberWidth - pad * 3;
    const height = Math.max(48, textHeight(item, 12, bodyWidth) + pad * 2);
    ensureSpace(builder, height + 8);

    const top = builder.y;
    drawRect(builder, MARGIN, top, CONTENT_WIDTH, height, COLORS.white);
    drawRect(builder, MARGIN + pad, top - pad, 24, 24, COLORS.green, COLORS.green);
    drawText(builder, String(index + 1), MARGIN + pad + 8, top - pad - 17, 11, { bold: true, fill: COLORS.white });
    builder.y = top - pad - 8;
    drawWrappedText(builder, item, MARGIN + numberWidth + pad * 2, bodyWidth, 12, { fill: COLORS.ink });
    builder.y = top - height - 8;
  });
}

function extractMapLabels(visualMap: string): string[] {
  const labels = Array.from(visualMap.matchAll(/\[([^\]]+)\]/g)).map((match) => plainText(match[1]));
  return labels.filter((label, index) => label && labels.indexOf(label) === index).slice(0, 5);
}

function drawVisualMap(builder: PdfBuilder, material: AdaptedStudyMaterialData) {
  const labels = extractMapLabels(material.visualMap);

  if (!labels.length) {
    drawBox(builder, "Mapa visual", material.visualMap.replace(/graph TD;?/i, "").replace(/-->/g, " -> "), COLORS.greenSoft);
    return;
  }

  const pad = 12;
  const boxHeight = 42;
  const totalHeight = labels.length * boxHeight + (labels.length - 1) * 18 + pad * 2;
  ensureSpace(builder, totalHeight + 10);

  const top = builder.y;
  drawRect(builder, MARGIN, top, CONTENT_WIDTH, totalHeight, COLORS.greenSoft, COLORS.border);
  builder.y -= pad + 6;

  labels.forEach((label, index) => {
    const x = MARGIN + pad;
    const yTop = builder.y;
    drawRect(builder, x, yTop, CONTENT_WIDTH - pad * 2, boxHeight, index === 0 ? COLORS.white : COLORS.blueSoft, COLORS.border);
    drawWrappedText(builder, label, x + 12, CONTENT_WIDTH - pad * 4, 12, { bold: index === 0, fill: COLORS.ink });
    builder.y = yTop - boxHeight - 8;
    if (index < labels.length - 1) {
      drawText(builder, "v", MARGIN + CONTENT_WIDTH / 2 - 4, builder.y + 2, 13, { bold: true, fill: COLORS.green });
      builder.y -= 10;
    }
  });

  builder.y = top - totalHeight - 12;
}

function drawHeader(builder: PdfBuilder, input: AdaptationPdfInput) {
  const height = 116;
  drawRect(builder, MARGIN, builder.y, CONTENT_WIDTH, height, COLORS.greenSoft);
  builder.y -= 20;
  drawWrappedText(builder, input.material.title, MARGIN + 16, CONTENT_WIDTH - 32, 21, { bold: true, fill: COLORS.ink });
  builder.y -= 7;
  drawWrappedText(builder, `Arquivo original: ${input.fileName}`, MARGIN + 16, CONTENT_WIDTH - 32, 11, { fill: COLORS.muted });
  drawWrappedText(builder, `Páginas ${input.startPage}-${input.endPage} · ${formatDate(input.createdAt)}`, MARGIN + 16, CONTENT_WIDTH - 32, 11, { fill: COLORS.muted });
  drawText(builder, "Adaptação acessível para estudo", MARGIN + 16, builder.y - 4, 11, { bold: true, fill: COLORS.green });
  builder.y = PAGE_HEIGHT - MARGIN - height - 22;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPages(input: AdaptationPdfInput): string[] {
  const builder = startBuilder();
  const material = input.material;

  drawHeader(builder, input);

  drawSectionTitle(builder, "Resumo simples");
  drawBox(builder, "O que este trecho explica", material.summary, COLORS.greenSoft);

  drawSectionTitle(builder, "Ideias principais");
  drawCards(builder, material.keyIdeas, COLORS.blueSoft);

  drawSectionTitle(builder, "Passo a passo");
  drawNumberedList(builder, material.steps);

  drawSectionTitle(builder, "Glossário");
  material.glossary.forEach((item) => drawBox(builder, item.term, item.definition, COLORS.white));

  drawSectionTitle(builder, "Mapa visual");
  drawVisualMap(builder, material);

  drawSectionTitle(builder, "Exemplos");
  drawCards(builder, material.examples, COLORS.white);

  if (material.formulas.length) {
    drawSectionTitle(builder, "Fórmulas importantes");
    drawCards(builder, material.formulas, COLORS.yellowSoft);
  }

  drawSectionTitle(builder, "Quiz de revisão");
  material.quiz.forEach((item) => drawBox(builder, item.question, item.answer, COLORS.blueSoft));

  finishPage(builder);
  return builder.pages.length ? builder.pages : ["BT /F1 12 Tf 54 780 Td (Material adaptado) Tj ET\n"];
}

function buildPdfDocument(pageContents: string[]): Uint8Array {
  const objects: string[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const regularFontId = 3;
  const boldFontId = 4;
  const pageIds = pageContents.map((_, index) => 5 + index * 2);
  const contentIds = pageContents.map((_, index) => 6 + index * 2);

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[regularFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[boldFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pageContents.forEach((content, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const contentLength = encodeWinAnsi(content).length;
    objects[pageId] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${contentLength} >>\nstream\n${content}endstream`;
  });

  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let byteLength = 0;

  function append(value: string) {
    const bytes = encodeWinAnsi(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  }

  append("%PDF-1.4\n");
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = byteLength;
    append(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = byteLength;
  append(`xref\n0 ${objects.length}\n`);
  append("0000000000 65535 f \n");
  for (let id = 1; id < objects.length; id += 1) {
    append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    pdfBytes.set(chunk, offset);
    offset += chunk.length;
  }
  return pdfBytes;
}

function safeFilePart(value: string): string {
  return value
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

export function downloadAdaptationPdf(input: AdaptationPdfInput): string {
  const pdfBytes = buildPdfDocument(buildPages(input));
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `adaptacao-${safeFilePart(input.fileName)}-paginas-${input.startPage}-${input.endPage}.pdf`;

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return fileName;
}
