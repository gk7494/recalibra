import fs from "fs";
import { TextEvidence, VisualFinding } from "./types";
import { resolveVisionModels } from "./model-registry";
import { ImageQualityReport, inspectImageQuality } from "./image-quality";
import { extractTextEvidenceWithTesseract } from "./ocr";
import { getOllamaBackendInfo, ollamaFetch } from "./inference-backend";
import { ensureDockerVisionWorkerStarted } from "./docker-worker";

export type VisionAnalysis = {
  description: string;
  model: string;
  modelsUsed: string[];
  analysisConfidence: "low" | "medium" | "high";
  imageQuality: ImageQualityReport;
  reviewNotes: string[];
  visualFindings: VisualFinding[];
  textEvidence: TextEvidence[];
};

type RawVisualFinding = {
  label?: unknown;
  observation?: unknown;
  category?: unknown;
  confidence?: unknown;
  visible_evidence?: unknown;
  recommended_verification?: unknown;
  action_hint?: unknown;
  bbox?: unknown;
};

type RawTextEvidence = {
  text?: unknown;
  kind?: unknown;
  confidence?: unknown;
  field_use?: unknown;
  bbox?: unknown;
};

type ModelRun = {
  model: string;
  description: string;
  visualFindings: VisualFinding[];
  textEvidence: TextEvidence[];
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

const ALLOWED_TEXT_KINDS = new Set([
  "asset_tag",
  "nameplate",
  "gauge",
  "label",
  "warning",
  "permit",
  "calibration",
  "inspection_tag",
  "signage",
  "other",
]);

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asText(item))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeCategory(value: unknown) {
  const category = asText(value, "other").toLowerCase();
  return ALLOWED_CATEGORIES.has(category) ? category : "other";
}

function normalizeTextKind(value: unknown): TextEvidence["kind"] {
  const kind = asText(value, "other").toLowerCase();
  return ALLOWED_TEXT_KINDS.has(kind)
    ? (kind as TextEvidence["kind"])
    : "other";
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
  const normalizedConfidence =
    confidence === "low" || confidence === "medium" || confidence === "high"
      ? confidence
      : "medium";

  return {
    label: asText(finding.label, "Inspection finding"),
    observation: asText(finding.observation, "Visible condition noted."),
    category: normalizeCategory(finding.category),
    confidence: normalizedConfidence,
    visibleEvidence: asTextArray(finding.visible_evidence),
    recommendedVerification: asText(
      finding.recommended_verification,
      "Verify the condition in the field before assigning corrective work."
    ),
    actionHint: asText(finding.action_hint),
    verification:
      normalizedConfidence === "high" ? "review" : "field_verify",
    sourceModels: [sourceModel],
    evidenceScore:
      normalizedConfidence === "high"
        ? 0.78
        : normalizedConfidence === "medium"
        ? 0.56
        : 0.32,
    bbox: normalizeBBox(finding.bbox),
  };
}

function normalizeTextEvidence(
  evidence: RawTextEvidence,
  sourceModel: string
): TextEvidence | null {
  const text = asText(evidence.text);
  if (!text) return null;

  const confidence = asText(evidence.confidence, "medium");
  const normalizedConfidence =
    confidence === "low" || confidence === "medium" || confidence === "high"
      ? confidence
      : "medium";

  return {
    text,
    kind: normalizeTextKind(evidence.kind),
    confidence: normalizedConfidence,
    source: "vision",
    sourceModels: [sourceModel],
    fieldUse: asText(
      evidence.field_use,
      "Use as supporting readable text; verify critical tags or readings in the field."
    ),
    bbox: normalizeBBox(evidence.bbox),
  };
}

function parseVisionResponse(
  responseText: string,
  sourceModel: string
): {
  description: string;
  visualFindings: VisualFinding[];
  textEvidence: TextEvidence[];
} {
  try {
    const parsed = JSON.parse(responseText) as {
      description?: unknown;
      visual_findings?: RawVisualFinding[];
      text_evidence?: RawTextEvidence[];
    };

    return {
      description: asText(parsed.description, responseText),
      visualFindings: Array.isArray(parsed.visual_findings)
        ? parsed.visual_findings.map((finding) =>
            normalizeFinding(finding, sourceModel)
          )
        : [],
      textEvidence: Array.isArray(parsed.text_evidence)
        ? parsed.text_evidence
            .map((evidence) => normalizeTextEvidence(evidence, sourceModel))
            .filter((evidence): evidence is TextEvidence => Boolean(evidence))
        : [],
    };
  } catch {
    return {
      description: responseText || "No clear maintenance issue visible.",
      visualFindings: [],
      textEvidence: [],
    };
  }
}

function confidenceRank(confidence: VisualFinding["confidence"]) {
  const ranks = {
    low: 1,
    medium: 2,
    high: 3,
  };

  return ranks[confidence];
}

function confidenceFromScore(score: number): VisualFinding["confidence"] {
  if (score >= 0.78) return "high";
  if (score >= 0.52) return "medium";
  return "low";
}

function nextLowerConfidence(
  confidence: VisualFinding["confidence"]
): VisualFinding["confidence"] {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 2);
}

function findingKey(finding: VisualFinding) {
  const words = normalizeWords(`${finding.category} ${finding.label}`);
  return `${finding.category}:${words.slice(0, 4).join("-") || "finding"}`;
}

function mergeFindings(runs: ModelRun[], imageQuality: ImageQualityReport) {
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
      const visibleEvidence = Array.from(
        new Set([
          ...(current.visibleEvidence || []),
          ...(finding.visibleEvidence || []),
        ])
      ).slice(0, 5);

      merged.set(key, {
        ...current,
        observation:
          finding.observation.length > current.observation.length
            ? finding.observation
            : current.observation,
        confidence,
        evidenceScore,
        visibleEvidence,
        recommendedVerification:
          current.recommendedVerification || finding.recommendedVerification,
        actionHint: current.actionHint || finding.actionHint,
        sourceModels,
        bbox: current.bbox || finding.bbox || null,
      });
    }
  }

  return Array.from(merged.values())
    .map((finding) => calibrateFinding(finding, runs.length, imageQuality))
    .filter((finding) => (finding.evidenceScore || 0) >= 0.24)
    .sort((a, b) => (b.evidenceScore || 0) - (a.evidenceScore || 0));
}

function textConfidenceRank(confidence: TextEvidence["confidence"]) {
  const ranks = {
    low: 1,
    medium: 2,
    high: 3,
  };

  return ranks[confidence];
}

function textEvidenceKey(evidence: TextEvidence) {
  return `${evidence.kind}:${evidence.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

function mergeTextEvidence(
  runs: ModelRun[],
  ocrEvidence: TextEvidence[],
  imageQuality: ImageQualityReport
) {
  const merged = new Map<string, TextEvidence>();

  for (const evidence of [
    ...runs.flatMap((run) => run.textEvidence),
    ...ocrEvidence,
  ]) {
    const key = textEvidenceKey(evidence);
    if (!key.trim()) continue;

    const current = merged.get(key);
    if (!current) {
      merged.set(key, evidence);
      continue;
    }

    const confidence =
      textConfidenceRank(evidence.confidence) >
      textConfidenceRank(current.confidence)
        ? evidence.confidence
        : current.confidence;

    merged.set(key, {
      ...current,
      confidence,
      source: current.source === evidence.source ? current.source : "vision",
      sourceModels: Array.from(
        new Set([
          ...(current.sourceModels || []),
          ...(evidence.sourceModels || []),
        ])
      ),
      fieldUse: current.fieldUse || evidence.fieldUse,
      bbox: current.bbox || evidence.bbox || null,
    });
  }

  return Array.from(merged.values())
    .map((evidence) => ({
      ...evidence,
      confidence:
        imageQuality.status === "retake" && evidence.confidence === "high"
          ? "medium"
          : evidence.confidence,
    }))
    .sort(
      (a, b) =>
        textConfidenceRank(b.confidence) - textConfidenceRank(a.confidence)
    )
    .slice(0, 10);
}

function calibrateFinding(
  finding: VisualFinding,
  runCount: number,
  imageQuality: ImageQualityReport
): VisualFinding {
  const sourceCount = finding.sourceModels?.length || 1;
  const hasConsensus = runCount > 1 && sourceCount > 1;
  const qualityPenalty =
    imageQuality.status === "retake"
      ? 0.25
      : imageQuality.status === "review"
      ? 0.12
      : 0;
  const bboxBonus = finding.bbox ? 0.05 : 0;
  const consensusBonus = hasConsensus ? 0.18 : 0;
  const evidenceBonus = finding.visibleEvidence?.length ? 0.04 : 0;
  const score = Math.max(
    0.05,
    Math.min(
      0.98,
      (finding.evidenceScore || 0.4) +
        consensusBonus +
        bboxBonus +
        evidenceBonus -
        qualityPenalty
    )
  );
  let confidence = confidenceFromScore(score);

  if (!hasConsensus && runCount > 1 && confidence === "high") {
    confidence = "medium";
  }

  if (imageQuality.status === "retake") {
    confidence = nextLowerConfidence(confidence);
  }

  return {
    ...finding,
    confidence,
    evidenceScore: Math.round(score * 100) / 100,
    verification:
      confidence === "high" && imageQuality.status === "usable" && hasConsensus
        ? "accepted"
        : imageQuality.status === "retake" || confidence === "low"
        ? "field_verify"
        : "review",
    qualityFlags: imageQuality.flags,
  };
}

function scoreAnalysis(
  runs: ModelRun[],
  findings: VisualFinding[],
  imageQuality: ImageQualityReport
) {
  if (imageQuality.status === "retake") return "low";
  if (findings.length === 0) return imageQuality.status === "usable" ? "medium" : "low";

  const multiModelFinding = findings.some(
    (finding) => (finding.sourceModels || []).length > 1
  );
  const highFinding = findings.some((finding) => finding.confidence === "high");

  if (multiModelFinding && highFinding) return "high";
  if (multiModelFinding || highFinding || runs.length > 1) return "medium";
  return "low";
}

function buildReviewNotes(
  runs: ModelRun[],
  findings: VisualFinding[],
  imageQuality: ImageQualityReport,
  textEvidence: TextEvidence[]
) {
  const notes = [
    `Photo quality ${imageQuality.status}: ${imageQuality.width}x${imageQuality.height}, sharpness ${imageQuality.sharpness}, contrast ${imageQuality.contrast}.`,
    `${runs.length} photo assessment check${
      runs.length === 1 ? "" : "s"
    } completed.`,
    `${findings.length} localized condition${
      findings.length === 1 ? "" : "s"
    } found in photo evidence.`,
    `${textEvidence.length} readable text item${
      textEvidence.length === 1 ? "" : "s"
    } captured from labels, tags, signs, gauges, or nameplates.`,
  ];

  if (runs.length < 2) {
    notes.push("Only one photo assessment check completed; field verification is recommended.");
  }

  if (imageQuality.flags.length) {
    notes.push(...imageQuality.flags.slice(0, 3));
  }

  if (findings.some((finding) => finding.verification === "field_verify")) {
    notes.push("Some findings require field verification before work is assigned.");
  }

  if (findings.some((finding) => finding.confidence === "low")) {
    notes.push("Low-confidence photo findings should be verified before corrective work is assigned.");
  }

  return notes;
}

function composeDescription(
  runs: ModelRun[],
  findings: VisualFinding[],
  textEvidence: TextEvidence[]
) {
  if (findings.length === 0) {
    const readableText = textEvidence.length
      ? `\n\nReadable text: ${textEvidence
          .slice(0, 6)
          .map((item) => `${item.text} (${item.kind})`)
          .join("; ")}`
      : "";
    return `${runs[0]?.description || "No clear maintenance issue visible."}${readableText}`;
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

  const readableText = textEvidence.length
    ? `\n\nReadable text: ${textEvidence
        .slice(0, 6)
        .map((item) => `${item.text} (${item.kind})`)
        .join("; ")}`
    : "";

  return `${findingSummary}${readableText}\n\nPhoto observations:\n${sourceSummary}`;
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
- Return visible_evidence as short concrete cues such as "wet floor", "open panel", "missing guard", or "blocked extinguisher".
- recommended_verification should be the field check needed to confirm the condition.
- action_hint should be the first practical operations or maintenance step.
- Extract readable text separately from visual findings. Include asset tags, serial numbers, nameplates, gauge readings, inspection tags, calibration stickers, permits, warning labels, fire/egress signs, chemical labels, and posted PPE requirements when legible.
- Do not treat readable text alone as proof of a hazardous condition.

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
      "visible_evidence": ["concrete visual cue"],
      "recommended_verification": "field check needed",
      "action_hint": "first practical next step",
      "bbox": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2}
    }
  ],
  "text_evidence": [
    {
      "text": "exact readable text",
      "kind": "asset_tag | nameplate | gauge | label | warning | permit | calibration | inspection_tag | signage | other",
      "confidence": "low | medium | high",
      "field_use": "how this text helps the inspector",
      "bbox": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2}
    }
  ]
}

If there is no clear issue, return:
{
  "description": "No clear maintenance issue visible.",
  "visual_findings": [],
  "text_evidence": []
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
  const response = await ollamaFetch("vision", "/api/generate", {
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
                visible_evidence: {
                  type: "array",
                  items: { type: "string" },
                },
                recommended_verification: { type: "string" },
                action_hint: { type: "string" },
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
          text_evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                kind: { type: "string" },
                confidence: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
                field_use: { type: "string" },
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
              required: ["text", "kind", "confidence"],
            },
          },
        },
        required: ["description", "visual_findings", "text_evidence"],
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
    textEvidence: parsed.textEvidence,
  };
}

export async function analyzeImageWithOllama(
  imagePath: string,
  userNote?: string
): Promise<VisionAnalysis> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at path: ${imagePath}`);
  }

  const [imageBase64, imageQuality, ocrResult] = await Promise.allSettled([
    fs.promises.readFile(imagePath).then((file) => file.toString("base64")),
    inspectImageQuality(imagePath),
    extractTextEvidenceWithTesseract(imagePath),
  ]);

  if (imageBase64.status === "rejected") {
    throw imageBase64.reason;
  }

  if (imageQuality.status === "rejected") {
    throw imageQuality.reason;
  }

  await ensureDockerVisionWorkerStarted();
  const models = await resolveVisionModels();

  if (models.length === 0) {
    const backend = getOllamaBackendInfo("vision");
    throw new Error(
      `No vision models are available from ${backend.baseUrl}. Pull qwen3-vl:32b, qwen2.5vl:32b, gemma3:27b, or qwen2.5vl:7b with Ollama, or set STRATA_VISION_OLLAMA_BASE_URL to a GPU worker.`
    );
  }

  const runs: ModelRun[] = [];
  const errors: string[] = [];

  for (const model of models) {
    try {
      runs.push(await runVisionModel(model.installedName, imageBase64.value, userNote));
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

  const textEvidence = mergeTextEvidence(
    runs,
    ocrResult.status === "fulfilled" ? ocrResult.value : [],
    imageQuality.value
  );
  const visualFindings = mergeFindings(runs, imageQuality.value);
  const analysisConfidence = scoreAnalysis(
    runs,
    visualFindings,
    imageQuality.value
  );
  const reviewNotes = buildReviewNotes(
    runs,
    visualFindings,
    imageQuality.value,
    textEvidence
  );

  if (ocrResult.status === "rejected") {
    reviewNotes.push("OCR text extraction was unavailable; readable labels should be checked manually.");
  }

  if (errors.length) {
    reviewNotes.push(
      `One or more secondary photo assessment checks were unavailable. Completed checks: ${runs.length}.`
    );
  }

  return {
    description: composeDescription(runs, visualFindings, textEvidence),
    model: runs.map((run) => run.model).join(" + "),
    modelsUsed: runs.map((run) => run.model),
    analysisConfidence,
    imageQuality: imageQuality.value,
    reviewNotes,
    visualFindings,
    textEvidence,
  };
}
