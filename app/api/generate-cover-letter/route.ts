import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { NextResponse } from "next/server"

export const maxDuration = 120

type CoverLetterPayload = {
  candidateName?: string
  candidateEmail?: string
  candidatePhone?: string
  candidateLocation?: string
  professionalSummary?: string
  resumeText?: string
  jobTitle?: string
  company?: string
  jobDescription?: string
}

const SYSTEM_PROMPT =
  "You write truthful, specific, professional cover letters. Return only the letter text — no JSON, no markdown, no commentary."

function buildPrompt(payload: CoverLetterPayload) {
  return `
Write a cover letter for this candidate.

Rules:
- 3-4 short paragraphs, under 350 words, plain text only.
- Ground every claim in the resume/profile below. Never invent employers, dates, metrics, or credentials.
- Open with genuine interest in the specific role/company, connect 2-3 of the candidate's strongest relevant achievements to the job's requirements, close with a confident call to action.
- Natural, human tone. No cliches like "I am writing to express my interest". No placeholder brackets.
- Sign off with the candidate's name.

Candidate: ${payload.candidateName || "Candidate"}
Contact: ${[payload.candidateEmail, payload.candidatePhone, payload.candidateLocation].filter(Boolean).join(" | ")}

Professional summary:
${payload.professionalSummary || "(none)"}

Resume:
${(payload.resumeText || "").slice(0, 6000)}

Target role: ${payload.jobTitle || "the advertised role"}
Company: ${payload.company || "the company"}

Job description:
${(payload.jobDescription || "").slice(0, 6000) || "(not provided — write from the resume and role title)"}
`
}

async function generateWithClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey || process.env.ANTHROPIC_API_ENABLED === "false") return null

  const anthropic = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-4-8"
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  })
  if (response.stop_reason === "refusal") throw new Error("Claude declined the request.")

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
  return text ? { text, model } : null
}

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey || process.env.GEMINI_API_ENABLED === "false") return null

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash"
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)
  url.searchParams.set("key", apiKey)
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 4000 },
    }),
  })
  const data = (await response.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
    error?: { message?: string }
  }
  if (!response.ok) throw new Error(data.error?.message || `Gemini failed with status ${response.status}`)

  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("")
    .trim()
  return text ? { text, model } : null
}

async function generateWithGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey || process.env.GROQ_API_ENABLED === "false") return null

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile"
  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  })
  const text = completion.choices[0]?.message?.content?.trim()
  return text ? { text, model } : null
}

export async function POST(request: Request) {
  let payload: CoverLetterPayload
  try {
    payload = (await request.json()) as CoverLetterPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  if (!payload.resumeText?.trim() && !payload.professionalSummary?.trim()) {
    return NextResponse.json({ error: "resumeText or professionalSummary is required" }, { status: 400 })
  }

  const prompt = buildPrompt(payload)
  const warnings: string[] = []

  for (const provider of [generateWithClaude, generateWithGemini, generateWithGroq]) {
    try {
      const result = await provider(prompt)
      if (result) {
        return NextResponse.json({
          coverLetter: result.text,
          modelUsed: result.model,
          ...(warnings.length ? { warning: warnings.join(" ") } : {}),
        })
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Provider failed.")
    }
  }

  return NextResponse.json(
    { error: `All AI providers failed. ${warnings.join(" ")}`.trim() },
    { status: 502 }
  )
}
