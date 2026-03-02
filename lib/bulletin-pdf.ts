type BulletinRow = {
  subject: string;
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
  performance: string;
};

type BuildBulletinPdfInput = {
  studentName: string;
  course: string;
  term: string;
  average: number;
  globalPerformance: string;
  rows: BulletinRow[];
  pendingSubjects: string[];
};

function escapePdfText(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function toAscii(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function buildBulletinPdf(input: BuildBulletinPdfInput): Uint8Array {
  const lines: string[] = [];
  lines.push("UNIDAD EDUCATIVA EDUCANDO");
  lines.push("BOLETIN TRIMESTRAL");
  lines.push("");
  lines.push(`Estudiante: ${toAscii(input.studentName)}`);
  lines.push(`Curso: ${toAscii(input.course)}`);
  lines.push(`Periodo: ${toAscii(input.term)}`);
  lines.push(`Fecha: ${new Date().toLocaleDateString("es-BO")}`);
  lines.push("");
  lines.push("Materia | Saber | Hacer | Ser | Decidir | Total | Desempeno");
  lines.push("-------------------------------------------------------------");

  for (const row of input.rows) {
    lines.push(
      `${toAscii(row.subject)} | ${row.saber.toFixed(2)} | ${row.hacer.toFixed(2)} | ${row.ser.toFixed(2)} | ${row.decidir.toFixed(2)} | ${row.total.toFixed(2)} | ${toAscii(row.performance)}`
    );
  }

  if (input.pendingSubjects.length > 0) {
    lines.push("");
    lines.push("Materias pendientes:");
    for (const subject of input.pendingSubjects) {
      lines.push(`- ${toAscii(subject)}`);
    }
  }

  lines.push("");
  lines.push(`Promedio general: ${input.average.toFixed(2)}`);
  lines.push(`Desempeno global: ${toAscii(input.globalPerformance)}`);

  const maxLines = 48;
  const visibleLines = lines.slice(0, maxLines);
  let stream = "BT\n/F1 10 Tf\n50 790 Td\n";
  for (let i = 0; i < visibleLines.length; i += 1) {
    const escaped = escapePdfText(visibleLines[i]);
    if (i === 0) {
      stream += `(${escaped}) Tj\n`;
    } else {
      stream += `T*\n(${escaped}) Tj\n`;
    }
  }
  stream += "ET";

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
