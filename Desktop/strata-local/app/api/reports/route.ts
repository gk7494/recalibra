import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const issues = db
      .prepare("select * from issues order by created_at desc limit 50")
      .all();

    const prompt = `
Create a concise Strata weekly operations report from these local inspection records.

Include:
1. Executive summary
2. Critical/high open issues
3. Most common categories
4. Recommended next steps

Tickets:
${JSON.stringify(issues, null, 2)}
`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2:3b",
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Ollama report generation failed.");
    }

    const data = await response.json();

    return NextResponse.json({ report: data.response });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate report.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
