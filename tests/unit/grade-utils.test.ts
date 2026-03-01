import test from "node:test";
import assert from "node:assert/strict";
import { consolidateFromEvaluationScores, qualitativePerformance } from "@/lib/grade-utils";
import type { EvaluationScore } from "@/lib/db";

test("consolidacion calcula total ponderado correctamente", () => {
  const rows: EvaluationScore[] = [
    { score: 80, activity: { dimension: "saber", weight: 50 } },
    { score: 100, activity: { dimension: "saber", weight: 50 } },
    { score: 70, activity: { dimension: "hacer", weight: 100 } },
    { score: 90, activity: { dimension: "ser", weight: 100 } },
    { score: 60, activity: { dimension: "decidir", weight: 100 } },
  ] as unknown as EvaluationScore[];

  const result = consolidateFromEvaluationScores(rows);
  assert.equal(result.missingDimensions.length, 0);
  assert.ok(result.result);
  assert.equal(result.result?.saber, 90);
  assert.equal(result.result?.hacer, 70);
  assert.equal(result.result?.ser, 90);
  assert.equal(result.result?.decidir, 60);
  assert.equal(result.result?.total, 78.5);
});

test("consolidacion bloquea cuando falta una dimension", () => {
  const rows: EvaluationScore[] = [
    { score: 80, activity: { dimension: "saber", weight: 100 } },
    { score: 70, activity: { dimension: "hacer", weight: 100 } },
    { score: 90, activity: { dimension: "ser", weight: 100 } },
  ] as unknown as EvaluationScore[];

  const result = consolidateFromEvaluationScores(rows);
  assert.equal(result.result, null);
  assert.deepEqual(result.missingDimensions, ["decidir"]);
});

test("desempeno cualitativo por rango", () => {
  assert.equal(qualitativePerformance(95), "Excelente");
  assert.equal(qualitativePerformance(84), "Muy bueno");
  assert.equal(qualitativePerformance(73), "Bueno");
  assert.equal(qualitativePerformance(65), "Regular");
  assert.equal(qualitativePerformance(40), "En proceso");
});
