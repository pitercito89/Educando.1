import { getSession } from "@/lib/auth";
import { listAttendanceRecords } from "@/lib/db";

function toCsvCell(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "director"].includes(session.role)) {
    return new Response("No autorizado", { status: 401 });
  }

  const result = await listAttendanceRecords({ limit: 500 });
  if (result.error || !result.data) {
    return new Response(result.error ?? "No se pudo generar el reporte.", { status: 500 });
  }

  const header = ["fecha", "estudiante", "curso", "estado", "fecha_registro"];

  const rows = result.data.map((item) =>
    [
      item.attendance_date,
      item.student.full_name,
      item.student.course,
      item.status,
      item.created_at,
    ]
      .map(toCsvCell)
      .join(",")
  );

  const content = [header.join(","), ...rows].join("\n");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reporte_asistencias.csv"',
    },
  });
}
