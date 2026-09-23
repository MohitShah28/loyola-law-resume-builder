import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { getGeminiModels } from "@/lib/gemini-models"
import { getOpenRouterApiKey, requestOpenRouterText } from "@/lib/openrouter"
import { parseJsonWithRepair } from "@/lib/json-repair"

export const maxDuration = 120

type CoverLetterPayload = {
  recipient?: string
  tone?: string
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
  "You write truthful, specific, professional cover letters for law students and legal professionals applying to judicial clerkships, law firm, government, and public interest positions. Return valid JSON only — no markdown, no commentary."

function buildPrompt(payload: CoverLetterPayload) {
  return `
Write a cover letter for this candidate and this job.

Rules:
- 3-4 body paragraphs, 250-350 words total. No headers, date, address block, or signature — those are added by the app.
- Ground every claim in the candidate data below. Never invent employers, dates, credentials, coursework, metrics, or practice areas. If the job asks for something the candidate lacks, either omit it or point to the closest real experience without claiming the missing one.
- Do not infer facts the resume does not state. In particular, never state a class year ("second-year", "2L", "rising 3L") or years of experience; describe the candidate as a "J.D. candidate" with their stated graduation date instead.
- Paragraph 1: the specific role and organization, and why this candidate is applying — reference something concrete from the posting.
- Paragraph 2-3: connect the candidate's strongest relevant experience to the job's actual requirements, naming real employers and real work from the resume.
- Final paragraph: a confident, brief close and availability for interview.
- Legal conventions: formal but warm, no cliches ("I am writing to express my interest"), no placeholder brackets, no em dashes, plain text only.
- Salutation uses a colon, legal style: "Dear Hiring Committee:" or "Dear Judge Alvarez:".
- Subject line format: "Re: Application for <role>" (add the organization only when one is named below; never write a placeholder like "Target Company", "the organization", or "[Company]").
- When no organization is named, refer to it naturally ("your chambers", "your firm", "your team") instead of inventing or echoing a placeholder.
- Tone requested: ${payload.tone || "professional"}.

Return this exact JSON shape:
{
  "subject": "Re: Application for ...",
  "greeting": "Dear ...:",
  "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "closing": "Sincerely,"
}

Candidate: ${payload.candidateName || "Candidate"}
Contact: ${[payload.candidateEmail, payload.candidatePhone, payload.candidateLocation].filter(Boolean).join(" | ")}
Addressed to: ${payload.recipient || "Hiring Committee"}

Professional summary:
${payload.professionalSummary || "(none)"}

Resume (the only facts you may use):
${(payload.resumeText || "").slice(0, 6000)}

Target role: ${payload.jobTitle || "the advertised role"}
Organization: ${payload.company || "the organization"}

Job description:
${(payload.jobDescription || "").slice(0, 6000) || "(not provided — write from the resume and role title)"}
`
}

type LetterContent = { subject: string; greeting: string; paragraphs: string[]; closing: string }

// Models occasionally answer with prose instead of JSON; fall back to splitting
// that prose into paragraphs so the student still gets a letter.
function parseLetter(text: string, payload: CoverLetterPayload): LetterContent {
  const recipient = payload.recipient?.trim() || "Hiring Committee"
  const role = payload.jobTitle?.trim() || "the advertised position"
  const fallbackSubject = `Re: Application for ${role}${payload.company?.trim() ? ` at ${payload.company.trim()}` : ""}`
  const parsed = parseJsonWithRepair<Partial<LetterContent>>(text)
  const paragraphs = Array.isArray(parsed?.paragraphs)
    ? parsed.paragraphs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

  if (paragraphs.length) {
    return {
      subject: typeof parsed?.subject === "string" && parsed.subject.trim() ? parsed.subject.trim() : fallbackSubject,
      greeting: typeof parsed?.greeting === "string" && parsed.greeting.trim() ? parsed.greeting.trim() : `Dear ${recipient}:`,
      paragraphs,
      closing: typeof parsed?.closing === "string" && parsed.closing.trim() ? parsed.closing.trim() : "Sincerely,",
    }
  }

  const prose = text
    .replace(/^```(?:json)?|```$/gm, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(dear|sincerely|respectfully)/i.test(block))
  return { subject: fallbackSubject, greeting: `Dear ${recipient}:`, paragraphs: prose, closing: "Sincerely," }
}

// .env.example ships placeholder values like "your_groq_api_key_here"; treat
// them as unset so the provider is skipped instead of failing with a 401.
function configuredKey(value: string | undefined) {
  const key = value?.trim()
  return key && !/^your_.*_here$/i.test(key) ? key : ""
}

async function generateWithClaude(prompt: string) {
  const apiKey = configuredKey(process.env.ANTHROPIC_API_KEY)
  if (!apiKey || process.env.ANTHROPIC_API_ENABLED === "false") return null

  const anthropic = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5"
  const response = await anthropic.messages.create({
    model,
    // Adaptive thinking tokens count against max_tokens; leave room so the
    // letter is never cut off mid-sentence.
    max_tokens: 16000,
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

async function requestGeminiText(apiKey: string, model: string, prompt: string) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)
  url.searchParams.set("key", apiKey)
  const send = () => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 4000 },
    }),
  })
  let response = await send()
  // Overload (503) is usually brief; retry once before trying the next model.
  if (response.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    response = await send()
  }
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

async function generateWithGemini(prompt: string) {
  const apiKey = configuredKey(process.env.GEMINI_API_KEY)
  if (!apiKey || process.env.GEMINI_API_ENABLED === "false") return null

  // Best model first (see lib/gemini-models.ts); fall through on quota or overload.
  const failures: string[] = []
  for (const model of getGeminiModels()) {
    try {
      const result = await requestGeminiText(apiKey, model, prompt)
      if (result) return result
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message : "failed"}`)
    }
  }
  if (failures.length) throw new Error(`Gemini failed (${failures.join("; ")})`)
  return null
}

async function generateWithOpenRouter(prompt: string) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) return null
  const result = await requestOpenRouterText({ apiKey, system: SYSTEM_PROMPT, prompt, maxTokens: 8000, temperature: 0.5 })
  return { text: result.text, model: result.model }
}

async function generateWithGroq(prompt: string) {
  const apiKey = configuredKey(process.env.GROQ_API_KEY)
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

  for (const provider of [generateWithClaude, generateWithGemini, generateWithOpenRouter, generateWithGroq]) {
    try {
      const result = await provider(prompt)
      if (result) {
        const letter = parseLetter(result.text, payload)
        if (!letter.paragraphs.length) throw new Error("Empty letter returned.")
        return NextResponse.json({
          // `letter` renders the formatted page; `coverLetter` stays for callers
          // that only need the body text.
          letter,
          coverLetter: [letter.greeting, ...letter.paragraphs, letter.closing, payload.candidateName || ""]
            .filter(Boolean)
            .join("\n\n"),
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
