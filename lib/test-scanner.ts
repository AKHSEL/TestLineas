import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { AZ_TO_SQUARE, IMAGE_ID_TO_AZ, slotsToRankings, type AZCode, type Rankings } from "@/lib/scoring";

export const SCAN_CODES: AZCode[] = ["A1Z", "A2Z", "A3Z", "A4Z", "A5Z", "A6Z", "A7Z", "A8Z", "A9Z"];
export const MAX_SCAN_BYTES = 10 * 1024 * 1024;
const AZ_TO_IMAGE_ID = Object.fromEntries(
  Object.entries(IMAGE_ID_TO_AZ).map(([imageId, code]) => [code, Number(imageId)]),
) as Record<AZCode, number>;

type SourceRegion = { x: number; y: number; width: number; height: number };

// Coordinates use the supplied 595x842 PDF page with a top-left origin.
// They cover the answer number itself instead of only the dotted guide.
export const SCAN_ZONES: Record<AZCode, SourceRegion> = {
  A9Z: { x: 178, y: 178, width: 32, height: 32 },
  A5Z: { x: 287, y: 177, width: 32, height: 32 },
  A6Z: { x: 416, y: 177, width: 32, height: 32 },
  A3Z: { x: 81, y: 362, width: 32, height: 32 },
  A4Z: { x: 298, y: 365, width: 32, height: 32 },
  A8Z: { x: 518, y: 362, width: 32, height: 32 },
  A1Z: { x: 174, y: 590, width: 32, height: 32 },
  A7Z: { x: 283, y: 590, width: 32, height: 32 },
  A2Z: { x: 421, y: 592, width: 32, height: 32 },
};

export type ScanReading = {
  code: AZCode;
  square: number;
  value: number | null;
  confidence: number;
  rawText: string;
  needsReview: boolean;
  reason: string | null;
};

export type ScanAnalysis = {
  pageCount: number;
  renderWidth: number;
  renderHeight: number;
  readings: ScanReading[];
};

let workerPromise: Promise<Worker> | null = null;
const defaultLangPath = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");

function getTesseractWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      langPath: process.env.TESSERACT_LANG_PATH || defaultLangPath,
      logger: () => undefined,
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_CHAR,
        tessedit_char_whitelist: "123456789",
        user_defined_dpi: "300",
      });
      return worker;
    });
  }
  return workerPromise;
}

function toRenderRegion(region: SourceRegion, width: number, height: number) {
  return {
    left: Math.max(0, Math.round((region.x / 595) * width)),
    top: Math.max(0, Math.round((region.y / 842) * height)),
    width: Math.min(width, Math.round((region.width / 595) * width)),
    height: Math.min(height, Math.round((region.height / 842) * height)),
  };
}

function parseDigit(text: string) {
  const digits = text.replace(/[^1-9]/g, "");
  return digits.length === 1 ? Number(digits) : null;
}

export async function analyzeTestPdf(pdfBytes: Uint8Array): Promise<ScanAnalysis> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: pdfBytes,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  } as never).promise;
  if (document.numPages !== 1) throw new Error("El PDF debe tener exactamente una página.");

  const page = await document.getPage(1);
  const unitViewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const textCandidates = textContent.items.flatMap((item) => {
    if (!("str" in item) || !("transform" in item)) return [];
    const rawText = item.str.trim();
    if (!/^[1-9]$/.test(rawText)) return [];
    const x = Number(item.transform[4]);
    const baselineY = Number(item.transform[5]);
    const itemWidth = Number("width" in item ? item.width : 0);
    const itemHeight = Number("height" in item ? item.height : 0);
    if (![x, baselineY, itemWidth, itemHeight].every(Number.isFinite)) return [];
    return [{
      rawText,
      value: Number(rawText),
      x: ((x + itemWidth / 2) / unitViewport.width) * 595,
      y: ((unitViewport.height - baselineY - itemHeight / 2) / unitViewport.height) * 842,
    }];
  });
  const textReadings = new Map<AZCode, ScanReading>();
  const claimedTextCandidates = new Set<number>();
  for (const code of SCAN_CODES) {
    const zone = SCAN_ZONES[code];
    const expectedX = zone.x + zone.width / 2;
    const expectedY = zone.y + zone.height / 2;
    const closest = textCandidates
      .map((candidate, index) => ({ candidate, index, distance: Math.hypot(candidate.x - expectedX, candidate.y - expectedY) }))
      .filter(({ index }) => !claimedTextCandidates.has(index))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!closest || closest.distance > 45) continue;
    claimedTextCandidates.add(closest.index);
    textReadings.set(code, {
      code,
      square: AZ_TO_SQUARE[code],
      value: closest.candidate.value,
      confidence: 100,
      rawText: closest.candidate.rawText,
      needsReview: false,
      reason: null,
    });
  }

  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context as never, canvas: canvas as never, viewport }).promise;
  const worker = textReadings.size === SCAN_CODES.length ? null : await getTesseractWorker();
  const readings: ScanReading[] = [];

  for (const code of SCAN_CODES) {
    const textReading = textReadings.get(code);
    if (textReading) {
      readings.push(textReading);
      continue;
    }
    const square = AZ_TO_SQUARE[code];
    const rectangle = toRenderRegion(SCAN_ZONES[code], canvas.width, canvas.height);
    const crop = createCanvas(rectangle.width, rectangle.height);
    crop.getContext("2d").drawImage(
      canvas,
      rectangle.left,
      rectangle.top,
      rectangle.width,
      rectangle.height,
      0,
      0,
      rectangle.width,
      rectangle.height,
    );
    const result = await worker!.recognize(crop.toBuffer("image/png"));
    const rawText = result.data.text.trim();
    const value = parseDigit(rawText);
    const confidence = Math.round(Number(result.data.confidence || 0));
    const reason = value == null
      ? "No se detectó un único número del 1 al 9."
      : confidence < 65
        ? "La confianza de lectura es baja."
        : null;
    readings.push({ code, square, value, confidence, rawText, needsReview: reason != null, reason });
  }

  return { pageCount: document.numPages, renderWidth: canvas.width, renderHeight: canvas.height, readings };
}

export function validateScanRankings(input: unknown): { ok: true; rankings: Rankings; slots: number[] } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Faltan los resultados del escaneo." };
  const values = SCAN_CODES.map((code) => Number((input as Record<string, unknown>)[code]));
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 9)) {
    return { ok: false, error: "Cada línea debe tener un número entero del 1 al 9." };
  }
  if (new Set(values).size !== SCAN_CODES.length) return { ok: false, error: "Los números del escaneo no pueden repetirse." };

  const slots = Array.from({ length: 9 }, () => 0);
  const rankings = {} as Rankings;
  SCAN_CODES.forEach((code, index) => {
    rankings[code] = values[index];
    slots[values[index] - 1] = AZ_TO_IMAGE_ID[code];
  });
  const canonical = slotsToRankings(slots);
  if (!canonical) return { ok: false, error: "No se pudo validar la correspondencia de las nueve líneas." };
  return { ok: true, rankings: canonical, slots };
}
