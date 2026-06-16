import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const editableFields = [
  "status",
  "severity",
  "risk_priority",
  "due_date_priority",
  "responsible_party",
  "verification_status",
  "immediate_action_taken",
  "corrective_action",
  "recordkeeping_notes",
] as const;

type EditableField = (typeof editableFields)[number];

const validStatus = new Set(["open", "in_progress", "resolved"]);
const validSeverity = new Set(["low", "medium", "high", "critical"]);
const validVerification = new Set([
  "open",
  "promised_to_correct",
  "corrected_not_verified",
  "corrected_verified",
]);

function getIssuePayload(id: string) {
  const issue = db.prepare("select * from issues where id = ?").get(id);

  if (!issue) {
    return null;
  }

  const media = db
    .prepare("select * from issue_media where issue_id = ? order by created_at asc")
    .all(id);

  return { issue, media };
}

function isEditableField(field: string): field is EditableField {
  return editableFields.includes(field as EditableField);
}

function validateField(field: EditableField, value: unknown) {
  if (field === "status" && !validStatus.has(String(value))) {
    return "Invalid status.";
  }

  if (field === "severity" && !validSeverity.has(String(value))) {
    return "Invalid severity.";
  }

  if (
    field === "verification_status" &&
    !validVerification.has(String(value))
  ) {
    return "Invalid verification status.";
  }

  return "";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getIssuePayload(id);

    if (!payload) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load issue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const updates = Object.keys(body).filter(isEditableField);

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No editable fields supplied." },
        { status: 400 }
      );
    }

    for (const field of updates) {
      const validationError = validateField(field, body[field]);

      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const values: Record<string, string> = {
      id,
      updated_at: now,
    };
    const assignments = updates.map((field) => {
      values[field] = body[field] === null ? "" : String(body[field] ?? "");
      return `${field} = @${field}`;
    });

    const result = db
      .prepare(
        `
        update issues
        set ${assignments.join(", ")},
            updated_at = @updated_at
        where id = @id
      `
      )
      .run(values);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    return NextResponse.json(getIssuePayload(id));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update issue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
