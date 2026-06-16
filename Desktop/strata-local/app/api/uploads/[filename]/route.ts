import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getContentType(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filepath = path.join(process.cwd(), "data", "uploads", filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filepath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": getContentType(filename),
    },
  });
}
