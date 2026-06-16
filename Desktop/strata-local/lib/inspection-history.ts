import { Issue } from "./types";

export type HistoricalInspectionContext = {
  matchedPatterns: string[];
  similarIssues: Pick<
    Issue,
    | "title"
    | "category"
    | "severity"
    | "location"
    | "asset_name"
    | "recommended_action"
    | "created_at"
  >[];
  guidance: string[];
};

type InspectionPattern = {
  name: string;
  keywords: string[];
  guidance: string[];
};

const INDUSTRIAL_INSPECTION_PATTERNS: InspectionPattern[] = [
  {
    name: "Leak, wet floor, or staining",
    keywords: ["leak", "drip", "wet", "water", "oil", "stain", "puddle"],
    guidance: [
      "Leaks near walk paths are often both equipment and slip hazards.",
      "Field records should call out containment, barricading, source isolation, and cleanup when a floor is wet.",
      "Escalate if the liquid is unknown, near electrical equipment, hot surfaces, or active production lanes.",
    ],
  },
  {
    name: "Electrical exposure or damaged wiring",
    keywords: [
      "wire",
      "wiring",
      "electrical",
      "panel",
      "conduit",
      "spark",
      "breaker",
      "junction",
      "exposed",
    ],
    guidance: [
      "Exposed conductors, open panels, damaged conduit, and water near electrical gear should be treated as high-risk inspection findings.",
      "Recommended action should include isolating the area and assigning qualified electrical maintenance.",
      "Use critical only when there is immediate contact risk, energized exposure, fire risk, or active arcing.",
    ],
  },
  {
    name: "Corrosion, rust, or structural degradation",
    keywords: ["corrosion", "rust", "oxidation", "pitting", "flaking", "crack"],
    guidance: [
      "Corrosion findings often need repeat inspection history because trend and rate of change matter.",
      "Describe whether corrosion appears superficial, on fasteners/supports, or on pressure/structural components.",
      "Escalate if corrosion is on load-bearing supports, pressure boundaries, guarding, stairs, or handrails.",
    ],
  },
  {
    name: "Blocked access or egress",
    keywords: ["blocked", "obstructed", "egress", "exit", "access", "clearance"],
    guidance: [
      "Blocked exits, emergency equipment, panels, eyewash stations, fire extinguishers, and isolation valves are compliance-sensitive.",
      "Recommended action should include clearing access and verifying required clearance.",
      "Escalate blocked emergency exits or blocked life-safety equipment.",
    ],
  },
  {
    name: "Machine guarding or rotating equipment",
    keywords: [
      "guard",
      "unguarded",
      "belt",
      "pulley",
      "coupling",
      "compressor",
      "pump",
      "motor",
      "fan",
    ],
    guidance: [
      "Rotating equipment findings should mention guarding, vibration, leaks, heat, noise, and nearby foot traffic.",
      "If guards are missing or loose, assign mechanical maintenance and restrict access until inspected.",
      "Compressor and pump leaks often have recurring seal, fitting, drain, or lubrication causes.",
    ],
  },
  {
    name: "Housekeeping and contamination",
    keywords: ["debris", "trash", "dust", "spill", "dirty", "contamination", "cleanliness"],
    guidance: [
      "Housekeeping findings should separate cosmetic cleanliness from safety, contamination, pest, or product-quality risk.",
      "Recommended action should include removing debris, cleaning residue, and checking for source recurrence.",
    ],
  },
];

function normalize(text: string) {
  return text.toLowerCase();
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function matchesIssue(issue: Issue, text: string) {
  const values = [
    issue.title,
    issue.description,
    issue.raw_note,
    issue.location,
    issue.asset_name,
    issue.category,
  ];

  return values.some((value) => {
    const normalized = normalize(value || "");
    return (
      normalized.length > 2 &&
      normalized
        .split(/[^a-z0-9]+/)
        .filter((part) => part.length > 3)
        .some((part) => text.includes(part))
    );
  });
}

export function buildHistoricalInspectionContext({
  rawNote,
  imageDescriptions,
  priorIssues,
}: {
  rawNote: string;
  imageDescriptions: string[];
  priorIssues: Issue[];
}): HistoricalInspectionContext {
  const combinedText = normalize(
    [rawNote, ...imageDescriptions].filter(Boolean).join("\n")
  );

  const matchedPatterns = INDUSTRIAL_INSPECTION_PATTERNS.filter((pattern) =>
    hasKeyword(combinedText, pattern.keywords)
  );

  const similarIssues = priorIssues
    .filter((issue) => matchesIssue(issue, combinedText))
    .slice(0, 5)
    .map((issue) => ({
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      location: issue.location,
      asset_name: issue.asset_name,
      recommended_action: issue.recommended_action,
      created_at: issue.created_at,
    }));

  return {
    matchedPatterns: matchedPatterns.map((pattern) => pattern.name),
    similarIssues,
    guidance: matchedPatterns.flatMap((pattern) => pattern.guidance),
  };
}

export function formatHistoricalInspectionContext(
  context: HistoricalInspectionContext
) {
  const sections = [];

  if (context.matchedPatterns.length) {
    sections.push(
      `Matched industrial inspection patterns:\n${context.matchedPatterns
        .map((pattern) => `- ${pattern}`)
        .join("\n")}`
    );
  }

  if (context.guidance.length) {
    sections.push(
      `Historical inspection guidance:\n${context.guidance
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (context.similarIssues.length) {
    sections.push(
      `Similar prior inspection records:\n${context.similarIssues
        .map(
          (issue) =>
            `- ${issue.title} (${issue.category}, ${issue.severity}) at ${issue.location}; asset ${issue.asset_name}; action: ${issue.recommended_action || "not recorded"}`
        )
        .join("\n")}`
    );
  }

  return sections.length
    ? sections.join("\n\n")
    : "No matched historical inspection patterns or similar prior records.";
}
