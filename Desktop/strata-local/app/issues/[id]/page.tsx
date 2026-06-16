"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Save,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import SeverityBadge from "@/components/SeverityBadge";

type IssueStatus = "open" | "in_progress" | "resolved";
type IssueSeverity = "low" | "medium" | "high" | "critical";
type Likelihood = "unlikely" | "possible" | "likely";
type VerificationStatus =
  | "open"
  | "corrected_not_verified"
  | "corrected_verified"
  | "promised_to_correct";

type VisualFinding = {
  label: string;
  observation: string;
  category: string;
  confidence: "low" | "medium" | "high";
  sourceModels?: string[];
  evidenceScore?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  raw_note: string;
  location: string;
  asset_name: string;
  category: string;
  severity: IssueSeverity;
  status: IssueStatus;
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

type IssueMedia = {
  id: string;
  issue_id: string;
  file_path: string;
  file_type: string;
  created_at: string;
};

type WorkForm = {
  severity: IssueSeverity;
  status: IssueStatus;
  risk_priority: string;
  due_date_priority: string;
  responsible_party: string;
  verification_status: VerificationStatus;
  immediate_action_taken: string;
  corrective_action: string;
  recordkeeping_notes: string;
};

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const issueId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [media, setMedia] = useState<IssueMedia[]>([]);
  const [workForm, setWorkForm] = useState<WorkForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchIssue() {
      try {
        setError("");
        const res = await fetch(`/api/issues/${issueId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load issue.");
        }

        if (!ignore) {
          setIssue(data.issue);
          setMedia(data.media || []);
          setWorkForm(createWorkForm(data.issue));
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (issueId) {
      fetchIssue();
    }

    return () => {
      ignore = true;
    };
  }, [issueId]);

  const visualFindings = useMemo(
    () => parseVisualFindings(issue?.visual_findings),
    [issue?.visual_findings]
  );

  async function patchIssue(updates: Partial<WorkForm>) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update issue.");
      }

      setIssue(data.issue);
      setMedia(data.media || []);
      setWorkForm(createWorkForm(data.issue));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function updateWorkForm<K extends keyof WorkForm>(field: K, value: WorkForm[K]) {
    if (!workForm) return;

    setWorkForm({
      ...workForm,
      [field]: value,
    });
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#edf1ef] text-zinc-600">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" size={18} />
          Loading finding...
        </div>
      </main>
    );
  }

  if (!issue || !workForm) {
    return (
      <main className="min-h-screen bg-[#edf1ef] px-4 py-6 text-zinc-950">
        <div className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            <ArrowLeft size={16} />
            Corrective action log
          </Link>
          <p className="font-medium">Finding unavailable</p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf1ef] text-zinc-950">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 lg:px-6">
        <header className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#f8faf8] shadow-sm">
          <div className="px-4 py-4 sm:px-5">
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft size={16} />
              Corrective action log
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={issue.severity} />
                  <StatusBadge status={issue.status} />
                  <VerificationBadge value={issue.verification_status} />
                </div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Inspection finding
                </p>
                <h1 className="mt-1 max-w-4xl text-2xl font-semibold tracking-normal">
                  {displayFindingTitle(issue)}
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                  {issue.location || "Unknown location"} /{" "}
                  {issue.asset_name || "Unknown asset"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["open", "in_progress", "resolved"] as IssueStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => patchIssue({ status })}
                      disabled={saving || issue.status === status}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                        issue.status === status
                          ? "border-[#172018] bg-[#172018] text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 hover:text-emerald-700"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {status === "resolved" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <ClipboardCheck size={16} />
                      )}
                      {status.replaceAll("_", " ")}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-zinc-200 border-t border-zinc-200 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeaderStat
              label="Risk priority"
              value={issue.risk_priority || "Pending"}
            />
            <HeaderStat
              label="Responsible party"
              value={issue.responsible_party || "Unassigned"}
            />
            <HeaderStat
              label="Evidence"
              value={`${media.length} photos / ${visualFindings.length} photo findings`}
            />
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<ShieldAlert size={18} />}
                title="Field summary"
                meta={formatDateTime(issue.created_at)}
              />
              <div className="grid gap-4 p-4 md:grid-cols-3">
                <SummaryTile label="Hazard" value={issue.hazard_category || issue.category} />
                <SummaryTile label="Risk priority" value={issue.risk_priority || "Pending"} />
                <SummaryTile label="Owner" value={issue.responsible_party || "Unassigned"} />
              </div>
              <div className="border-t border-slate-100 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {issue.description || issue.observation || "No summary recorded."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<Camera size={18} />}
                title="Photo log"
                meta={`${media.length} photos, ${visualFindings.length} photo findings`}
              />

              {media.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">
                  No photo evidence linked to this finding.
                </div>
              ) : (
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {media.map((item) => (
                    <EvidenceImage
                      key={item.id}
                      media={item}
                      findings={media.length === 1 ? visualFindings : []}
                    />
                  ))}
                </div>
              )}

              {visualFindings.length > 0 && (
                <div className="border-t border-slate-100 p-4">
                  <div className="flex flex-wrap gap-2">
                    {visualFindings.map((finding) => (
                      <span
                        key={`${finding.label}-${finding.observation}`}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                      >
                        {finding.label}: {finding.observation}
                        {!!finding.sourceModels?.length && (
                          <span className="ml-1 text-amber-700">
                            ({finding.sourceModels.length} check
                            {finding.sourceModels.length === 1 ? "" : "s"})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<FileText size={18} />}
                title="Official report fields"
                meta={issue.inspection_type || "Field inspection"}
              />

              <div className="space-y-5 p-4">
                <ReportSection title="Classification">
                  <ReportGrid>
                    <ReadOnlyField label="Inspection standard" value={issue.inspection_standard} />
                    <ReadOnlyField label="Regulatory reference" value={issue.regulatory_reference} />
                    <ReadOnlyField label="Category" value={issue.category} />
                    <ReadOnlyField label="Likelihood" value={issue.likelihood} />
                  </ReportGrid>
                </ReportSection>

                <ReportSection title="Location and exposure">
                  <ReportGrid>
                    <ReadOnlyField label="Affected area" value={issue.affected_area} />
                    <ReadOnlyField label="Object/substance" value={issue.object_or_substance} />
                    <ReadOnlyField label="Exposed persons" value={issue.exposed_persons} />
                    <ReadOnlyField label="Injury/illness" value={issue.injury_or_illness} />
                  </ReportGrid>
                </ReportSection>

                <ReportSection title="Observation detail">
                  <ReadOnlyBlock label="Observation" value={issue.observation} />
                  <ReadOnlyBlock label="Activity before event" value={issue.activity_before_event} />
                  <ReadOnlyBlock label="What happened" value={issue.what_happened} />
                </ReportSection>

                <ReportSection title="Corrective action record">
                  <ReadOnlyBlock label="Recommended action" value={issue.recommended_action} />
                  <ReadOnlyBlock label="Corrective action" value={issue.corrective_action} />
                  <ReadOnlyBlock label="Immediate action taken" value={issue.immediate_action_taken} />
                  <ReadOnlyBlock label="Recordkeeping notes" value={issue.recordkeeping_notes} />
                </ReportSection>

                <ReportSection title="Original field note">
                  <ReadOnlyBlock label="Raw note" value={issue.raw_note} />
                </ReportSection>
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<Wrench size={18} />}
                title="Work control"
                meta={saving ? "saving" : "ready"}
              />

              <div className="space-y-4 p-4">
                <SelectField
                  label="Severity"
                  value={workForm.severity}
                  options={["low", "medium", "high", "critical"]}
                  onChange={(value) =>
                    updateWorkForm("severity", value as IssueSeverity)
                  }
                />
                <SelectField
                  label="Verification"
                  value={workForm.verification_status}
                  options={[
                    "open",
                    "promised_to_correct",
                    "corrected_not_verified",
                    "corrected_verified",
                  ]}
                  onChange={(value) =>
                    updateWorkForm(
                      "verification_status",
                      value as VerificationStatus
                    )
                  }
                />
                <TextField
                  label="Responsible party"
                  value={workForm.responsible_party}
                  onChange={(value) => updateWorkForm("responsible_party", value)}
                />
                <TextField
                  label="Risk priority"
                  value={workForm.risk_priority}
                  onChange={(value) => updateWorkForm("risk_priority", value)}
                />
                <TextField
                  label="Due date priority"
                  value={workForm.due_date_priority}
                  onChange={(value) => updateWorkForm("due_date_priority", value)}
                />
                <TextAreaField
                  label="Immediate action taken"
                  value={workForm.immediate_action_taken}
                  onChange={(value) =>
                    updateWorkForm("immediate_action_taken", value)
                  }
                />
                <TextAreaField
                  label="Corrective action"
                  value={workForm.corrective_action}
                  onChange={(value) => updateWorkForm("corrective_action", value)}
                />
                <TextAreaField
                  label="Recordkeeping notes"
                  value={workForm.recordkeeping_notes}
                  onChange={(value) =>
                    updateWorkForm("recordkeeping_notes", value)
                  }
                />

                <button
                  type="button"
                  onClick={() => patchIssue(workForm)}
                  disabled={saving}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  Save work state
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-slate-500">
                Audit trail
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <AuditRow label="Created" value={formatDateTime(issue.created_at)} />
                <AuditRow label="Updated" value={formatDateTime(issue.updated_at)} />
                <AuditRow label="Assignee role" value={issue.suggested_assignee_role || "Pending"} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function displayFindingTitle(issue: Issue) {
  const title = issue.title?.trim();
  const genericTitles = new Set(["maintenance ticket", "inspection ticket"]);

  if (title && !genericTitles.has(title.toLowerCase())) {
    return title;
  }

  const asset = issue.asset_name && issue.asset_name !== "Unknown"
    ? issue.asset_name
    : "";
  const category = issue.hazard_category || issue.category || "Inspection";
  const normalizedCategory = category.replaceAll("_", " ");

  return [asset, normalizedCategory].filter(Boolean).join(" - ") || "Inspection finding";
}

function createWorkForm(issue: Issue): WorkForm {
  return {
    severity: issue.severity,
    status: issue.status,
    risk_priority: issue.risk_priority || "",
    due_date_priority: issue.due_date_priority || "",
    responsible_party: issue.responsible_party || "",
    verification_status: issue.verification_status || "open",
    immediate_action_taken: issue.immediate_action_taken || "",
    corrective_action: issue.corrective_action || "",
    recordkeeping_notes: issue.recordkeeping_notes || "",
  };
}

function parseVisualFindings(value?: string) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as VisualFinding[]) : [];
  } catch {
    return [];
  }
}

function EvidenceImage({
  media,
  findings,
}: {
  media: IssueMedia;
  findings: VisualFinding[];
}) {
  const boxedFindings = findings.filter((finding) => finding.bbox);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="relative aspect-video">
        <Image
          src={publicPathFor(media.file_path)}
          alt="Inspection photo"
          fill
          unoptimized
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />

        {boxedFindings.map((finding) => {
          const bbox = finding.bbox;
          if (!bbox) return null;

          return (
            <div
              key={`${finding.label}-${bbox.x}-${bbox.y}`}
              className="absolute border-2 border-red-500 bg-red-500/10"
              style={{
                left: `${bbox.x * 100}%`,
                top: `${bbox.y * 100}%`,
                width: `${bbox.width * 100}%`,
                height: `${bbox.height * 100}%`,
              }}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {finding.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-[#fbfcfb] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-emerald-700">{icon}</span>
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {meta && (
        <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
          {meta}
        </span>
      )}
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">
        {value || "Pending"}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ReportGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value || "Not recorded"}</p>
    </div>
  );
}

function ReadOnlyBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {value || "Not recorded"}
      </p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </label>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const styles = {
    open: "border-emerald-200 bg-emerald-50 text-emerald-700",
    in_progress: "border-sky-200 bg-sky-50 text-sky-700",
    resolved: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function VerificationBadge({ value }: { value?: string }) {
  const verified = value === "corrected_verified";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
        verified
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {value ? value.replaceAll("_", " ") : "verification open"}
    </span>
  );
}

function publicPathFor(filePath: string) {
  const filename = filePath.split(/[\\/]/).pop();
  return filename ? `/api/uploads/${filename}` : "";
}

function formatDateTime(value?: string) {
  if (!value) return "Pending";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
