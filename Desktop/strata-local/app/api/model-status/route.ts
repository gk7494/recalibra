import { NextResponse } from "next/server";
import {
  getDefaultVisionCandidates,
  getDefaultVisionModelLimit,
  getInstalledOllamaModels,
  pickInstalledCandidates,
  TICKET_MODEL_CANDIDATES,
  VISION_MODEL_CANDIDATES,
} from "@/lib/model-registry";
import { getOllamaBackendInfo } from "@/lib/inference-backend";

export async function GET() {
  try {
    const [visionInstalled, ticketInstalled] = await Promise.all([
      getInstalledOllamaModels("vision"),
      getInstalledOllamaModels("ticket"),
    ]);
    const defaultVisionCandidates = getDefaultVisionCandidates();
    const selectedVisionModels = pickInstalledCandidates(
      visionInstalled,
      defaultVisionCandidates
    );
    const visionModels = pickInstalledCandidates(
      visionInstalled,
      VISION_MODEL_CANDIDATES
    );
    const ticketModels = pickInstalledCandidates(
      ticketInstalled,
      TICKET_MODEL_CANDIDATES
    );

    return NextResponse.json({
      backend: {
        vision: getOllamaBackendInfo("vision"),
        ticket: getOllamaBackendInfo("ticket"),
      },
      installed: {
        vision: visionInstalled,
        ticket: ticketInstalled,
      },
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
