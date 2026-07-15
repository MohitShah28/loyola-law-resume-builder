import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { parseJsonWithRepair } from "@/lib/json-repair"
import { NextResponse } from "next/server"
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  GenerateResumePayload,
  GeneratedResume,
  ResumeTokenUsage,
  formatResumeText,
  generateResumeFromJob,
  payloadToProfile,
  scoreResumeAgainstJob,
  sortExperienceByRecency,
} from "@/lib/resume-generator"

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
] as const

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"
const DEFAULT_CLAUDE_MODEL = "claude-opus-4-8"
const MAX_OUTPUT_TOKENS = 8000
// Groq free tier counts prompt + max_tokens against a 12k tokens-per-minute cap,
// so the Groq request must reserve far less output budget than Gemini.
const GROQ_MAX_OUTPUT_TOKENS = 3000
const SYSTEM_PROMPT = "You write truthful ATS resumes and return valid JSON only."

type GroqCompletionUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  error?: {
    message?: string
  }
}

type ResumeTokenUsageLogEntry = ResumeTokenUsage & {
  timestamp: string
  targetRole: string
  jobDescriptionChars: number
}

type ResumeGenerationRunLogEntry = {
  timestamp: string
  source: ResumeTokenUsage["provider"]
  provider: ResumeTokenUsage["provider"]
  model: string
  apiKeyIndex: number
  targetRole: string
  jobDescriptionChars: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  input: {
    systemPrompt: string
    userPrompt: string
  }
  output: {
    rawContent: string
    parsedJson: Partial<GeneratedResume>
  }
}

type GoogleSearchItem = {
  title?: string
  link?: string
  snippet?: string
}

type GoogleSearchResponse = {
  items?: GoogleSearchItem[]
}

function buildLocalFallback(payload: GenerateResumePayload): GeneratedResume {
  return generateResumeFromJob({
    profile: payloadToProfile(payload),
    jobDescription: payload.jobDescription,
    template: payload.template || "modern",
    tone: payload.tone || "professional",
    experienceLevel: payload.experienceLevel || "mid",
    length: payload.length || "medium",
  })
}

function truncateText(value: string, maxLength = 6000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}\n[Job description truncated for token limits]` : value
}

function cleanForQuery(value: string) {
  return value.replace(/[^\w\s.+#-]/g, " ").replace(/\s+/g, " ").trim()
}

async function getGoogleJobContext(payload: GenerateResumePayload, fallback: GeneratedResume) {
  if (process.env.GOOGLE_SEARCH_ENABLED === "false") return ""

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY?.trim()
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim()
  if (!apiKey || !searchEngineId) return ""

  const queryParts = [
    payload.targetRole || fallback.jobTitle,
    fallback.company !== "Target Company" ? fallback.company : "",
    "job responsibilities required skills interview resume",
  ].filter(Boolean)
  const query = cleanForQuery(queryParts.join(" "))
  if (!query) return ""

  const searchUrl = new URL("https://www.googleapis.com/customsearch/v1")
  searchUrl.searchParams.set("key", apiKey)
  searchUrl.searchParams.set("cx", searchEngineId)
  searchUrl.searchParams.set("q", query)
  searchUrl.searchParams.set("num", "5")

  try {
    const response = await fetch(searchUrl, { next: { revalidate: 60 * 60 * 24 } })
    if (!response.ok) return ""

    const data = (await response.json()) as GoogleSearchResponse
    const snippets = (data.items || [])
      .slice(0, 5)
      .map((item, index) => {
        const title = item.title?.trim()
        const snippet = item.snippet?.replace(/\s+/g, " ").trim()
        const link = item.link?.trim()
        return [title ? `${index + 1}. ${title}` : `${index + 1}. Google result`, snippet, link].filter(Boolean).join(" - ")
      })
      .filter(Boolean)

    return snippets.length ? snippets.join("\n") : ""
  } catch (error) {
    console.warn("[resume-generation] Google enrichment unavailable", error)
    return ""
  }
}

function buildPrompt(payload: GenerateResumePayload, fallback: GeneratedResume, googleContext: string) {
  return `
Create a content-rich, one-page ATS resume tailored to the job.

Rules:
- Use only truthful candidate data. Do not invent companies, degrees, dates, metrics, certifications, or work experience.
- Never fabricate numbers: no invented percentages, counts, team sizes, or revenue figures. Use a number only when it appears in the candidate data.
- If the job starts with PROFILE_ONLY_RESUME_REQUEST, make a strong general resume from the profile.
- Tailoring goals, in priority order:
  1. Rewrite the professional summary (improvedSummary) specifically for this job: name the target role, the candidate's strongest matching skills, and their fit for the role's goals in 3-4 sentences that naturally use the job description's own keywords.
  2. For each selected experience entry, rewrite the existing bullets AND add new bullets that connect the candidate's documented responsibilities to this job's requirements, phrased with the job description's terminology.
  3. For each selected project, add or rewrite bullets so the project clearly demonstrates the skills and technologies this job requires, whenever the project's real scope makes that plausible. Reframe existing work using the job's terminology rather than inventing new work.
  4. In tailoredSkills, cover the job's required skills: include every required skill supported anywhere in the profile, plus important job keywords the candidate could credibly list based on adjacent experience. Order by relevance to this job. Do not include generic non-skill words.
  5. Maximize ATS keyword match between the resume text and the job description so the resume ranks highly in applicant tracking systems.
- Rewrite bullets professionally, select relevant projects, and add ATS keywords naturally.
- Return full, substantive content when supported by the candidate profile: 6-8 bullets for the strongest experience entries and 4-5 bullets for each selected project.
- Make bullets specific, action-oriented, and outcome-focused. Prefer what was built, analyzed, automated, improved, tested, deployed, or presented.
- Optimize the Projects section with the same care as the summary and experience sections:
  1. Analyze required skills, preferred skills, technologies, responsibilities, industry terminology, and ATS keywords from the job description.
  2. Compare those requirements against every project in the candidate profile.
  3. Select the most relevant projects and rewrite each selected project's description and highlights to emphasize supported work that matches the target role.
  4. Leave unrelated projects mostly unchanged or omit them if stronger projects exist.
  5. Ground added project bullets in the project's real scope, technologies, or profile data, and phrase them with the job's required skills and terminology.
- For selectedProjects, preserve the original project id/name/link. Only add a technology to a project's technologies list when the job requires it and it plausibly fits that project's real stack.
- For software, AI, LLM, web, startup, API, or automation roles, emphasize supported software/product/automation work.
- Return changeHighlights explaining the main edits made compared with the candidate profile/job input.
- Use plain ATS formatting only. No tables, columns, icons, markdown fences, or extra commentary.
- If template is "university-law", favor a university resume structure: PROFILE, EDUCATION, EXPERIENCE, PROJECTS, and TECHNICAL SKILLS. Keep education before experience, but make the content full enough to fill one page with supported details.
- For template "university-law", include 6-8 experience bullets, 3-5 bullets for each relevant project, a strong 3-4 sentence profile, and a focused technical skills section. Do not create generic catch-all sections.
- If template is "original-cv", favor this structure: PROFESSIONAL SUMMARY, AREAS OF EXPERTISE, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION, TECHNICAL SKILLS. Make the content dense enough to visually fill one full page with minimal whitespace.
- For template "original-cv", write a 3-4 sentence professional summary, 12-15 areas of expertise, include all relevant experience entries, and prefer fuller bullets over short generic bullets.
- Certifications and achievements must come only from the candidate data arrays. If those arrays are empty, do not mention or create those sections.
- If the candidate has real certifications, include a dedicated CERTIFICATIONS section with name, issuer, date, and credential ID only when available.
- If the candidate has real awards, honors, publications, or measurable achievements, include a dedicated HONORS & ACHIEVEMENTS section. Do not show these sections when the arrays are empty.
- Apply the certifications/achievements rule and page-filling rule to every template: original-cv, university-law, harvard, modern, executive, and compact.
- If certifications or achievements are empty, use the available page space for richer supported experience bullets, more relevant project bullets, and a stronger skills section. Do not change the selected template structure.
- The resume must visually fill one full page. When the profile has 3 or fewer projects, write 5-6 substantive bullets for each selected project and a fuller 4-sentence professional summary, all grounded in the candidate's real work.
- Google context may be used only to understand public role/company language and keywords. Do not add unsupported candidate claims from Google.
- Return valid JSON only.

Return this exact JSON shape (do not include full resume text — it is assembled from the fields below):
{
  "atsScore": 0,
  "matchSummary": "Short explanation of how well the resume matches the job",
  "matchedKeywords": ["keyword"],
  "missingKeywords": ["keyword"],
  "changeHighlights": ["Specific change made to tailor the resume"],
  "suggestions": ["suggestion"],
  "selectedCertifications": [
    {
      "id": "existing certification id if available",
      "name": "existing certification name",
      "issuer": "existing issuer",
      "date": "existing date",
      "credentialId": "existing credential id if available"
    }
  ],
  "selectedAchievements": ["achievement"],
  "tailoredSkills": ["skill"],
  "selectedExperience": [
    {
      "id": "existing experience id",
      "company": "existing company",
      "position": "existing position",
      "location": "existing location",
      "startDate": "existing start date",
      "endDate": "existing end date",
      "description": ["rewritten truthful bullet point"]
    }
  ],
  "selectedProjects": [
    {
      "id": "existing project id if available",
      "name": "project name",
      "description": "project description",
      "technologies": ["technology"],
      "link": "project link",
      "highlights": ["tailored truthful project bullet"]
    }
  ],
  "improvedSummary": "Improved professional summary"
}

Candidate data:
${JSON.stringify({
  personalInfo: { ...payload.personalInfo, portfolio: "" },
  professionalSummary: payload.professionalSummary,
  education: payload.education,
  workExperience: payload.workExperience,
  projects: payload.projects,
  skills: payload.skills,
  achievements: payload.achievements,
  certifications: payload.certifications,
  pastResumeDetails: payload.pastResumeDetails || "",
})}

Target role:
${payload.targetRole || fallback.jobTitle}

Selected template:
${payload.template || fallback.template}

Google/public context:
${googleContext || "No Google enrichment configured or available."}

Job description:
${truncateText(payload.jobDescription)}
`
}

function parseGroqJson(content: string) {
  return parseJsonWithRepair<GeneratedResume>(content)
}

function parseJsonContent(content: string) {
  return parseGroqJson(content)
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback
}

function normalizeCompareText(value: string | undefined) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function normalizeCertifications(value: Partial<GeneratedResume>["selectedCertifications"], fallback: GeneratedResume) {
  const profileCertifications = fallback.profile.certifications
  if (!profileCertifications.length) return []

  const selected = Array.isArray(value) && value.length ? value : fallback.selectedCertifications

  return selected.filter((certification) =>
    profileCertifications.some((profileCertification) =>
      (certification.id && profileCertification.id && certification.id === profileCertification.id) ||
      normalizeCompareText(certification.name) === normalizeCompareText(profileCertification.name)
    )
  )
}

function normalizeAchievements(value: unknown, fallback: GeneratedResume) {
  const profileAchievements = fallback.profile.achievements
  if (!profileAchievements.length) return []

  const selected = normalizeStringArray(value, fallback.selectedAchievements)
  const profileAchievementSet = new Set(profileAchievements.map(normalizeCompareText).filter(Boolean))

  return selected.filter((achievement) => profileAchievementSet.has(normalizeCompareText(achievement)))
}

function normalizeProjects(value: Partial<GeneratedResume>["selectedProjects"], fallback: GeneratedResume) {
  const isDenseOnePage = fallback.template === "original-cv" || fallback.template === "university-law"
  const hasSupplementalSections = fallback.profile.certifications.length > 0 || fallback.profile.achievements.length > 0
  const projectLimit = isDenseOnePage ? 4 : hasSupplementalSections ? 3 : 4
  const highlightLimit = isDenseOnePage ? 5 : 4
  const profileProjects = fallback.profile.projects
  const selected = Array.isArray(value) && value.length
    ? value.filter((project) => profileProjects.some((item) => item.id === project.id || item.name === project.name))
    : fallback.selectedProjects
  const merged = [...selected]

  for (const project of fallback.selectedProjects) {
    const alreadyAdded = merged.some((item) => item.id === project.id || item.name === project.name)
    if (!alreadyAdded) merged.push(project)
    if (merged.length >= projectLimit) break
  }

  return merged.slice(0, projectLimit).map((project) => {
    const profileProject = profileProjects.find((item) => item.id === project.id || item.name === project.name)
    const fallbackProject = fallback.selectedProjects.find((item) => item.id === project.id || item.name === project.name) || profileProject
    const highlights = Array.isArray(project.highlights) && project.highlights.length ? project.highlights : fallbackProject?.highlights || []

    return {
      ...fallbackProject,
      ...project,
      id: fallbackProject?.id || project.id,
      name: fallbackProject?.name || project.name,
      link: fallbackProject?.link || project.link,
      technologies: fallbackProject?.technologies || [],
      highlights: Array.from(new Set([...highlights, ...(fallbackProject?.highlights || [])])).slice(0, highlightLimit),
    }
  })
}

function normalizeExperience(value: Partial<GeneratedResume>["selectedExperience"], fallback: GeneratedResume) {
  const isDenseOnePage = fallback.template === "original-cv" || fallback.template === "university-law"
  const hasSupplementalSections = fallback.profile.certifications.length > 0 || fallback.profile.achievements.length > 0
  const experienceLimit = isDenseOnePage ? 4 : 3
  const bulletLimit = isDenseOnePage ? 8 : hasSupplementalSections ? 5 : 6
  const selected = Array.isArray(value) && value.length ? value : fallback.selectedExperience
  const merged = [...selected]

  for (const experience of fallback.selectedExperience) {
    const alreadyAdded = merged.some((item) => item.id === experience.id || `${item.company}-${item.position}` === `${experience.company}-${experience.position}`)
    if (!alreadyAdded) merged.push(experience)
    if (merged.length >= experienceLimit) break
  }

  const normalized = merged.slice(0, experienceLimit).map((experience) => {
    const fallbackExperience = fallback.selectedExperience.find(
      (item) => item.id === experience.id || `${item.company}-${item.position}` === `${experience.company}-${experience.position}`
    )
    const description = Array.isArray(experience.description) && experience.description.length
      ? experience.description
      : fallbackExperience?.description || []

    return {
      ...fallbackExperience,
      ...experience,
      description: (description.length >= 4
        ? description
        : Array.from(new Set([...description, ...(fallbackExperience?.description || [])]))
      ).slice(0, bulletLimit),
    }
  })

  return sortExperienceByRecency(normalized)
}

function normalizeGroqResume(value: Partial<GeneratedResume>, fallback: GeneratedResume, modelUsed: string, jobDescription: string): GeneratedResume {
  const isDenseOnePage = fallback.template === "original-cv" || fallback.template === "university-law"
  const hasSupplementalSections = fallback.profile.certifications.length > 0 || fallback.profile.achievements.length > 0

  const normalizedResume: GeneratedResume = {
    ...fallback,
    resume: fallback.resume,
    atsScore:
      typeof value.atsScore === "number"
        ? Math.max(0, Math.min(100, value.atsScore > 0 && value.atsScore <= 1 ? Math.round(value.atsScore * 100) : Math.round(value.atsScore)))
        : fallback.atsScore,
    matchSummary: typeof value.matchSummary === "string" && value.matchSummary.trim() ? value.matchSummary : fallback.matchSummary,
    matchedKeywords: normalizeStringArray(value.matchedKeywords, fallback.matchedKeywords),
    missingKeywords: normalizeStringArray(value.missingKeywords, fallback.missingKeywords),
    changeHighlights: normalizeStringArray(value.changeHighlights, fallback.changeHighlights),
    suggestions: normalizeStringArray(value.suggestions, fallback.suggestions),
    selectedCertifications: normalizeCertifications(value.selectedCertifications, fallback),
    selectedAchievements: normalizeAchievements(value.selectedAchievements, fallback).slice(0, isDenseOnePage ? 8 : 5),
    tailoredSkills: normalizeStringArray(value.tailoredSkills, fallback.tailoredSkills).slice(0, isDenseOnePage ? 36 : hasSupplementalSections ? 24 : 30),
    selectedExperience: normalizeExperience(value.selectedExperience, fallback),
    selectedProjects: normalizeProjects(value.selectedProjects, fallback),
    improvedSummary: typeof value.improvedSummary === "string" && value.improvedSummary.trim() ? value.improvedSummary : fallback.improvedSummary,
    summary: typeof value.improvedSummary === "string" && value.improvedSummary.trim() ? value.improvedSummary : fallback.summary,
    keywordsAdded: normalizeStringArray(value.matchedKeywords, fallback.keywordsAdded),
    modelUsed,
    generatedAt: new Date().toISOString(),
  }

  const resumeText = formatResumeText(normalizedResume)
  // Deterministic ATS score computed from the final resume text, replacing the
  // model's self-reported guess.
  const deterministicScore = scoreResumeAgainstJob(resumeText, jobDescription)

  return {
    ...normalizedResume,
    ...deterministicScore,
    resume: resumeText,
  }
}

function getGroqErrorDetails(error: unknown) {
  const maybeError = error as {
    status?: number
    code?: string
    error?: { code?: string }
    message?: string
  }

  return {
    status: maybeError.status,
    code: maybeError.code || maybeError.error?.code,
    message: maybeError.message || "Groq request failed",
  }
}

function isRateLimitError(error: unknown) {
  const details = getGroqErrorDetails(error)
  return details.status === 429 || details.status === 413 || details.code === "rate_limit_exceeded"
}

function getGroqApiKeys() {
  const keys = [
    process.env.GROQ_API_KEY,
    ...(process.env.GROQ_API_KEYS || "").split(","),
    process.env.GROQ_API_KEY_2,
  ]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key && key !== "your_groq_api_key_here"))

  return Array.from(new Set(keys))
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  return apiKey && apiKey !== "your_gemini_api_key_here" ? apiKey : ""
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
}

function getClaudeApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  return apiKey && apiKey !== "your_anthropic_api_key_here" ? apiKey : ""
}

function getClaudeModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL
}

// Structured-output schema so the API guarantees valid JSON in the exact shape
// the normalizers expect — no truncation repair needed on this path.
const RESUME_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "atsScore",
    "matchSummary",
    "matchedKeywords",
    "missingKeywords",
    "changeHighlights",
    "suggestions",
    "selectedCertifications",
    "selectedAchievements",
    "tailoredSkills",
    "selectedExperience",
    "selectedProjects",
    "improvedSummary",
  ],
  properties: {
    atsScore: { type: "integer" },
    matchSummary: { type: "string" },
    matchedKeywords: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    changeHighlights: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    selectedCertifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "issuer", "date", "credentialId"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
          credentialId: { type: "string" },
        },
      },
    },
    selectedAchievements: { type: "array", items: { type: "string" } },
    tailoredSkills: { type: "array", items: { type: "string" } },
    selectedExperience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "company", "position", "location", "startDate", "endDate", "description"],
        properties: {
          id: { type: "string" },
          company: { type: "string" },
          position: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          description: { type: "array", items: { type: "string" } },
        },
      },
    },
    selectedProjects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "description", "technologies", "link", "highlights"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          technologies: { type: "array", items: { type: "string" } },
          link: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
        },
      },
    },
    improvedSummary: { type: "string" },
  },
} as const

async function requestClaudeResume({
  apiKey,
  model,
  payload,
  fallback,
  googleContext,
}: {
  apiKey: string
  model: string
  payload: GenerateResumePayload
  fallback: GeneratedResume
  googleContext: string
}) {
  const userPrompt = buildPrompt(payload, fallback, googleContext)
  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: RESUME_JSON_SCHEMA } },
    messages: [{ role: "user", content: userPrompt }],
  })

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined the request.")
  }

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
  const parsed = parseGroqJson(content)
  const tokenUsage: ResumeTokenUsage = {
    provider: "claude",
    model,
    apiKeyIndex: 1,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  }

  await saveGenerationRunLog({
    tokenUsage,
    payload,
    fallback,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    rawContent: content,
    parsedJson: parsed,
  })

  return {
    resume: normalizeGroqResume(parsed, fallback, model, payload.jobDescription),
    tokenUsage,
  }
}

function getTokenUsage(completion: { usage?: GroqCompletionUsage }, model: string, apiKeyIndex: number): ResumeTokenUsage | undefined {
  const usage = completion.usage
  if (!usage) return undefined

  return {
    provider: "groq",
    model,
    apiKeyIndex,
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
  }
}

function getGeminiTokenUsage(response: GeminiGenerateContentResponse, model: string): ResumeTokenUsage | undefined {
  const usage = response.usageMetadata
  if (!usage) return undefined

  return {
    provider: "gemini",
    model,
    apiKeyIndex: 1,
    promptTokens: usage.promptTokenCount || 0,
    completionTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
  }
}

async function requestGeminiResume({
  apiKey,
  model,
  payload,
  fallback,
  googleContext,
}: {
  apiKey: string
  model: string
  payload: GenerateResumePayload
  fallback: GeneratedResume
  googleContext: string
}) {
  const userPrompt = buildPrompt(payload, fallback, googleContext)
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)
  url.searchParams.set("key", apiKey)

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
  })

  let data: GeminiGenerateContentResponse = {}
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    })

    data = (await response.json().catch(() => ({}))) as GeminiGenerateContentResponse
    if (response.ok) break

    // Overload (503) and rate limit (429) are usually transient — retry once.
    if (attempt === 0 && (response.status === 503 || response.status === 429)) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      continue
    }
    throw new Error(data.error?.message || `Gemini request failed with status ${response.status}`)
  }

  const content = data.candidates?.[0]?.content?.parts
    ?.filter((part) => !(part as { thought?: boolean }).thought)
    .map((part) => part.text || "")
    .join("") || "{}"
  const parsed = parseJsonContent(content)
  const tokenUsage = getGeminiTokenUsage(data, model)
  await saveGenerationRunLog({
    tokenUsage,
    payload,
    fallback,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    rawContent: content,
    parsedJson: parsed,
  })

  return {
    resume: normalizeGroqResume(parsed, fallback, model, payload.jobDescription),
    tokenUsage,
  }
}

const MAX_LOG_BYTES = 5 * 1024 * 1024

async function appendJsonLine(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8")

  // Cap log growth: when a file passes 5MB, keep only the newest half.
  try {
    const stats = await stat(filePath)
    if (stats.size > MAX_LOG_BYTES) {
      const lines = (await readFile(filePath, "utf8")).trimEnd().split("\n")
      await writeFile(filePath, `${lines.slice(Math.ceil(lines.length / 2)).join("\n")}\n`, "utf8")
    }
  } catch (error) {
    console.warn("[resume-generation] log rotation failed", error)
  }
}

async function saveGenerationRunLog({
  tokenUsage,
  payload,
  fallback,
  systemPrompt,
  userPrompt,
  rawContent,
  parsedJson,
}: {
  tokenUsage: ResumeTokenUsage | undefined
  payload: GenerateResumePayload
  fallback: GeneratedResume
  systemPrompt: string
  userPrompt: string
  rawContent: string
  parsedJson: Partial<GeneratedResume>
}) {
  if (!tokenUsage) {
    console.info("[resume-generation] token usage unavailable")
    return
  }

  console.info("[resume-generation] token usage", tokenUsage)
  const timestamp = new Date().toISOString()
  const targetRole = payload.targetRole || fallback.jobTitle
  const jobDescriptionChars = payload.jobDescription.length
  const tokenLogEntry: ResumeTokenUsageLogEntry = {
    ...tokenUsage,
    timestamp,
    targetRole,
    jobDescriptionChars,
  }
  const runLogEntry: ResumeGenerationRunLogEntry = {
    timestamp,
    source: tokenUsage.provider,
    provider: tokenUsage.provider,
    model: tokenUsage.model,
    apiKeyIndex: tokenUsage.apiKeyIndex,
    targetRole,
    jobDescriptionChars,
    inputTokens: tokenUsage.promptTokens,
    outputTokens: tokenUsage.completionTokens,
    totalTokens: tokenUsage.totalTokens,
    input: {
      systemPrompt,
      userPrompt,
    },
    output: {
      rawContent,
      parsedJson,
    },
  }

  try {
    await appendJsonLine(path.join(process.cwd(), "logs", "resume-token-usage.jsonl"), tokenLogEntry)
    await appendJsonLine(path.join(process.cwd(), "logs", "resume-generation-runs.jsonl"), runLogEntry)
  } catch (error) {
    console.warn("[resume-generation] failed to save generation log", error)
  }
}

export async function POST(request: Request) {
  let payload: GenerateResumePayload

  try {
    payload = (await request.json()) as GenerateResumePayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  if (!payload.jobDescription?.trim()) {
    return NextResponse.json({ error: "jobDescription is required" }, { status: 400 })
  }

  const fallback = buildLocalFallback(payload)

  const apiKeys = getGroqApiKeys()
  const groqEnabled = process.env.GROQ_API_ENABLED !== "false"
  const geminiApiKey = getGeminiApiKey()
  const geminiEnabled = process.env.GEMINI_API_ENABLED !== "false"
  const googleContext = await getGoogleJobContext(payload, fallback)
  const providerWarnings: string[] = []

  const claudeApiKey = getClaudeApiKey()
  const claudeEnabled = process.env.ANTHROPIC_API_ENABLED !== "false"

  if (claudeEnabled && claudeApiKey) {
    try {
      const claudeModel = getClaudeModel()
      const { resume, tokenUsage } = await requestClaudeResume({
        apiKey: claudeApiKey,
        model: claudeModel,
        payload,
        fallback,
        googleContext,
      })

      return NextResponse.json({
        resume,
        source: "claude",
        modelUsed: claudeModel,
        tokenUsage,
      })
    } catch (error) {
      providerWarnings.push(error instanceof Error ? `Claude failed: ${error.message}` : "Claude failed.")
    }
  }

  if (geminiEnabled && geminiApiKey) {
    try {
      const geminiModel = getGeminiModel()
      const { resume, tokenUsage } = await requestGeminiResume({
        apiKey: geminiApiKey,
        model: geminiModel,
        payload,
        fallback,
        googleContext,
      })

      return NextResponse.json({
        resume,
        source: "gemini",
        modelUsed: geminiModel,
        tokenUsage,
      })
    } catch (error) {
      providerWarnings.push(error instanceof Error ? `Gemini failed: ${error.message}` : "Gemini failed.")
    }
  } else if (!geminiEnabled) {
    providerWarnings.push("Gemini API is disabled.")
  } else {
    providerWarnings.push("GEMINI_API_KEY is not configured.")
  }

  if (!groqEnabled) {
    return NextResponse.json({
      resume: fallback,
      source: "local",
      warning: [...providerWarnings, "Groq API is disabled. Used local generator fallback."].join(" "),
    })
  }

  if (!apiKeys.length) {
    return NextResponse.json({
      resume: fallback,
      source: "local",
      warning: [...providerWarnings, "GROQ_API_KEY is not configured. Used local generator fallback."].join(" "),
    })
  }

  try {
    let lastRateLimitMessage = ""

    for (const [apiKeyIndex, apiKey] of apiKeys.entries()) {
      const groq = new Groq({ apiKey })

      for (const groqModel of GROQ_MODELS) {
        try {
          const userPrompt = buildPrompt(payload, fallback, googleContext)
          const completion = await groq.chat.completions.create({
            model: groqModel,
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            temperature: 0.35,
            max_tokens: GROQ_MAX_OUTPUT_TOKENS,
            response_format: { type: "json_object" },
          })

          const tokenUsage = getTokenUsage(completion, groqModel, apiKeyIndex + 1)
          const content = completion.choices[0]?.message?.content || "{}"
          const parsed = parseGroqJson(content)
          await saveGenerationRunLog({
            tokenUsage,
            payload,
            fallback,
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            rawContent: content,
            parsedJson: parsed,
          })
          const resume = normalizeGroqResume(parsed, fallback, groqModel, payload.jobDescription)

          return NextResponse.json({
            resume,
            source: "groq",
            modelUsed: groqModel,
            tokenUsage,
            ...(providerWarnings.length ? { warning: providerWarnings.join(" ") } : {}),
          })
        } catch (error) {
          if (isRateLimitError(error)) {
            lastRateLimitMessage = getGroqErrorDetails(error).message
            continue
          }

          throw error
        }
      }
    }

    return NextResponse.json({
      resume: fallback,
      source: "local",
      warning: lastRateLimitMessage
        ? [...providerWarnings, `Groq rate limit reached. Used local generator fallback. ${lastRateLimitMessage}`].join(" ")
        : [...providerWarnings, "Groq rate limit reached. Used local generator fallback."].join(" "),
    })
  } catch (error) {
    return NextResponse.json({
      resume: fallback,
      source: "local",
      warning: error instanceof Error
        ? [...providerWarnings, `Groq failed: ${error.message}`].join(" ")
        : [...providerWarnings, "Groq failed. Used local generator fallback."].join(" "),
    })
  }
}
