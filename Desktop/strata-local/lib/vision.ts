import fs from "fs";
import { VisualFinding } from "./types";
import { resolveVisionModels } from "./model-registry";

export type VisionAnalysis = {
  description: string;
  model: string;
  modelsUsed: string[];
  analysisConfidence: "low" | "medium" | "high";
  reviewNotes: string[];
  visualFindings: VisualFinding[];
};

type RawVisualFinding = {
  label?: unknown;
  observation?: unknown;
  category?: unknown;
  confidence?: unknown;
  bbox?: unknown;
};

type ModelRun = {
  model: string;
  description: string;
  visualFindings: VisualFinding[];
};

const ALLOWED_CATEGORIES = new Set([
  "leak",
  "electrical",
  "guarding",
  "machine_guarding",
  "lockout_tagout",
  "corrosion",
  "housekeeping",
  "access",
  "egress",
  "structural",
  "mechanical",
  "thermal",
  "pressure",
  "fire_protection",
  "hazcom",
  "compressed_gas",
  "ppe",
  "materials_handling",
  "walking_working_surface",
  "labeling",
  "other",
]);

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeCategory(value: unknown) {
  const category = asText(value, "other").toLowerCase();
  return ALLOWED_CATEGORIES.has(category) ? category : "other";
}

function normalizeBBox(value: unknown): VisualFinding["bbox"] {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);

  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width <= 0 || height <= 0) return null;

  const safeX = Math.max(0, Math.min(0.99, x));
  const safeY = Math.max(0, Math.min(0.99, y));

  return {
    x: safeX,
    y: safeY,
    width: Math.max(0.01, Math.min(1 - safeX, width)),
    height: Math.max(0.01, Math.min(1 - safeY, height)),
  };
}

function normalizeFinding(
  finding: RawVisualFinding,
  sourceModel: string
): VisualFinding {
  const confidence = asText(finding.confidence, "medium");

  return {
    label: asText(finding.label, "Inspection finding"),
    observation: asText(finding.observation, "Visible condition noted."),
    category: normalizeCategory(finding.category),
    confidence:
      confidence === "low" || confidence === "medium" || confidence === "high"
        ? confidence
        : "medium",
    sourceModels: [sourceModel],
    evidenceScore: confidence === "high" ? 0.85 : confidence === "medium" ? 0.6 : 0.35,
    bbox: normalizeBBox(finding.bbox),
  };
}

function parseVisionResponse(
  responseText: string,
  sourceModel: string
): {
  description: string;
  visualFindings: VisualFinding[];
} {
  try {
    const parsed = JSON.parse(responseText) as {
      description?: unknown;
      visual_findings?: RawVisualFinding[];
    };

    return {
      description: asText(parsed.description, responseText),
      visualFindings: Array.isArray(parsed.visual_findings)
        ? parsed.visual_findings.map((finding) =>
            normalizeFinding(finding, sourceModel)
          )
        : [],
    };
  } catch {
    return {
      description: responseText || "No clear maintenance issue visible.",
      visualFindings: [],
    };
  }
}

function findingKey(finding: VisualFinding) {
  return `${finding.category}:${finding.label}`.toLowerCase();
}

function confidenceRank(confidence: VisualFinding["confidence"]) {
  const ranks = {
    low: 1,
    medium: 2,
    high: 3,
  };

  return ranks[confidence];
}

function mergeFindings(runs: ModelRun[]) {
  const merged = new Map<string, VisualFinding>();

  for (const run of runs) {
    for (const finding of run.visualFindings) {
      const key = findingKey(finding);
      const current = merged.get(key);

      if (!current) {
        merged.set(key, finding);
        continue;
      }

      const sourceModels = Array.from(
        new Set([...(current.sourceModels || []), run.model])
      );
      const confidence =
        confidenceRank(finding.confidence) > confidenceRank(current.confidence)
          ? finding.confidence
          : current.confidence;
      const evidenceScore = Math.min(
        0.98,
        Math.max(current.evidenceScore || 0.4, finding.evidenceScore || 0.4) +
          0.12
      );

      merged.set(key, {
        ...current,
        observation:
          finding.observation.length > current.observation.length
            ? finding.observation
            : current.observation,
        confidence,
        evidenceScore,
        sourceModels,
        bbox: current.bbox || finding.bbox || null,
      });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => (b.evidenceScore || 0) - (a.evidenceScore || 0)
  );
}

function scoreAnalysis(runs: ModelRun[], findings: VisualFinding[]) {
  if (findings.length === 0) return "medium";

  const multiModelFinding = findings.some(
    (finding) => (finding.sourceModels || []).length > 1
  );
  const highFinding = findings.some((finding) => finding.confidence === "high");

  if (multiModelFinding && highFinding) return "high";
  if (multiModelFinding || highFinding || runs.length > 1) return "medium";
  return "low";
}

function buildReviewNotes(runs: ModelRun[], findings: VisualFinding[]) {
  const notes = [
    `${runs.length} photo assessment check${
      runs.length === 1 ? "" : "s"
    } completed.`,
    `${findings.length} localized condition${
      findings.length === 1 ? "" : "s"
    } found in photo evidence.`,
  ];

  if (runs.length < 2) {
    notes.push("Only one photo assessment check completed; field verification is recommended.");
  }

  if (findings.some((finding) => finding.confidence === "low")) {
    notes.push("Low-confidence photo findings should be verified before corrective work is assigned.");
  }

  return notes;
}

function composeDescription(runs: ModelRun[], findings: VisualFinding[]) {
  if (findings.length === 0) {
    return runs[0]?.description || "No clear maintenance issue visible.";
  }

  const sourceSummary = runs
    .map((run) => `- ${run.description}`)
    .join("\n");
  const findingSummary = findings
    .slice(0, 5)
    .map(
      (finding) =>
        `${finding.label} (${finding.category}, ${finding.confidence}): ${finding.observation}`
    )
    .join(" ");

  return `${findingSummary}\n\nPhoto observations:\n${sourceSummary}`;
}

function buildPrompt(userNote?: string) {
  return `
Analyze image evidence for a Strata industrial inspection record.

Your job is evidence extraction, not ticket creation.

Accuracy rules:
- Visible evidence only. Do not infer hidden causes.
- False positives are costly in industrial operations; return no finding when the image does not show clear evidence.
- Prefer "low" confidence when the image is blurry, cropped, poorly lit, or the finding is only weakly visible.
- Do not identify people.
- Do not assign severity.
- If the user note says something that is not visible, mention only that it was reported in the description, not as visual evidence.
- Use bounding boxes only when the finding is visibly localizable.

Industrial checklist:
- Housekeeping and walking-working surfaces: wet floors, poor drainage, debris, blocked walkways, floor holes, damaged stairs/rails, slip/trip/fall hazards.
- Leaks: active dripping, wet floor, staining, residue, containment, walk-path exposure.
- Electrical: exposed wiring, damaged conduit, open panels, water near electrical gear, missing covers.
- Machine guarding and lockout/tagout: missing guards, belt/coupling exposure, missing lock/tag evidence, loose hoses, damaged fittings, vibration/misalignment clues.
- Corrosion/structure: rust, pitting, cracked supports, failed coatings, compromised stairs/rails.
- Access/egress and fire protection: blocked exits, blocked panels, blocked extinguishers, missing barricades/signage.
- Hazard communication/PPE/material handling: chemical labels, cylinder condition, cylinder caps, stacked materials, PPE signage, illegible status tags, inspection labels, calibration labels.

Return only valid JSON:
{
  "description": "short plain-English evidence summary",
  "visual_findings": [
    {
      "label": "short label",
      "observation": "visible evidence only",
      "category": "leak | electrical | machine_guarding | lockout_tagout | corrosion | housekeeping | access | egress | structural | mechanical | thermal | pressure | fire_protection | hazcom | compressed_gas | ppe | materials_handling | walking_working_surface | labeling | other",
      "confidence": "low | medium | high",
      "bbox": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2}
    }
  ]
}

If there is no clear issue, return:
{
  "description": "No clear maintenance issue visible.",
  "visual_findings": []
}

User note:
${userNote || "None"}
`;
}

async function runVisionModel(
  model: string,
  imageBase64: string,
  userNote?: string
): Promise<ModelRun> {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(userNote),
      images: [imageBase64],
      stream: false,
      format: {
        type: "object",
        properties: {
          description: { type: "string" },
          visual_findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                observation: { type: "string" },
                category: { type: "string" },
                confidence: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
                bbox: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                },
              },
              required: ["label", "observation", "category", "confidence"],
            },
          },
        },
        required: ["description", "visual_findings"],
      },
      options: {
        temperature: 0,
        top_p: 0.8,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as { response?: string };
  const parsed = parseVisionResponse(data.response || "", model);

  return {
    model,
    description: parsed.description,
    visualFindings: parsed.visualFindings,
  };
}

export async function analyzeImageWithOllama(
  imagePath: string,
  userNote?: string
): Promise<VisionAnalysis> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at path: ${imagePath}`);
  }

  const imageBase64 = fs.readFileSync(imagePath).toString("base64");
  const requestedLimit = Number(process.env.STRATA_VISION_ENSEMBLE || "2");
  const models = await resolveVisionModels(
    Number.isFinite(requestedLimit) ? Math.max(1, requestedLimit) : 2
  );

  if (models.length === 0) {
    throw new Error(
      "No local vision models are installed. Pull qwen2.5vl:7b, gemma3:12b, llama3.2-vision, or llava:7b with Ollama."
    );
  }

  const runs: ModelRun[] = [];
  const errors: string[] = [];

  for (const model of models) {
    try {
      runs.push(await runVisionModel(model.installedName, imageBase64, userNote));
    } catch (error: unknown) {
      errors.push(
        `${model.installedName}: ${
          error instanceof Error ? error.message : "analysis failed"
        }`
      );
    }
  }

  if (runs.length === 0) {
    throw new Error(
      errors.join("\n") || "All local vision model analyses failed."
    );
  }

  const visualFindings = mergeFindings(runs);
  const analysisConfidence = scoreAnalysis(runs, visualFindings);
  const reviewNotes = buildReviewNotes(runs, visualFindings);

  if (errors.length) {
    reviewNotes.push(
      `One or more secondary photo assessment checks were unavailable. Completed checks: ${runs.length}.`
    );
  }

  return {
    description: composeDescription(runs, visualFindings),
    model: runs.map((run) => run.model).join(" + "),
    modelsUsed: runs.map((run) => run.model),
    analysisConfidence,
    reviewNotes,
    visualFindings,
  };
}
