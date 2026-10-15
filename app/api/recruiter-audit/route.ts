import { NextResponse } from "next/server"
import { requestJsonFromProviders } from "@/lib/ai-json"
import {
  ALGORITHM_SYSTEM_PROMPT,
  RecruiterAudit,
  buildRecruiterAuditPrompt,
  parseRecruiterAudit,
} from "@/lib/resume-algorithm"

// Stage 1 of the tailoring algorithm: a senior recruiter for this exact role
// scores the profile, names the missing keywords, and lists the red flags a
// hiring manager spots in a ten-second skim.
//
// Its own request because all three stages in one call overran the serverless
// time limit — and because the student should see the verdict before the
// rewrite starts, not after. The result is passed back into
// /api/generate-resume, which rewrites against it.
export const maxDuration = 120

export async function POST(request: Request) {
  let payload: { jobDescription?: string; profileText?: string; jobTitle?: string; company?: string }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  const jobDescription = payload.jobDescription?.trim() || ""
  const profileText = payload.profileText?.trim() || ""
  if (!jobDescription) return NextResponse.json({ error: "jobDescription is required" }, { status: 400 })
  if (!profileText) return NextResponse.json({ error: "profileText is required" }, { status: 400 })

  const result = await requestJsonFromProviders<RecruiterAudit>({
    system: ALGORITHM_SYSTEM_PROMPT,
    prompt: buildRecruiterAuditPrompt({
      jobDescription,
      profileText,
      jobTitle: payload.jobTitle,
      company: payload.company,
    }),
    maxTokens: 4000,
    timeoutMs: 95_000,
    parse: parseRecruiterAudit,
  })

  if (!result) {
    return NextResponse.json({ error: "No AI provider was able to run the audit." }, { status: 502 })
  }

  return NextResponse.json({ audit: result.data, modelUsed: result.model })
}
