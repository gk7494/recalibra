import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const issues = db
      .prepare(
        `
        select
          issues.*,
          (
            select count(*)
            from issue_media
            where issue_media.issue_id = issues.id
          ) as media_count
        from issues
        order by created_at desc
      `
      )
      .all();

    return NextResponse.json({ issues });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load issues.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      insert into issues (
        id,
        title,
        description,
        raw_note,
        location,
        asset_name,
        category,
        severity,
        status,
        recommended_action,
        suggested_assignee_role,
        due_date_priority,
        inspection_type,
        inspection_standard,
        observation,
        hazard_category,
        regulatory_reference,
        affected_area,
        activity_before_event,
        what_happened,
        object_or_substance,
        injury_or_illness,
        exposed_persons,
        likelihood,
        risk_priority,
        immediate_action_taken,
        corrective_action,
        responsible_party,
        verification_status,
        recordkeeping_notes,
        visual_findings,
        created_at,
        updated_at
      ) values (
        @id,
        @title,
        @description,
        @raw_note,
        @location,
        @asset_name,
        @category,
        @severity,
        @status,
        @recommended_action,
        @suggested_assignee_role,
        @due_date_priority,
        @inspection_type,
        @inspection_standard,
        @observation,
        @hazard_category,
        @regulatory_reference,
        @affected_area,
        @activity_before_event,
        @what_happened,
        @object_or_substance,
        @injury_or_illness,
        @exposed_persons,
        @likelihood,
        @risk_priority,
        @immediate_action_taken,
        @corrective_action,
        @responsible_party,
        @verification_status,
        @recordkeeping_notes,
        @visual_findings,
        @created_at,
        @updated_at
      )
    `);

    stmt.run({
      id,
      title: body.title,
      description: body.description || "",
      raw_note: body.raw_note || "",
      location: body.location || "Unknown",
      asset_name: body.asset_name || "Unknown",
      category: body.category || "other",
      severity: body.severity || "medium",
      status: body.status || "open",
      recommended_action: body.recommended_action || "",
      suggested_assignee_role: body.suggested_assignee_role || "",
      due_date_priority: body.due_date_priority || "",
      inspection_type: body.inspection_type || "Field inspection",
      inspection_standard:
        body.inspection_standard || "OSHA-style hazard identification",
      observation: body.observation || body.description || "",
      hazard_category: body.hazard_category || body.category || "other",
      regulatory_reference: body.regulatory_reference || "",
      affected_area: body.affected_area || body.location || "Unknown",
      activity_before_event: body.activity_before_event || "Not reported",
      what_happened: body.what_happened || body.description || "",
      object_or_substance: body.object_or_substance || body.asset_name || "",
      injury_or_illness: body.injury_or_illness || "None reported",
      exposed_persons: body.exposed_persons || "Unknown",
      likelihood: body.likelihood || "possible",
      risk_priority: body.risk_priority || body.due_date_priority || "medium",
      immediate_action_taken: body.immediate_action_taken || "Not reported",
      corrective_action:
        body.corrective_action || body.recommended_action || "",
      responsible_party:
        body.responsible_party || body.suggested_assignee_role || "",
      verification_status: body.verification_status || "open",
      recordkeeping_notes: body.recordkeeping_notes || "",
      visual_findings: JSON.stringify(body.visual_findings || []),
      created_at: now,
      updated_at: now,
    });

    const imagePaths = Array.isArray(body.image_paths) ? body.image_paths : [];

    const mediaStmt = db.prepare(`
      insert into issue_media (
        id,
        issue_id,
        file_path,
        file_type,
        created_at
      ) values (
        @id,
        @issue_id,
        @file_path,
        @file_type,
        @created_at
      )
    `);

    for (const imagePath of imagePaths) {
      if (typeof imagePath !== "string" || !imagePath) continue;

      mediaStmt.run({
        id: uuidv4(),
        issue_id: id,
        file_path: imagePath,
        file_type: "image",
        created_at: now,
      });
    }

    return NextResponse.json({ issue: { id } });
  } catch (error: unknown) {
    console.error("Create issue error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save issue.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
