import { createRequire } from "module"
import Groq from "groq-sdk"
import mammoth from "mammoth"
import { NextResponse } from "next/server"
import { ProfileData, ResumeTokenUsage } from "@/lib/resume-generator"

const nodeRequire = createRequire(import.meta.url)

type PdfParse = (buffer: Buffer) => Promise<{ text: string }>

function getEmptyProfile(): ProfileData {
  return {
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: "",
    },
    education: [],
    experience: [],
    projects: [],
    skills: {
      programming: [],
      dataAnalysis: [],
      visualization: [],
      databases: [],
      cloud: [],
      tools: [],
    },
    certifications: [],
    achievements: [],
  }
}

async function extractPdfText(buffer: Buffer) {
  const parsePdf = nodeRequire("pdf-parse/lib/pdf-parse.js") as PdfParse
  const result = await parsePdf(buffer)
  return result.text || ""
}

async function extractResumeText(request: Request) {
  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const resumeFile = formData.get("resume")

    if (!(resumeFile instanceof File)) {
      throw new Error("Please upload a resume file.")
    }

    const buffer = Buffer.from(await resumeFile.arrayBuffer())
    const fileName = resumeFile.name.toLowerCase()
    const fileType = resumeFile.type.toLowerCase()

    if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
      return extractPdfText(buffer)
    }

    if (
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc") ||
      fileType.includes("wordprocessingml") ||
      fileType.includes("msword")
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ""
    }

    return buffer.toString("utf8")
  }

  const body = await request.json().catch(() => ({}))
  return typeof body.resumeText === "string" ? body.resumeText : ""
}

function buildPrompt(resumeText: string) {
  return `
Extract a structured profile knowledge base from this resume text.

Rules:
- Use only details explicitly present in the resume.
- Do not invent companies, dates, degrees, links, metrics, skills, certifications, or achievements.
- Preserve truthful metrics and dates exactly when present.
- Keep arrays empty when details are missing.
- Return valid JSON only.

Return this exact JSON shape:
{
  "personalInfo": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "summary": ""
  },
  "education": [
    {
      "id": "",
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "gpa": ""
    }
  ],
  "experience": [
    {
      "id": "",
      "company": "",
      "position": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "description": ["bullet"]
    }
  ],
  "projects": [
    {
      "id": "",
      "name": "",
      "description": "",
      "technologies": ["technology"],
      "link": "",
      "highlights": ["bullet"]
    }
  ],
  "skills": {
    "programming": [],
    "dataAnalysis": [],
    "visualization": [],
    "databases": [],
    "cloud": [],
    "tools": []
  },
  "certifications": [
    {
      "id": "",
      "name": "",
      "issuer": "",
      "date": "",
      "credentialId": ""
    }
  ],
  "achievements": []
}

Resume text:
${resumeText.slice(0, 24000)}
`
}

function getGroqApiKeys() {
  const rawKeys = [
    process.env.GROQ_API_KEY,
    ...(process.env.GROQ_API_KEYS || "").split(","),
    process.env.GROQ_API_KEY_2,
  ]

  return Array.from(
    new Set(
      rawKeys
        .map((key) => key?.trim())
        .filter((key): key is string => Boolean(key && !key.includes("your_groq_api_key_here")))
    )
  )
}

function normalizeImportedProfile(value: Partial<ProfileData>): ProfileData {
  const emptyProfile = getEmptyProfile()
  const importedSkills = value.skills || emptyProfile.skills

  return {
    personalInfo: {
      ...emptyProfile.personalInfo,
      ...(value.personalInfo || {}),
    },
    education: Array.isArray(value.education) ? value.education : [],
    experience: Array.isArray(value.experience) ? value.experience : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
    skills: {
      programming: Array.isArray(importedSkills.programming) ? importedSkills.programming : [],
      dataAnalysis: Array.isArray(importedSkills.dataAnalysis) ? importedSkills.dataAnalysis : [],
      visualization: Array.isArray(importedSkills.visualization) ? importedSkills.visualization : [],
      databases: Array.isArray(importedSkills.databases) ? importedSkills.databases : [],
      cloud: Array.isArray(importedSkills.cloud) ? importedSkills.cloud : [],
      tools: Array.isArray(importedSkills.tools) ? importedSkills.tools : [],
    },
    certifications: Array.isArray(value.certifications) ? value.certifications : [],
    achievements: Array.isArray(value.achievements) ? value.achievements : [],
  }
}

function getTokenUsage(
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined,
  model: string,
  apiKeyIndex: number
): ResumeTokenUsage | undefined {
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

export async function POST(request: Request) {
  try {
    const apiKeys = getGroqApiKeys()
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

    if (!apiKeys.length) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 })
    }

    const resumeText = (await extractResumeText(request)).trim()

    if (resumeText.length < 80) {
      return NextResponse.json(
        { error: "Could not read enough resume text from this file. Try a text-based PDF, DOCX, or TXT file." },
        { status: 400 }
      )
    }

    let lastError: unknown

    for (const [apiKeyPosition, apiKey] of apiKeys.entries()) {
      try {
        const groq = new Groq({ apiKey })
        const completion = await groq.chat.completions.create({
          model,
          temperature: 0,
          max_tokens: 2200,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You extract truthful resume data into JSON only.",
            },
            {
              role: "user",
              content: buildPrompt(resumeText),
            },
          ],
        })

        const content = completion.choices[0]?.message?.content || "{}"
        const profile = normalizeImportedProfile(JSON.parse(content) as Partial<ProfileData>)

        return NextResponse.json({
          profile,
          tokenUsage: getTokenUsage(completion.usage, model, apiKeyPosition + 1),
        })
      } catch (error) {
        lastError = error
        console.warn(`Resume import Groq key ${apiKeyPosition + 1} failed`, error)
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Resume import failed")
  } catch (error) {
    console.error("Resume import failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resume import failed" },
      { status: 500 }
    )
  }
}
