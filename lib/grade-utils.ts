import type { EvaluationDimension, EvaluationScore } from "./db";

export type ConsolidatedGrade = {
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
};

type DimensionBucket = { sum: number; weight: number };

export function consolidateFromEvaluationScores(
  rows: EvaluationScore[]
): { result: ConsolidatedGrade | null; missingDimensions: EvaluationDimension[] } {
  const dims: Record<EvaluationDimension, DimensionBucket> = {
    saber: { sum: 0, weight: 0 },
    hacer: { sum: 0, weight: 0 },
    ser: { sum: 0, weight: 0 },
    decidir: { sum: 0, weight: 0 },
  };

  for (const row of rows) {
    const dimension = row.activity?.dimension;
    const weight = Number(row.activity?.weight ?? 0);
    if (!dimension || !Number.isFinite(weight) || weight <= 0) continue;
    dims[dimension].sum += row.score * weight;
    dims[dimension].weight += weight;
  }

  const missingDimensions = (Object.keys(dims) as EvaluationDimension[]).filter(
    (key) => dims[key].weight <= 0
  );
  if (missingDimensions.length > 0) {
    return { result: null, missingDimensions };
  }

  const saber = Number((dims.saber.sum / dims.saber.weight).toFixed(2));
  const hacer = Number((dims.hacer.sum / dims.hacer.weight).toFixed(2));
  const ser = Number((dims.ser.sum / dims.ser.weight).toFixed(2));
  const decidir = Number((dims.decidir.sum / dims.decidir.weight).toFixed(2));
  const total = Number((saber * 0.35 + hacer * 0.35 + ser * 0.15 + decidir * 0.15).toFixed(2));

  return {
    result: { saber, hacer, ser, decidir, total },
    missingDimensions: [],
  };
}

export function qualitativePerformance(total: number): string {
  if (total >= 90) return "Excelente";
  if (total >= 80) return "Muy bueno";
  if (total >= 70) return "Bueno";
  if (total >= 60) return "Regular";
  return "En proceso";
}
