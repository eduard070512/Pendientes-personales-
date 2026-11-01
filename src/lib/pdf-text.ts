// Extrae el texto de un PDF en el navegador, reconstruyendo las líneas por su posición.
type Item = { str: string; transform: number[]; width: number };

export class PdfPasswordError extends Error {}

export async function pdfToText(data: ArrayBuffer, password?: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), password: password || undefined }).promise;
  } catch (e) {
    if ((e as { name?: string }).name === "PasswordException") throw new PdfPasswordError(password ? "Contraseña incorrecta." : "Este PDF tiene contraseña.");
    throw e;
  }
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows: { y: number; items: Item[] }[] = [];
    for (const raw of content.items as Item[]) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const y = raw.transform[5];
      const row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (row) row.items.push(raw);
      else rows.push({ y, items: [raw] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.transform[4] - b.transform[4]);
      let line = "";
      let lastEnd = -Infinity;
      for (const it of r.items) {
        const x = it.transform[4];
        line += (line && x - lastEnd > 1 ? "  " : line ? " " : "") + it.str.trim();
        lastEnd = x + it.width;
      }
      lines.push(line);
    }
  }
  return lines.join("\n");
}
