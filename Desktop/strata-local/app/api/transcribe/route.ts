import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = audio.name.split(".").pop() || "m4a";
    const audioName = `${uuidv4()}.${ext}`;
    const audioPath = path.join(uploadDir, audioName);

    const bytes = await audio.arrayBuffer();
    fs.writeFileSync(audioPath, Buffer.from(bytes));

    await execFileAsync("whisper", [
      audioPath,
      "--model",
      "base",
      "--language",
      "English",
      "--output_format",
      "txt",
      "--output_dir",
      uploadDir,
    ]);

    const transcriptPath = audioPath.replace(`.${ext}`, ".txt");
    const transcript = fs.readFileSync(transcriptPath, "utf-8");

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to transcribe audio locally.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
