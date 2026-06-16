import { NextRequest, NextResponse } from "next/server";
import { analyzeImageWithOllama } from "@/lib/vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const imagePaths: string[] = body.imagePaths || [];
    const rawNote: string = body.rawNote || "";

    if (!imagePaths.length) {
      return NextResponse.json(
        { error: "No image paths provided." },
        { status: 400 }
      );
    }

    const descriptions = [];

    for (const imagePath of imagePaths) {
      const analysis = await analyzeImageWithOllama(imagePath, rawNote);
      descriptions.push({
        imagePath,
        description: analysis.description,
        model: analysis.model,
        modelsUsed: analysis.modelsUsed,
        analysisConfidence: analysis.analysisConfidence,
        reviewNotes: analysis.reviewNotes,
        visualFindings: analysis.visualFindings,
      });
    }

    return NextResponse.json({ descriptions });
  } catch (error: unknown) {
    console.error("Analyze image error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze image locally.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
