import assert from "node:assert/strict";
import test from "node:test";
import { buildExcelWorkbook } from "./excel-export.ts";
import { formatThesisMoment, formatThesisProcessing, formatThesisSeconds, getThesisTimes } from "./thesis.ts";

test("calcula ambos intervalos desde los tres momentos reales", () => {
  const times = getThesisTimes({
    thesis: {
      consentStartedAt: "2026-10-15T12:00:00.000Z",
      confirmedAt: "2026-10-15T12:05:00.000Z",
    },
  }, "2026-10-15T12:05:03.000Z");

  assert.equal(times.totalProcessSeconds, 303);
  assert.equal(times.processingSeconds, 3);
  assert.equal(formatThesisMoment(times.consentStartedAt), "07:00:00");
  assert.equal(formatThesisMoment("2026-10-16T03:15:00.000Z"), "22:15:00");
  assert.equal(formatThesisSeconds(times.totalProcessSeconds), "303 segundos");
  assert.equal(formatThesisProcessing(times), "3.000 segundos");
});

test("expresa minutos completos y fracciones de procesamiento en segundos", () => {
  const times = getThesisTimes({
    thesis: {
      consentStartedAt: "2026-10-16T17:03:18.900Z",
      confirmedAt: "2026-10-16T17:04:18.905Z",
    },
  }, "2026-10-16T17:04:19.175Z");

  assert.equal(times.totalProcessSeconds, 60);
  assert.equal(times.processingSeconds, 0.27);
  assert.equal(formatThesisSeconds(times.totalProcessSeconds), "60 segundos");
  assert.equal(formatThesisProcessing(times), "0.270 segundos");
});

test("deja los tiempos históricos sin inventar momentos faltantes", () => {
  const times = getThesisTimes({}, "2026-10-15T12:05:03.000Z");

  assert.equal(times.consentStartedAt, null);
  assert.equal(times.confirmedAt, null);
  assert.equal(times.resultAvailableAt, "2026-10-15T12:05:03.000Z");
  assert.equal(times.totalProcessSeconds, null);
  assert.equal(times.processingSeconds, null);
  assert.equal(formatThesisProcessing(times), "");
});

test("no informa duraciones negativas cuando los relojes no coinciden", () => {
  const times = getThesisTimes({
    thesis: {
      consentStartedAt: "2026-10-15T12:00:00.000Z",
      confirmedAt: "2026-10-15T12:06:00.000Z",
    },
  }, "2026-10-15T12:05:03.000Z");

  assert.equal(times.totalProcessSeconds, 303);
  assert.equal(times.processingSeconds, null);
  assert.equal(formatThesisProcessing(times), "Horas inconsistentes");
});

test("el Excel conserva los indicadores como números en segundos", async () => {
  const workbook = await buildExcelWorkbook({
    columns: [
      { key: "total", label: "Total (segundos)", width: 24, kind: "integer" },
      { key: "procesamiento", label: "Procesamiento (segundos)", width: 30, kind: "decimal", numFmt: "#,##0.000" },
    ],
    rows: [{ total: 60, procesamiento: 0.27 }],
    sheetName: "Tesis",
    fileName: "prueba.xlsx",
  });
  const sheet = workbook.getWorksheet("Tesis");
  assert.equal(sheet?.getCell("A2").value, 60);
  assert.equal(sheet?.getCell("B2").value, 0.27);
  assert.equal(sheet?.getCell("B2").numFmt, "#,##0.000");
});
