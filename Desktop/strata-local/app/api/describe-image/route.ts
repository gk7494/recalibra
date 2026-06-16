import { NextRequest, NextResponse } from "next/server";
import { describeImageWithLlava } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64 || "";

    if (!imageBase64.trim()) {
      return NextResponse.json(
        { error: "Please provide imageBase64." },
        { status: 400 }
      );
    }

    const description = await describeImageWithLlava(imageBase64);

    return NextResponse.json({ description });
  } catch (error: unknown) {
    console.error("Describe image error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to describe image locally. Make sure Ollama is running and llava:7b is pulled.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
