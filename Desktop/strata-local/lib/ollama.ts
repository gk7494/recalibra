import { GeneratedTicket, VisualFinding } from "./types";
import { resolveTicketModels, resolveVisionModels } from "./model-registry";

export async function describeImageWithLlava(
  imageBase64: string
): Promise<string> {
  let lastError = "";
  const models = await resolveVisionModels(1);

  for (const model of models) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.installedName,
        prompt:
          "Describe visible maintenance-relevant issues in this industrial inspection image. Be concise, focus on visible evidence, and do not speculate.",
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      lastError = await response.text();
      continue;
    }

    const data = await response.json();
    return data.response || "";
  }

  throw new Error(
    lastError ||
      "Ollama vision request failed. Make sure qwen2.5vl:7b, gemma3:12b, llama3.2-vision, or llava:7b is pulled."
  );
}

export async function generateTicketWithOllama(
  rawNote: string,
  imageDescriptions: string[] = [],
  historicalInspectionContext = "",
  visualFindings: VisualFinding[] = []
): Promise<GeneratedTicket> {
  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      location: { type: "string" },
      asset_name: { type: "string" },
      category: { type: "string" },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
      },
      recommended_action: { type: "string" },
      suggested_assignee_role: { type: "string" },
      due_date_priority: { type: "string" },
      inspection_type: { type: "string" },
      inspection_standard: { type: "string" },
      observation: { type: "string" },
      hazard_category: { type: "string" },
      regulatory_reference: { type: "string" },
      affected_area: { type: "string" },
      activity_before_event: { type: "string" },
      what_happened: { type: "string" },
      object_or_substance: { type: "string" },
      injury_or_illness: { type: "string" },
      exposed_persons: { type: "string" },
      likelihood: {
        type: "string",
        enum: ["unlikely", "possible", "likely"],
      },
      risk_priority: { type: "string" },
      immediate_action_taken: { type: "string" },
      corrective_action: { type: "string" },
      responsible_party: { type: "string" },
      verification_status: {
        type: "string",
        enum: [
          "open",
          "corrected_not_verified",
          "corrected_verified",
          "promised_to_correct",
        ],
      },
      recordkeeping_notes: { type: "string" },
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
    required: [
      "title",
      "description",
      "location",
      "asset_name",
      "category",
      "severity",
      "recommended_action",
      "suggested_assignee_role",
      "due_date_priority",
      "inspection_type",
      "inspection_standard",
      "observation",
      "hazard_category",
      "regulatory_reference",
      "affected_area",
      "activity_before_event",
      "what_happened",
      "object_or_substance",
      "injury_or_illness",
      "exposed_persons",
      "likelihood",
      "risk_priority",
      "immediate_action_taken",
      "corrective_action",
      "responsible_party",
      "verification_status",
      "recordkeeping_notes",
      "visual_findings",
    ],
  };

  const prompt = `
Generate a structured Strata inspection record for facilities, maintenance, EHS, and operations teams.

Turn the field observation into a structured inspection and corrective-action record.

Inputs:
1. User field note
2. Image-evidence descriptions from uploaded photos
3. Historical industrial inspection context and similar prior records
4. Structured visual findings with optional bounding boxes

Rules:
- Return only valid JSON.
- Do not include markdown.
- Do not exaggerate severity.
- Critical should be rare. Only use critical if there is immediate safety risk, shutdown risk, exposed electricity, blocked emergency exit, or active major leak.
- If unsure, use "medium".
- If location or asset is missing, write "Unknown".
- The image description is only observational evidence, not a final decision.
- Prefer findings confirmed by multiple photo observations or high-confidence visual findings.
- Low-confidence visual findings should be described as needing verification, not as established fact.
- Historical inspection context is supporting guidance. Use it to ask for the right maintenance action, not to invent facts.
- Recommended action should be practical for a maintenance or operations team.
- If the user note and image description conflict, mention uncertainty in the description.
- If similar prior records exist, mention recurrence or prior pattern only when it is relevant to the asset, location, or issue category.
- Use official inspection-report style fields:
  - OSHA/NIOSH self-inspection header: company or facility, worksite, specific worksite area, inspected by, date.
  - OSHA-style hazard identification: observation, checklist category, affected area, exposed persons, severity, likelihood, risk priority, interim controls, corrective action, responsible party.
  - OSHA 301-style incident detail when relevant: activity before event, what happened, object/substance, injury/illness.
  - Corrective-action tracking: immediate action, durable corrective action, owner, due-date priority, and verification status.
- regulatory_reference should be a broad inspection basis like "OSHA/NIOSH self-inspection - walking-working surface/slip hazard". Do not invent exact code citations.
- inspection_standard should say the field basis used, such as "OSHA/NIOSH self-inspection / field hazard identification".
- verification_status should usually be "open" at ticket creation unless the note says the issue was already corrected.
- immediate_action_taken should record temporary controls already taken or "Not reported".
- corrective_action should be the durable fix to verify later.
- visual_findings should copy the provided structured visual findings when useful; keep bounding boxes unchanged.

Categories:
- leak
- electrical
- machine guarding
- lockout/tagout
- walking-working surface
- access/egress
- fire protection
- hazard communication
- compressed gas
- PPE
- materials handling
- corrosion
- housekeeping
- structural damage
- inspection finding
- other

Severity definitions:
- low: cosmetic or non-urgent
- medium: needs follow-up but not immediately blocking
- high: affects operations, safety, or compliance
- critical: immediate shutdown, safety, or compliance risk

User field note:
${rawNote || "None"}

Image observations:
${
  imageDescriptions.length
    ? imageDescriptions.map((d, i) => `Image ${i + 1}: ${d}`).join("\n")
    : "None"
}

Historical industrial inspection context:
${historicalInspectionContext || "None"}

Structured visual findings:
${
  visualFindings.length
    ? JSON.stringify(visualFindings, null, 2)
    : "None"
}
`;

  const models = await resolveTicketModels();
  let lastError = "";

  for (const model of models) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.installedName,
        prompt,
        stream: false,
        format: schema,
        options: {
          temperature: 0,
          top_p: 0.8,
        },
      }),
    });

    if (!response.ok) {
      lastError = await response.text();
      continue;
    }

    const data = await response.json();

    try {
      return JSON.parse(data.response);
    } catch {
      console.error("Bad model response:", data.response);
      lastError = `${model.installedName} returned invalid JSON.`;
    }
  }

  throw new Error(
    lastError || "Ollama request failed. Make sure Ollama is running."
  );
}
