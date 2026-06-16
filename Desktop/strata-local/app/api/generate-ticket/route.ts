import { NextRequest, NextResponse } from "next/server";
import { generateTicketWithOllama } from "@/lib/ollama";
import { db } from "@/lib/db";
import {
  buildHistoricalInspectionContext,
  formatHistoricalInspectionContext,
} from "@/lib/inspection-history";
import { Issue, TextEvidence, VisualFinding } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawNote = body.rawNote || "";
    const imageDescriptions: string[] = body.imageDescriptions || [];
    const visualFindings: VisualFinding[] = body.visualFindings || [];
    const textEvidence: TextEvidence[] = body.textEvidence || [];

    if (!rawNote.trim() && imageDescriptions.length === 0) {
      return NextResponse.json(
        { error: "Please enter a field note or upload a photo." },
        { status: 400 }
      );
    }

    const priorIssues = db
      .prepare("select * from issues order by created_at desc limit 100")
      .all() as Issue[];
    const inspectionContext = buildHistoricalInspectionContext({
      rawNote,
      imageDescriptions,
      priorIssues,
    });
    const inspectionContextText =
      formatHistoricalInspectionContext(inspectionContext);

    const ticket = await generateTicketWithOllama(
      rawNote,
      imageDescriptions,
      inspectionContextText,
      visualFindings,
      textEvidence
    );

    return NextResponse.json({ ticket, inspectionContext });
  } catch (error: unknown) {
    console.error("Generate ticket error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to prepare inspection record. Check the local workstation service.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
