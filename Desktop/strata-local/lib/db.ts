import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "strata.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  create table if not exists issues (
    id text primary key,
    title text not null,
    description text,
    raw_note text,
    location text,
    asset_name text,
    category text,
    severity text check (severity in ('low', 'medium', 'high', 'critical')),
    status text default 'open' check (status in ('open', 'in_progress', 'resolved')),
    recommended_action text,
    suggested_assignee_role text,
    due_date_priority text,
    inspection_type text,
    inspection_standard text,
    observation text,
    hazard_category text,
    regulatory_reference text,
    affected_area text,
    activity_before_event text,
    what_happened text,
    object_or_substance text,
    injury_or_illness text,
    exposed_persons text,
    likelihood text,
    risk_priority text,
    immediate_action_taken text,
    corrective_action text,
    responsible_party text,
    verification_status text,
    recordkeeping_notes text,
    visual_findings text,
    created_at text not null,
    updated_at text not null
  );

  create table if not exists issue_media (
    id text primary key,
    issue_id text not null,
    file_path text not null,
    file_type text,
    created_at text not null,
    foreign key(issue_id) references issues(id) on delete cascade
  );

  create table if not exists comments (
    id text primary key,
    issue_id text not null,
    body text not null,
    created_at text not null,
    foreign key(issue_id) references issues(id) on delete cascade
  );
`);

const issueColumns = db
  .prepare("pragma table_info(issues)")
  .all() as { name: string }[];
const existingIssueColumns = new Set(issueColumns.map((column) => column.name));

const migrations: Record<string, string> = {
  inspection_type: "alter table issues add column inspection_type text",
  inspection_standard: "alter table issues add column inspection_standard text",
  observation: "alter table issues add column observation text",
  hazard_category: "alter table issues add column hazard_category text",
  regulatory_reference: "alter table issues add column regulatory_reference text",
  affected_area: "alter table issues add column affected_area text",
  activity_before_event: "alter table issues add column activity_before_event text",
  what_happened: "alter table issues add column what_happened text",
  object_or_substance: "alter table issues add column object_or_substance text",
  injury_or_illness: "alter table issues add column injury_or_illness text",
  exposed_persons: "alter table issues add column exposed_persons text",
  likelihood: "alter table issues add column likelihood text",
  risk_priority: "alter table issues add column risk_priority text",
  immediate_action_taken: "alter table issues add column immediate_action_taken text",
  corrective_action: "alter table issues add column corrective_action text",
  responsible_party: "alter table issues add column responsible_party text",
  verification_status: "alter table issues add column verification_status text",
  recordkeeping_notes: "alter table issues add column recordkeeping_notes text",
  visual_findings: "alter table issues add column visual_findings text",
};

for (const [column, statement] of Object.entries(migrations)) {
  if (!existingIssueColumns.has(column)) {
    db.exec(statement);
  }
}
