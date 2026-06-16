import sharp from "sharp";
import Tesseract from "tesseract.js";
import { TextEvidence } from "./types";

type OcrLine = {
  text?: string;
  confidence?: number;
  bbox?: {
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
  };
};

const TEXT_KIND_PATTERNS: Array<[TextEvidence["kind"], RegExp]> = [
  ["asset_tag", /\b(asset|equipment|tag|serial|s\/n|id|unit)\b/i],
  ["nameplate", /\b(model|make|rated|volts?|amps?|rpm|psi|bar|hz|kw|hp)\b/i],
  ["gauge", /\b(psi|bar|kpa|mpa|deg|°|temp|pressure|level|flow)\b/i],
  ["warning", /\b(warning|danger|caution|hazard|hot|arc flash|flammable)\b/i],
  ["permit", /\b(permit|confined|hot work|entry)\b/i],
  ["calibration", /\b(calibration|calibrated|cal due|due date)\b/i],
  ["inspection_tag", /\b(inspected|inspection|pass|fail|ok|checked)\b/i],
  ["signage", /\b(exit|egress|fire|ppe|required|lockout|tagout)\b/i],
  ["label", /\b(label|contents|chemical|sds|ghs|nfpa)\b/i],
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function classifyTextEvidence(text: string): TextEvidence["kind"] {
  const match = TEXT_KIND_PATTERNS.find(([, pattern]) => pattern.test(text));
  return match?.[0] || "other";
}

function confidenceFromOcr(value = 0): TextEvidence["confidence"] {
  if (value >= 78) return "high";
  if (value >= 52) return "medium";
  return "low";
}

function confidenceRank(confidence: TextEvidence["confidence"]) {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

function bboxFromOcr(
  line: OcrLine,
  width: number,
  height: number
): TextEvidence["bbox"] {
  const box = line.bbox;
  if (!box) return null;

  const x0 = Number(box.x0);
  const y0 = Number(box.y0);
  const x1 = Number(box.x1);
  const y1 = Number(box.y1);

  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  if (x1 <= x0 || y1 <= y0 || width <= 0 || height <= 0) return null;

  return {
    x: Math.max(0, Math.min(0.99, x0 / width)),
    y: Math.max(0, Math.min(0.99, y0 / height)),
    width: Math.max(0.01, Math.min(1, (x1 - x0) / width)),
    height: Math.max(0.01, Math.min(1, (y1 - y0) / height)),
  };
}

function collectLines(blocks: unknown): OcrLine[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.flatMap((block) => {
    const paragraphs = (block as { paragraphs?: unknown }).paragraphs;
    if (!Array.isArray(paragraphs)) return [];

    return paragraphs.flatMap((paragraph) => {
      const lines = (paragraph as { lines?: unknown }).lines;
      return Array.isArray(lines) ? (lines as OcrLine[]) : [];
    });
  });
}

export async function extractTextEvidenceWithTesseract(
  imagePath: string
): Promise<TextEvidence[]> {
  const prepared = await sharp(imagePath, { failOn: "none" })
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalise()
    .png()
    .toBuffer({ resolveWithObject: true });

  const worker = await Tesseract.createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    });

    const result = await worker.recognize(prepared.data);
    const lines = collectLines(result.data.blocks);
    const candidates = lines
      .map((line) => ({
        text: normalizeText(line.text || ""),
        confidence: line.confidence || 0,
        bbox: bboxFromOcr(line, prepared.info.width, prepared.info.height),
      }))
      .filter((line) => line.text.length >= 3 && line.confidence >= 35)
      .filter((line) => /[a-z0-9]/i.test(line.text))
      .slice(0, 12);

    const deduped = new Map<string, TextEvidence>();

    for (const line of candidates) {
      const key = line.text.toLowerCase();
      const current = deduped.get(key);
      const evidence: TextEvidence = {
        text: line.text,
        kind: classifyTextEvidence(line.text),
        confidence: confidenceFromOcr(line.confidence),
        source: "ocr",
        bbox: line.bbox,
        fieldUse: "Use as supporting readable text; verify critical tags or readings in the field.",
      };

      if (
        !current ||
        confidenceRank(confidenceFromOcr(line.confidence)) >
          confidenceRank(current.confidence)
      ) {
        deduped.set(key, evidence);
      }
    }

    return Array.from(deduped.values()).slice(0, 8);
  } finally {
    await worker.terminate();
  }
}
