"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Clock3,
  ExternalLink,
  Factory,
  FilePlus2,
  Gauge,
  HardHat,
  MapPin,
  RadioTower,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import SeverityBadge from "@/components/SeverityBadge";

type IssueStatus = "open" | "in_progress" | "resolved";
type IssueSeverity = "low" | "medium" | "high" | "critical";
type FilterKey =
  | "all"
  | "open"
  | "escalated"
  | "in_progress"
  | "needs_owner"
  | "unverified";

type Issue = {
  id: string;
  title: string;
  description?: string;
  location: string;
  asset_name: string;
  category: string;
  hazard_category?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  risk_priority?: string;
  due_date_priority?: string;
  responsible_party?: string;
  verification_status?: string;
  immediate_action_taken?: string;
  corrective_action?: string;
  media_count?: number;
  created_at: string;
  updated_at?: string;
};

type ModelStatus = {
  backend?: {
    vision?: {
      mode: "local" | "worker" | "docker" | "remote";
      baseUrl: string;
    };
  };
  selected?: {
    vision?: Array<{
      label: string;
      installedName: string;
    }>;
  };
};

const filterLabels: Record<FilterKey, string> = {
  all: "All",
  open: "Open",
  escalated: "High risk",
  in_progress: "In work",
  needs_owner: "Needs owner",
  unverified: "Verification open",
};

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let ignore = false;

    async function fetchIssues() {
      try {
        const res = await fetch("/api/issues");
        const data = await res.json();

        if (!ignore) {
          setIssues(data.issues || []);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchIssues();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchModelStatus() {
      try {
        const res = await fetch("/api/model-status");
        const data = await res.json();

        if (!ignore && res.ok) {
          setModelStatus(data);
        }
      } catch {
        if (!ignore) {
          setModelStatus(null);
        }
      }
    }

    fetchModelStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const open = issues.filter((issue) => issue.status === "open").length;
    const escalated = issues.filter((issue) =>
      ["critical", "high"].includes(issue.severity)
    ).length;
    const unverified = issues.filter(
      (issue) => issue.verification_status !== "corrected_verified"
    ).length;
    const needsOwner = issues.filter((issue) => !issue.responsible_party).length;
    const active = issues.filter((issue) => issue.status !== "resolved").length;
    const withEvidence = issues.filter((issue) => Number(issue.media_count) > 0)
      .length;

    return { open, escalated, unverified, needsOwner, active, withEvidence };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "open" && issue.status === "open") ||
        (activeFilter === "escalated" &&
          ["critical", "high"].includes(issue.severity)) ||
        (activeFilter === "in_progress" && issue.status === "in_progress") ||
        (activeFilter === "needs_owner" && !issue.responsible_party) ||
        (activeFilter === "unverified" &&
          issue.verification_status !== "corrected_verified");

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [
        issue.title,
        issue.description,
        issue.location,
        issue.asset_name,
        issue.category,
        issue.hazard_category,
        issue.responsible_party,
        issue.risk_priority,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [activeFilter, issues, query]);

  const filterCounts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: issues.length,
      open: issues.filter((issue) => issue.status === "open").length,
      escalated: issues.filter((issue) =>
        ["critical", "high"].includes(issue.severity)
      ).length,
      in_progress: issues.filter((issue) => issue.status === "in_progress")
        .length,
      needs_owner: issues.filter((issue) => !issue.responsible_party).length,
      unverified: issues.filter(
        (issue) => issue.verification_status !== "corrected_verified"
      ).length,
    }),
    [issues]
  );

  const activeIssues = issues.filter((issue) => issue.status !== "resolved");
  const watchlist = activeIssues
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 4);
  const visionBackendMode = modelStatus?.backend?.vision?.mode;
  const visionModel = modelStatus?.selected?.vision?.[0]?.label;
  const photoProcessingStatus =
    visionBackendMode && visionModel
      ? `${formatBackendMode(visionBackendMode)} / ${visionModel}`
      : "Checking";

  return (
    <main className="min-h-screen bg-[#edf1ef] text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-[#141b18] px-5 py-5 text-white lg:block">
          <div className="mb-7 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#f5c542] text-[#172018]">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold">Strata</p>
              <p className="text-xs text-zinc-400">Field operations</p>
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            <Link
              href="/"
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 font-medium text-[#172018]"
            >
              <span className="flex items-center gap-2">
                <ClipboardList size={16} />
                Corrective action log
              </span>
              <span className="rounded-md bg-[#f5c542] px-1.5 py-0.5 text-xs">
                {metrics.active}
              </span>
            </Link>
            <Link
              href="/issue/new"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              <FilePlus2 size={16} />
              New field record
            </Link>
            <Link
              href="/model-worker"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              <RadioTower size={16} />
              Model worker
            </Link>
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-medium uppercase text-zinc-400">
              Station status
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <SystemRow label="Photo processing" value={photoProcessingStatus} positive />
              <SystemRow label="Records" value="Local database" />
              <SystemRow label="Connectivity" value="Offline ready" positive />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#f5c542]/30 bg-[#f5c542]/10 p-4">
            <div className="flex items-center gap-2 text-[#f5c542]">
              <RadioTower size={17} />
              <p className="text-xs font-semibold uppercase">Turnover list</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-200">
              Open corrective actions, assigned owners, photo evidence, and verification status.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-3 sm:px-5 lg:px-6">
          <header className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#f8faf8] shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#172018] text-[#f5c542] lg:hidden">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Strata
                      </p>
                      <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
                        Field station
                      </span>
                    </div>
                    <h1 className="mt-1 text-xl font-semibold tracking-normal text-zinc-950 sm:text-2xl">
                      Inspection register
                    </h1>
                  </div>
                </div>

                <Link
                  href="/issue/new"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#172018] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#25312b]"
                >
                  <FilePlus2 size={17} />
                  New field record
                </Link>
              </div>
            </div>

            <div className="grid gap-0 divide-y divide-zinc-200 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <HeaderStat
                icon={<Activity size={16} />}
                label="Active findings"
                value={`${metrics.active} findings`}
              />
              <HeaderStat
                icon={<Factory size={16} />}
                label="Photos on file"
                value={`${metrics.withEvidence}/${issues.length || 0}`}
              />
              <HeaderStat
                icon={<HardHat size={16} />}
                label="Owner gaps"
                value={`${metrics.needsOwner} unassigned`}
              />
            </div>
          </header>

          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              title="Open"
              value={metrics.open}
              tone="emerald"
              icon={<Clock3 size={18} />}
            />
            <MetricCard
              title="High risk"
              value={metrics.escalated}
              tone="red"
              icon={<AlertTriangle size={18} />}
            />
            <MetricCard
              title="Awaiting verification"
              value={metrics.unverified}
              tone="amber"
              icon={<Gauge size={18} />}
            />
            <MetricCard
              title="Needs owner"
              value={metrics.needsOwner}
              tone="blue"
              icon={<UserRoundCheck size={18} />}
            />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-[#fbfcfb] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-[#f5c542]" />
                      <h2 className="text-sm font-semibold text-zinc-950">
                        Corrective action log
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {loading
                        ? "Loading"
                        : `${filteredIssues.length} shown of ${issues.length} findings`}
                    </p>
                  </div>

                  <div className="relative w-full lg:w-96">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search area, asset, owner, hazard"
                      className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
                  {(Object.keys(filterLabels) as FilterKey[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                        activeFilter === filter
                          ? "border-[#172018] bg-[#172018] text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      {filterLabels[filter]}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs ${
                          activeFilter === filter
                            ? "bg-white/15 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {filterCounts[filter]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="p-4 text-sm text-zinc-500">
                  Loading findings...
                </div>
              ) : issues.length === 0 ? (
                <div className="grid min-h-64 place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto mb-3 grid size-11 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                      <ClipboardList size={21} />
                    </div>
                    <p className="font-medium text-zinc-900">
                      No findings recorded
                    </p>
                    <Link
                      href="/issue/new"
                      className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#172018] px-3 text-sm font-medium text-white hover:bg-[#25312b]"
                    >
                      <FilePlus2 size={16} />
                      New field record
                    </Link>
                  </div>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  No findings match the active filter.
                </div>
              ) : (
                <>
                  <div className="hidden min-w-0 overflow-x-auto md:block">
                    <table className="w-full min-w-[1000px] text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Finding</th>
                          <th className="px-4 py-3 font-semibold">
                            Area / Asset
                          </th>
                          <th className="px-4 py-3 font-semibold">Risk</th>
                          <th className="px-4 py-3 font-semibold">Owner</th>
                          <th className="px-4 py-3 font-semibold">
                            Work state
                          </th>
                          <th className="px-4 py-3 font-semibold">Age</th>
                          <th className="px-4 py-3 font-semibold">Open</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredIssues.map((issue) => (
                          <tr
                            key={issue.id}
                            className="bg-white hover:bg-[#f7faf8]"
                          >
                            <td className="max-w-[340px] px-4 py-3.5">
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 h-10 w-1 shrink-0 rounded-full ${priorityBar(issue.severity)}`}
                                />
                                <div className="min-w-0">
                                  <Link
                                    href={`/issues/${issue.id}`}
                                    className="block truncate font-semibold text-zinc-950 hover:text-emerald-700"
                                  >
                                    {displayFindingTitle(issue)}
                                  </Link>
                                  <p className="mt-1 truncate text-xs text-zinc-500">
                                    {issue.hazard_category ||
                                      issue.category ||
                                      "Unclassified"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-700">
                              <p className="font-medium">
                                {issue.location || "Unknown"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {issue.asset_name || "Unknown asset"}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col items-start gap-2">
                                <SeverityBadge severity={issue.severity} />
                                <span className="text-xs font-medium text-zinc-500">
                                  {issue.risk_priority ||
                                    issue.due_date_priority ||
                                    "priority pending"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-700">
                              {issue.responsible_party || "Unassigned"}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-2">
                                <StatusBadge status={issue.status} />
                                <VerificationBadge
                                  value={issue.verification_status}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600">
                              {formatAge(issue.created_at)}
                            </td>
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/issues/${issue.id}`}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-emerald-600 hover:text-emerald-700"
                                aria-label={`Open ${displayFindingTitle(issue)}`}
                              >
                                <ExternalLink size={16} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-zinc-100 md:hidden">
                    {filteredIssues.map((issue) => (
                      <FindingCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-200 bg-[#fbfcfb] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Risk queue
                      </p>
                      <h2 className="mt-1 text-sm font-semibold text-zinc-950">
                        Highest-risk open items
                      </h2>
                    </div>
                    <div className="grid size-9 place-items-center rounded-lg bg-[#172018] text-[#f5c542]">
                      <HardHat size={18} />
                    </div>
                  </div>
                </div>

                {watchlist.length > 0 ? (
                  <div className="space-y-3 p-3">
                    {watchlist.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="block rounded-lg border border-zinc-200 bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <SeverityBadge severity={issue.severity} />
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                            {formatAge(issue.created_at)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                          {displayFindingTitle(issue)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {issue.location || "Unknown area"}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-zinc-500">
                    No active findings in the register.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Turnover checklist
                </p>
                <div className="mt-3 space-y-3 text-sm text-zinc-700">
                  <FocusRow
                    label="Critical open"
                    value={
                      issues.filter(
                        (issue) =>
                          issue.severity === "critical" &&
                          issue.status !== "resolved"
                      ).length
                    }
                  />
                  <FocusRow label="Unassigned" value={metrics.needsOwner} />
                  <FocusRow label="Verification open" value={metrics.unverified} />
                  <FocusRow label="Photos attached" value={metrics.withEvidence} />
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function FindingCard({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="block bg-white p-4 hover:bg-[#f7faf8]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-zinc-950">
            {displayFindingTitle(issue)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <MapPin size={13} />
            <span className="truncate">{issue.location || "Unknown area"}</span>
          </p>
        </div>
        <SeverityBadge severity={issue.severity} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
        <InfoPill label="Asset" value={issue.asset_name || "Unknown"} />
        <InfoPill
          label="Owner"
          value={issue.responsible_party || "Unassigned"}
        />
        <InfoPill label="Status" value={issue.status.replaceAll("_", " ")} />
        <InfoPill label="Age" value={formatAge(issue.created_at)} />
      </div>
    </Link>
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

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "red" | "amber" | "blue";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-zinc-500 sm:text-sm sm:normal-case">
          {title}
        </p>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg border ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#edf1ef] text-zinc-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="truncate text-sm font-semibold text-zinc-950">{value}</p>
      </div>
    </div>
  );
}

function SystemRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span className={positive ? "font-medium text-[#f5c542]" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const styles = {
    open: "border-emerald-200 bg-emerald-50 text-emerald-700",
    in_progress: "border-cyan-200 bg-cyan-50 text-cyan-700",
    resolved: "border-zinc-200 bg-zinc-50 text-zinc-600",
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

function FocusRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-zinc-950">{value}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5">
      <p className="text-[11px] font-semibold uppercase text-zinc-500">
        {label}
      </p>
      <p className="truncate font-medium text-zinc-800">{value}</p>
    </div>
  );
}

function priorityBar(severity: IssueSeverity) {
  const styles = {
    low: "bg-emerald-400",
    medium: "bg-amber-400",
    high: "bg-orange-500",
    critical: "bg-red-600",
  };

  return styles[severity];
}

function severityRank(severity: IssueSeverity) {
  const ranks = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return ranks[severity];
}

function formatBackendMode(mode: "local" | "worker" | "docker" | "remote") {
  if (mode === "docker") return "Docker worker";
  if (mode === "worker") return "Model worker";
  if (mode === "remote") return "GPU worker";
  return "Local";
}

function formatAge(value: string) {
  if (!value) return "No date";

  const created = new Date(value).getTime();
  const diffMs = Date.now() - created;
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
