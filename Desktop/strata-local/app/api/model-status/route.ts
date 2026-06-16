import { NextResponse } from "next/server";
import {
  getDefaultVisionCandidates,
  getDefaultVisionModelLimit,
  getInstalledOllamaModels,
  pickInstalledCandidates,
  TICKET_MODEL_CANDIDATES,
  VISION_MODEL_CANDIDATES,
} from "@/lib/model-registry";

export async function GET() {
  try {
    const installed = await getInstalledOllamaModels();
    const defaultVisionCandidates = getDefaultVisionCandidates();
    const selectedVisionModels = pickInstalledCandidates(
      installed,
      defaultVisionCandidates
    );
    const visionModels = pickInstalledCandidates(
      installed,
      VISION_MODEL_CANDIDATES
    );
    const ticketModels = pickInstalledCandidates(
      installed,
      TICKET_MODEL_CANDIDATES
    );

    return NextResponse.json({
      installed,
      selected: {
        vision: selectedVisionModels.slice(0, getDefaultVisionModelLimit()),
        ticket: ticketModels.slice(0, 1),
      },
      available: {
        vision: visionModels,
        ticket: ticketModels,
      },
      recommendedDownloads: VISION_MODEL_CANDIDATES.filter(
        (candidate) =>
          !visionModels.some((model) => model.name === candidate.name)
      ).slice(0, 3),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to read model status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
