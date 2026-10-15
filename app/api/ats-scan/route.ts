import { NextResponse } from "next/server"
import { requestJsonFromProviders } from "@/lib/ai-json"
import { ALGORITHM_SYSTEM_PROMPT, AtsScan, buildAtsScanPrompt, parseAtsScan } from "@/lib/resume-algorithm"

// Stage 3 of the tailoring algorithm, as its own request.
//
// Stages 1 and 2 (recruiter audit, then rewrite) already take most of a
// serverless function's time budget, so running the scan in the same request
// meant it was usually skipped. Here the preview page calls this once the
// resume is on screen, and the panel fills in a moment later.
export const maxDuration = 120

export async function POST(request: Request) {
  let payload: { jobDescription?: string; resumeText?: string }
  try {
    payload = (await request.json()) as { jobDescription?: string; resumeText?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  const jobDescription = payload.jobDescription?.trim() || ""
  const resumeText = payload.resumeText?.trim() || ""
  if (!resumeText) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 })
  }
  if (!jobDescription) {
    // Without a posting there is nothing to be skipped relative to.
    return NextResponse.json({ error: "jobDescription is required" }, { status: 400 })
  }

  const result = await requestJsonFromProviders<AtsScan>({
    system: ALGORITHM_SYSTEM_PROMPT,
    prompt: buildAtsScanPrompt({ jobDescription, resumeText }),
    maxTokens: 8000,
    timeoutMs: 100_000,
    parse: parseAtsScan,
  })

  if (!result) {
    return NextResponse.json({ error: "No AI provider was able to run the scan." }, { status: 502 })
  }

  return NextResponse.json({ scan: result.data, modelUsed: result.model })
}
