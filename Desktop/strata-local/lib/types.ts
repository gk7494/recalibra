export type Severity = "low" | "medium" | "high" | "critical";
export type Status = "open" | "in_progress" | "resolved";
export type Likelihood = "unlikely" | "possible" | "likely";
export type VerificationStatus =
  | "open"
  | "corrected_not_verified"
  | "corrected_verified"
  | "promised_to_correct";

export type VisualFinding = {
  label: string;
  observation: string;
  category: string;
  confidence: "low" | "medium" | "high";
  visibleEvidence?: string[];
  recommendedVerification?: string;
  actionHint?: string;
  verification?: "accepted" | "review" | "field_verify";
  qualityFlags?: string[];
  sourceModels?: string[];
  evidenceScore?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  raw_note: string;
  location: string;
  asset_name: string;
  category: string;
  severity: Severity;
  status: Status;
  recommended_action: string;
  suggested_assignee_role: string;
  due_date_priority: string;
  inspection_type: string;
  inspection_standard: string;
  observation: string;
  hazard_category: string;
  regulatory_reference: string;
  affected_area: string;
  activity_before_event: string;
  what_happened: string;
  object_or_substance: string;
  injury_or_illness: string;
  exposed_persons: string;
  likelihood: Likelihood;
  risk_priority: string;
  immediate_action_taken: string;
  corrective_action: string;
  responsible_party: string;
  verification_status: VerificationStatus;
  recordkeeping_notes: string;
  visual_findings: string;
  created_at: string;
  updated_at: string;
};

export type IssueMedia = {
  id: string;
  issue_id: string;
  file_path: string;
  file_type: string;
  created_at: string;
};

export type GeneratedTicket = {
  title: string;
  description: string;
  location: string;
  asset_name: string;
  category: string;
  severity: Severity;
  recommended_action: string;
  suggested_assignee_role: string;
  due_date_priority: string;
  inspection_type: string;
  inspection_standard: string;
  observation: string;
  hazard_category: string;
  regulatory_reference: string;
  affected_area: string;
  activity_before_event: string;
  what_happened: string;
  object_or_substance: string;
  injury_or_illness: string;
  exposed_persons: string;
  likelihood: Likelihood;
  risk_priority: string;
  immediate_action_taken: string;
  corrective_action: string;
  responsible_party: string;
  verification_status: VerificationStatus;
  recordkeeping_notes: string;
  visual_findings: VisualFinding[];
};
