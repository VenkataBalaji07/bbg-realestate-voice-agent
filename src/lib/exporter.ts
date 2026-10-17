// Report exports built from stored prototype data only.
export type Row = Record<string, string | number | boolean | null | undefined>;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function exportRows(format: "csv" | "xlsx" | "pdf", title: string, rows: Row[], columns?: string[]) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${title.toLowerCase().replace(/\s+/g, "-")}-${stamp}`;
  const data = rows.map((r) => cols.map((c) => r[c] ?? ""));
  if (format === "csv") {
    const Papa = (await import("papaparse")).default;
    download(new Blob(["\ufeff" + Papa.unparse({ fields: cols, data })], { type: "text/csv" }), `${base}.csv`);
  } else if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([cols, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 30));
    XLSX.writeFile(wb, `${base}.xlsx`);
  } else {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: cols.length > 6 ? "landscape" : "portrait" });
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Generated ${new Date().toLocaleString("en-IN")} · Prototype data (simulated calls) · ${rows.length} rows`, 14, 22);
    autoTable(doc, {
      head: [cols], body: data.map((r) => r.map(String)), startY: 27,
      styles: { fontSize: 8 }, headStyles: { fillColor: [31, 41, 72] },
    });
    doc.save(`${base}.pdf`);
  }
}
