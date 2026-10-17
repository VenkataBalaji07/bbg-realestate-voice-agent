// Client-side contact file parsing. Libraries are loaded lazily so the UI stays responsive.
import { normalizePhone } from "./phone";

export const MAX_FILE_MB = 10;
export const MAX_ROWS = 5000;

export interface RawTable { headers: string[]; rows: string[][]; fileType: "csv" | "xlsx" | "xls" | "pdf"; notice?: string }

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

export async function parseFile(file: File): Promise<RawTable> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`File is larger than ${MAX_FILE_MB} MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCsv(file);
  if (ext === "xlsx" || ext === "xls") return parseExcel(file, ext);
  if (ext === "pdf") return parsePdf(file);
  throw new Error("Unsupported file type. Use CSV, XLSX, XLS or PDF.");
}

async function parseCsv(file: File): Promise<RawTable> {
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const data = res.data.map((r) => r.map((c) => String(c ?? "").trim()));
  return toTable(data, "csv");
}

async function parseExcel(file: File, ext: "xlsx" | "xls"): Promise<RawTable> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  await yieldFrame();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!ws) throw new Error("No sheet found.");
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, blankrows: false }) as unknown[][];
  return toTable(data.map((r) => r.map((c) => String(c ?? "").trim())), ext);
}

async function parsePdf(file: File): Promise<RawTable> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  let textChars = 0;
  for (let p = 1; p <= Math.min(doc.numPages, 200); p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    // Group text items into lines by their y coordinate.
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items as { str: string; transform: number[] }[]) {
      if (!it.str?.trim()) continue;
      textChars += it.str.length;
      const y = Math.round(it.transform[5] ?? 0);
      const arr = byY.get(y) ?? [];
      arr.push({ x: it.transform[4] ?? 0, s: it.str.trim() });
      byY.set(y, arr);
    }
    [...byY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
      lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" | "));
    });
    await yieldFrame();
  }
  if (textChars < 20) {
    throw new Error("This PDF appears to be scanned (image only). OCR is not available in this prototype, so no contacts were extracted. Please export the list as CSV or Excel.");
  }
  // Extract name + phone per line.
  const rows: string[][] = [];
  const phoneRe = /(\+?\d[\d\s-]{8,15}\d)/;
  for (const line of lines) {
    const m = line.match(phoneRe);
    if (!m) continue;
    const rest = line.replace(m[0], "").split("|").map((s) => s.trim()).filter(Boolean);
    const name = rest.find((s) => /[A-Za-z\u0C00-\u0C7F]{2,}/.test(s) && !/\d{4,}/.test(s)) ?? "";
    const location = rest.filter((s) => s !== name).join(" ").replace(/\s+/g, " ").trim();
    rows.push([name, m[0].trim(), location]);
  }
  return {
    headers: ["Name", "Phone", "Other text"],
    rows,
    fileType: "pdf",
    notice: "PDF extraction can be inaccurate. Please verify every phone number and name before importing.",
  };
}

function toTable(data: string[][], fileType: RawTable["fileType"]): RawTable {
  if (!data.length) throw new Error("The file is empty.");
  const first = data[0] ?? [];
  const looksHeader = first.every((c) => !normalizePhone(c));
  const headers = looksHeader ? first.map((h, i) => h || `Column ${i + 1}`) : first.map((_, i) => `Column ${i + 1}`);
  const rows = looksHeader ? data.slice(1) : data;
  if (rows.length > MAX_ROWS) throw new Error(`This file has ${rows.length.toLocaleString()} rows. The limit is ${MAX_ROWS.toLocaleString()} per import.`);
  return { headers, rows, fileType };
}

export interface Mapping { name: number; phone: number; location: number; custom: number[] }

export function guessMapping(headers: string[]): Mapping {
  const find = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const phone = find(/phone|mobile|number|contact|cell|whats/i);
  const name = find(/name|customer|client/i);
  const location = find(/location|city|area|place|address/i);
  return {
    phone: phone >= 0 ? phone : 1 < headers.length ? 1 : 0,
    name: name >= 0 ? name : 0,
    location,
    custom: headers.map((_, i) => i).filter((i) => ![phone, name, location].includes(i)),
  };
}

export type RowIssue = "ok" | "invalid" | "missing" | "duplicate" | "existing" | "dnc";
export interface PreviewRow { idx: number; name: string; phoneRaw: string; phone: string | null; location: string; custom: Record<string, string>; issue: RowIssue; include: boolean }

export function buildPreview(t: RawTable, m: Mapping, existing: Set<string>, dnc: Set<string>): PreviewRow[] {
  const seen = new Set<string>();
  return t.rows.map((r, idx) => {
    const phoneRaw = r[m.phone] ?? "";
    const hdr = (i: number) => t.headers[i] ?? `Column ${i + 1}`;
    const phone = normalizePhone(phoneRaw);
    let issue: RowIssue = "ok";
    if (!phoneRaw.trim()) issue = "missing";
    else if (!phone) issue = "invalid";
    else if (seen.has(phone)) issue = "duplicate";
    else if (dnc.has(phone)) issue = "dnc";
    else if (existing.has(phone)) issue = "existing";
    if (phone) seen.add(phone);
    const custom: Record<string, string> = {};
    m.custom.forEach((i) => { if (r[i]) custom[hdr(i)] = r[i]!; });
    return { idx, name: r[m.name] ?? "", phoneRaw, phone, location: m.location >= 0 ? r[m.location] ?? "" : "", custom, issue, include: issue === "ok" };
  });
}
