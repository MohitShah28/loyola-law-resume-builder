import { mockProfile } from "@/lib/data"
import { addNotification } from "@/lib/notifications"
import { buildResumeDocument, documentToText } from "@/lib/resume-document"

export type ProfileData = typeof mockProfile

export type GeneratedResume = {
  profile: ProfileData
  resume: string
  jobTitle: string
  company: string
  template: string
  tone: string
  experienceLevel: string
  length: string
  summary: string
  improvedSummary: string
  matchSummary: string
  selectedExperience: ProfileData["experience"]
  selectedProjects: ProfileData["projects"]
  selectedCertifications: ProfileData["certifications"]
  selectedAchievements: string[]
  tailoredSkills: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  keywordsAdded: string[]
  changeHighlights: string[]
  atsScore: number
  strengths: string[]
  suggestions: string[]
  modelUsed?: string
  generatedAt: string
}

export type GenerateResumePayload = {
  personalInfo: ProfileData["personalInfo"]
  professionalSummary: string
  education: ProfileData["education"]
  workExperience: ProfileData["experience"]
  projects: ProfileData["projects"]
  skills: ProfileData["skills"]
  achievements: ProfileData["achievements"]
  certifications: ProfileData["certifications"]
  barAdmission?: ProfileData["barAdmission"]
  workAuthorization?: ProfileData["workAuthorization"]
  additionalInfo?: ProfileData["additionalInfo"]
  barDetails?: ProfileData["barDetails"]
  workAuthorizationDetails?: ProfileData["workAuthorizationDetails"]
  pastResumeDetails?: string
  jobDescription: string
  targetRole?: string
  template?: string
  tone?: string
  experienceLevel?: string
  length?: string
}

export type GenerateResumeApiResponse = {
  resume: GeneratedResume
  source: "claude" | "groq" | "gemini" | "local"
  modelUsed?: string
  tokenUsage?: ResumeTokenUsage
  warning?: string
}

export type ResumeTokenUsage = {
  provider: "claude" | "groq" | "gemini" | "openrouter"
  model: string
  apiKeyIndex: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const inFlightResumeRequests = new Map<string, Promise<GenerateResumeApiResponse>>()

export function profileToGeneratePayload({
  profile,
  jobDescription,
  targetRole,
  template,
  tone,
  experienceLevel,
  length,
}: {
  profile: ProfileData
  jobDescription: string
  targetRole?: string
  template?: string
  tone?: string
  experienceLevel?: string
  length?: string
}): GenerateResumePayload {
  return {
    personalInfo: profile.personalInfo,
    professionalSummary: profile.personalInfo.summary,
    education: profile.education,
    workExperience: profile.experience,
    projects: profile.projects,
    skills: profile.skills,
    achievements: profile.achievements,
    certifications: profile.certifications,
    barAdmission: profile.barAdmission,
    workAuthorization: profile.workAuthorization,
    additionalInfo: profile.additionalInfo,
    barDetails: profile.barDetails,
    workAuthorizationDetails: profile.workAuthorizationDetails,
    jobDescription,
    targetRole,
    template,
    tone,
    experienceLevel,
    length,
  }
}

export function payloadToProfile(payload: GenerateResumePayload): ProfileData {
  return {
    ...mockProfile,
    personalInfo: {
      ...mockProfile.personalInfo,
      ...payload.personalInfo,
      summary: payload.professionalSummary || payload.personalInfo.summary || "",
    },
    education: payload.education || [],
    experience: payload.workExperience || [],
    projects: payload.projects || [],
    skills: payload.skills || mockProfile.skills,
    achievements: payload.achievements || [],
    certifications: payload.certifications || [],
    barAdmission: payload.barAdmission || [],
    workAuthorization: payload.workAuthorization || "",
    additionalInfo: payload.additionalInfo || { languages: [], volunteer: [], memberships: [], interests: [] },
    barDetails: payload.barDetails || { admissions: [], usBarExams: [] },
    workAuthorizationDetails: payload.workAuthorizationDetails || { status: "", startDate: "", endDate: "", needsSponsorship: "" },
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

function getResumeRequestKey(payload: GenerateResumePayload) {
  return stableStringify(payload)
}

function notifyFallback(response: GenerateResumeApiResponse) {
  if (response.source !== "local" || !response.warning) return

  addNotification({
    type: "warning",
    title: "Resume generated with fallback",
    message: response.warning,
  })
}

export async function requestGeneratedResume(payload: GenerateResumePayload): Promise<GenerateResumeApiResponse> {
  const cacheKey = getResumeRequestKey(payload)

  const existingRequest = inFlightResumeRequests.get(cacheKey)
  if (existingRequest) return existingRequest

  const request = fetch("/api/generate-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error || "Resume generation failed")
    }

    const data = (await response.json()) as GenerateResumeApiResponse
    if (data.tokenUsage) {
      console.info("[resume-generation] token usage", data.tokenUsage)
    }
    notifyFallback(data)
    return data
  }).finally(() => {
    inFlightResumeRequests.delete(cacheKey)
  })

  inFlightResumeRequests.set(cacheKey, request)
  return request
}

// Legal-industry terms used for local ATS keyword extraction.
const keywordBank = [
  "Legal Research",
  "Legal Writing",
  "Legal Analysis",
  "Westlaw",
  "Lexis",
  "LexisNexis",
  "Bloomberg Law",
  "Bluebook",
  "Cite-Checking",
  "Bench Memoranda",
  "Research Memoranda",
  "Motion Practice",
  "Motion Drafting",
  "Brief Writing",
  "Appellate",
  "Oral Advocacy",
  "Moot Court",
  "Law Review",
  "Litigation",
  "Civil Procedure",
  "Federal Civil Procedure",
  "Criminal Law",
  "Evidence",
  "Discovery",
  "Depositions",
  "Document Review",
  "Due Diligence",
  "Contract Drafting",
  "Contract Review",
  "Transactional",
  "Corporate",
  "Mergers and Acquisitions",
  "Securities",
  "Regulatory Compliance",
  "Compliance",
  "Risk Management",
  "Intellectual Property",
  "Entertainment Law",
  "Employment Law",
  "Immigration Law",
  "Environmental Law",
  "Tax",
  "Real Estate",
  "Bankruptcy",
  "Public Interest",
  "Pro Bono",
  "Client Counseling",
  "Client Interviewing",
  "Negotiation",
  "Mediation",
  "Arbitration",
  "Trial Preparation",
  "Judicial Clerkship",
  "Externship",
  "Clinic",
  "Statutory Interpretation",
  "Relativity",
  "Spanish",
  "Mandarin",
  "French",
  "Bilingual",
  // Law students also apply to tax, consulting, and professional-services roles.
  "Transfer Pricing",
  "Corporate Tax",
  "Tax Compliance",
  "Tax Research",
  "Economics",
  "Finance",
  "Accounting",
  "Financial Analysis",
  "Benchmarking",
  "Report Writing",
  "Technical Writing",
  "Proofreading",
  "Editing",
  "Public Speaking",
  "Presentations",
  "Client Communication",
  "Project Management",
  "Microsoft Excel",
  "Microsoft Word",
  "PowerPoint",
  "Bloomberg Terminal",
]

// Headings and boilerplate verbs in job postings ("Job Duties", "Assists",
// "The") were being scored as required skills, which polluted the ATS keyword
// lists and the score. Single capitalized words like these are dropped.
const KEYWORD_STOPWORDS = new Set([
  "the", "this", "that", "these", "those", "and", "or", "but", "for", "with", "from", "into",
  "job", "jobs", "duties", "duty", "role", "roles", "position", "positions", "opportunity",
  "responsibilities", "requirements", "required", "qualifications", "preferred", "education",
  "experience", "experiences", "software", "language", "languages", "license", "licenses",
  "certifications", "supervisory", "additional", "other", "others", "overview", "summary",
  "information", "gathering", "analysis", "writing", "company", "companies", "client", "clients",
  "team", "teams", "work", "working", "candidate", "candidates", "applicant", "applicants",
  "you", "your", "we", "our", "us", "they", "their", "he", "she", "his", "her",
  "assists", "assist", "analyzes", "analyze", "writes", "write", "prepares", "prepare",
  "performs", "perform", "organizes", "organize", "takes", "take", "proofreads", "participates",
  "includes", "including", "provides", "provide", "helps", "help", "uses", "use", "used",
  "able", "ability", "strong", "skilled", "solid", "basic", "prior", "capable", "effective",
  "exceptional", "excellent", "proficient", "familiarity", "knowledge", "skills", "skill",
  "bachelors", "bachelor", "masters", "master", "degree", "degrees", "internship", "internships",
  "salary", "salaries", "benefits", "individual", "individuals", "not", "necessary", "n",
  // Generic words that read like proper nouns inside postings
  // ("Standard and Poor's", "Go Systems", "Microsoft Office Suite").
  "standard", "poor", "systems", "system", "suite", "products", "product", "moody", "branded",
  "context", "historical", "value", "drivers", "division", "distribution", "overview",
  // Imperative verbs that open posting sentences ("Draft bench memoranda").
  // Words that also end real skill names ("Document Review", "Litigation
  // Support") are deliberately not listed, because trimKeyword would cut them.
  "draft", "drafts", "conduct", "conducts", "attend", "attends", "ensure", "ensures",
  "maintain", "maintains", "coordinate", "coordinates", "serve", "serves", "handle",
  "handles", "plus", "represent", "represents",
  // Months: postings are full of dates ("July 2027 exam", "starts in August").
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december", "fall", "spring", "summer", "winter",
])

// "The Tax Associate" -> "Tax Associate": boilerplate words at either end of a
// phrase are dropped so the same skill is not listed twice.
function trimKeyword(term: string) {
  const words = term.trim().split(/\s+/)
  while (words.length && KEYWORD_STOPWORDS.has(normalize(words[0]))) words.shift()
  while (words.length && KEYWORD_STOPWORDS.has(normalize(words[words.length - 1]))) words.pop()
  return words.join(" ")
}

function isMeaningfulKeyword(term: string) {
  const cleaned = term.trim()
  if (cleaned.length < 3 || cleaned.length > 48) return false
  const words = cleaned.split(/\s+/)
  if (words.length === 1) return !KEYWORD_STOPWORDS.has(normalize(cleaned))
  // Multi-word terms are kept unless every word is boilerplate ("Job Duties").
  return words.some((word) => !KEYWORD_STOPWORDS.has(normalize(word)))
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim()
}

export function includesTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term))
}

// Shared by the resume preview and the cover letter page. The panel used to
// claim a document was "highly optimized" at any score.
export function atsScoreMessage(score: number) {
  if (score >= 85) return "Strong keyword match for this job"
  if (score >= 70) return "Good match — review the missing keywords below"
  if (score >= 55) return "Moderate match — add missing keywords you genuinely have"
  return "Low keyword match for this posting — this job may want experience you have not listed"
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

// Same keyword in two cases ("Presentations" / "presentations") counted twice
// and cluttered the ATS lists, so the first spelling wins.
function uniqueKeywords(values: string[]) {
  const seen = new Set<string>()
  const kept = values.filter((value) => {
    const key = normalize(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Drop fragments already covered by a longer keyword ("Report" vs "Report
  // Writing"), so one requirement is not scored twice.
  return kept.filter((value) => {
    const key = normalize(value)
    if (key.includes(" ")) return true
    return !kept.some((other) => {
      const otherKey = normalize(other)
      return otherKey !== key && otherKey.split(" ").includes(key)
    })
  })
}

function dateValue(value: string | undefined) {
  if (!value) return 0
  if (/present|current|ongoing/i.test(value)) return Number.MAX_SAFE_INTEGER
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) return parsed
  const year = value.match(/\d{4}/)
  return year ? Date.parse(`${year[0]}-01-01`) : 0
}

export function sortExperienceByRecency<T extends { startDate?: string; endDate?: string }>(experience: T[]) {
  return [...experience].sort(
    (a, b) => dateValue(b.endDate) - dateValue(a.endDate) || dateValue(b.startDate) - dateValue(a.startDate)
  )
}

function profileText(profile: ProfileData) {
  return [
    profile.personalInfo.summary,
    Object.values(profile.skills).flat().join(" "),
    profile.experience.flatMap((exp) => [exp.company, exp.position, exp.description.join(" ")]).join(" "),
    profile.projects.flatMap((project) => [
      project.name,
      project.description,
      project.technologies.join(" "),
      project.highlights.join(" "),
    ]).join(" "),
    profile.certifications.map((cert) => `${cert.name} ${cert.issuer}`).join(" "),
  ].join(" ")
}

// A posting's first sentence is usually its title and employer ("Judicial Law
// Clerk, U.S. District Court"). Long first lines are prose, not a heading.
function postingHeading(jobDescription: string) {
  const firstLine = jobDescription.split("\n").find((line) => line.trim()) || ""
  const firstSentence = firstLine.split(/(?<=[a-z]{2})\.\s+/)[0].trim()
  return firstSentence.length <= 120 ? firstSentence : ""
}

function countTerm(text: string, term: string) {
  const needle = normalize(term)
  return needle ? normalize(text).split(needle).length - 1 : 0
}

function extractKeywords(jobDescription: string) {
  const matchedBank = keywordBank.filter((keyword) => includesTerm(jobDescription, keyword))
  const requirementTerms = Array.from(
    jobDescription.matchAll(/\b(?:experience with|knowledge of|proficiency in|skills? in|required|preferred|familiarity with)\s+([^.;\n]+)/gi),
    (match) => match[1]
  )
    .flatMap((value) => value.split(/,|\/|\band\b|\bor\b/gi))
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && term.length < 48)
  const capitalizedTerms = Array.from(
    jobDescription.matchAll(/\b(?:[A-Z][a-zA-Z+#.]{2,})(?:[ \t]+[A-Z][a-zA-Z+#.]{2,}){0,2}\b/g),
    (match) => match[0]
  )
    // "Lexis. Bluebook" spans two sentences. Split where a period ends a word
    // of two or more lowercase letters, which leaves "U.S. District" intact.
    .flatMap((term) => term.split(/(?<=[a-z]{2})\.\s+/))
    .map((term) => term.replace(/(?<=[a-z]{2})\.$/, ""))

  // Bank matches are trusted; free text from the posting is filtered so section
  // headings, boilerplate verbs, and the posting's own title/employer never
  // appear as "required skills".
  const heading = postingHeading(jobDescription)
  const isHeadingOnly = (term: string) =>
    Boolean(heading) && includesTerm(heading, term) && countTerm(jobDescription, term) === 1
  const isFreeTextSkill = (term: string) => isMeaningfulKeyword(term) && !isHeadingOnly(term)
  return uniqueKeywords([
    ...matchedBank,
    ...requirementTerms.map(trimKeyword).filter(isFreeTextSkill),
    ...capitalizedTerms.map(trimKeyword).filter(isFreeTextSkill),
  ]).slice(0, 28)
}

function inferJobTitle(jobDescription: string) {
  const titlePatterns = [
    /(?:title|role|position)\s*[:-]\s*([^\n.]+)/i,
    /looking for a\s+([^.]+?)\s+to join/i,
    /\b(Judicial Law Clerk|Judicial Extern|Judicial Intern|Summer Associate|Associate Attorney|Staff Attorney|Deputy District Attorney|Deputy Public Defender|Legal Fellow|Legal Extern|Legal Intern|Law Clerk|Paralegal)\b/i,
  ]

  for (const pattern of titlePatterns) {
    const match = jobDescription.match(pattern)
    if (match?.[1]) return match[1].trim()
    if (match?.[0]) return match[0].trim()
  }

  return "Target Role"
}

function inferCompany(jobDescription: string) {
  const match = jobDescription.match(/(?:company|employer|organization)\s*[:-]\s*([^\n.]+)/i)
  return match?.[1]?.trim() || "Target Company"
}

function scoreText(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => score + (includesTerm(text, keyword) ? 1 : 0), 0)
}

// Keeps the student's own bullets. The local fallback never pads with generic
// filler; the AI providers do the job-specific rewriting.
function tailorBullets(bullets: string[], targetCount = 5) {
  return bullets.slice(0, targetCount)
}

function buildTailoredSkills(profile: ProfileData, jobDescription: string, keywords: string[], targetCount = 24) {
  const candidateText = profileText(profile)
  const allSkills = unique([
    ...Object.values(profile.skills).flat(),
    ...profile.projects.flatMap((project) => project.technologies),
    ...keywords.filter((keyword) => includesTerm(candidateText, keyword)),
    // Job-required skills missing from the profile, limited to the curated bank
    // so arbitrary capitalized words from the posting don't leak into skills.
    ...keywordBank.filter((keyword) => includesTerm(jobDescription, keyword)),
  ])

  return allSkills
    .map((skill) => ({
      skill,
      score:
        (includesTerm(jobDescription, skill) ? 3 : 0) +
        (keywords.some((keyword) => includesTerm(skill, keyword) || includesTerm(keyword, skill)) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill)
    .slice(0, targetCount)
}

// Not printed on the Loyola resume; used for cover letters.
function buildImprovedSummary(profile: ProfileData, jobTitle: string, keywords: string[]) {
  const focus = keywords.slice(0, 5).join(", ")
  const target = jobTitle === "Target Role" ? "legal positions" : `${jobTitle} positions`
  return [
    profile.personalInfo.summary.trim(),
    `Seeking ${target}${focus ? `, with experience relevant to ${focus}` : ""}.`,
  ].filter(Boolean).join(" ")
}

// Deterministic ATS score: percentage of job keywords actually present in the
// final resume text, mapped to a 40-98 range. Reproducible — not an LLM guess.
export function scoreResumeAgainstJob(resumeText: string, jobDescription: string) {
  const keywords = extractKeywords(jobDescription)
  if (!keywords.length) {
    return { atsScore: 70, matchedKeywords: [] as string[], missingKeywords: [] as string[] }
  }
  const matchedKeywords = keywords.filter((keyword) => includesTerm(resumeText, keyword))
  const missingKeywords = keywords.filter((keyword) => !includesTerm(resumeText, keyword))
  const atsScore = Math.round(40 + 58 * (matchedKeywords.length / keywords.length))
  return { atsScore, matchedKeywords, missingKeywords }
}

// Every template shares the Loyola layout, so the ATS/plain text is built from
// the same document model the preview, PDF, and DOCX render.
export function formatResumeText(resume: Omit<GeneratedResume, "resume">) {
  return documentToText(buildResumeDocument(resume))
}

// For job analysis: which real profile entries speak to this posting, most
// relevant first, and which of the job's keywords each one covers. Entries that
// match nothing are left out rather than padded in.
export function rankExperienceForJob(profile: ProfileData, jobDescription: string) {
  const keywords = extractKeywords(jobDescription)
  return profile.experience
    .map((experience) => {
      const text = `${experience.position} ${experience.company} ${experience.description.join(" ")}`
      return { experience, matchedKeywords: keywords.filter((keyword) => includesTerm(text, keyword)) }
    })
    .filter((entry) => entry.matchedKeywords.length > 0)
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length)
}

export function generateResumeFromJob({
  profile,
  jobDescription,
  template,
  tone,
  experienceLevel,
  length,
}: {
  profile: ProfileData
  jobDescription: string
  template: string
  tone: string
  experienceLevel: string
  length: string
}): GeneratedResume {
  const jobKeywords = extractKeywords(jobDescription)
  const text = profileText(profile)
  const matchedKeywords = jobKeywords.filter((keyword) => includesTerm(text, keyword))
  const missingKeywords = jobKeywords.filter((keyword) => !includesTerm(text, keyword)).slice(0, 8)
  const keywordsAdded = unique([...matchedKeywords, ...missingKeywords]).slice(0, 14)
  const isDenseOnePage = template === "original-cv" || template === "university-law"
  const hasSupplementalSections = profile.certifications.length > 0 || profile.achievements.length > 0
  const tailoredSkills = buildTailoredSkills(profile, jobDescription, keywordsAdded, isDenseOnePage ? 36 : hasSupplementalSections ? 24 : 30)
  const experienceCount = Math.min(profile.experience.length, 4)
  const bulletCount = 6

  const selectedExperience = sortExperienceByRecency(profile.experience
    .map((exp) => ({
      ...exp,
      description: tailorBullets(exp.description, bulletCount),
      score: scoreText(`${exp.position} ${exp.company} ${exp.description.join(" ")}`, keywordsAdded),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, experienceCount)
    .map(({ score: _score, ...exp }) => exp))

  // Projects are not part of the Loyola format.
  const selectedProjects: ProfileData["projects"] = []

  const atsScore = Math.min(98, 72 + matchedKeywords.length * 3 + Math.min(missingKeywords.length, 5) * 2)
  const jobTitle = inferJobTitle(jobDescription)

  const generatedWithoutText = {
    profile,
    jobTitle,
    company: inferCompany(jobDescription),
    template,
    tone,
    experienceLevel,
    length,
    summary: buildImprovedSummary(profile, jobTitle, keywordsAdded),
    improvedSummary: buildImprovedSummary(profile, jobTitle, keywordsAdded),
    matchSummary: `Matched ${matchedKeywords.length} job requirements from the profile and identified ${missingKeywords.length} gaps to review.`,
    selectedExperience,
    selectedProjects,
    selectedCertifications: profile.certifications.slice(0, isDenseOnePage ? 4 : length === "short" ? 2 : 4),
    selectedAchievements: profile.achievements.slice(0, isDenseOnePage ? 8 : 6),
    tailoredSkills,
    matchedKeywords,
    missingKeywords,
    keywordsAdded,
    changeHighlights: [
      `Formatted in the Loyola Law resume layout for ${jobTitle}`,
      `Prioritized ${selectedExperience.length} experience section${selectedExperience.length === 1 ? "" : "s"} most relevant to the job`,
      `Added or emphasized ${keywordsAdded.slice(0, 5).join(", ") || "job-specific"} keywords`,
    ],
    atsScore,
    strengths: [
      "Resume content is tailored to the job description",
      "Relevant experience is prioritized",
      "Bar admission, work authorization, and education follow the Loyola Law format",
      "ATS keywords from the posting are included in the resume",
      "Bullet points use action-oriented language",
    ],
    suggestions: missingKeywords.length
      ? missingKeywords.slice(0, 3).map((keyword) => `Validate your real experience with ${keyword} before submitting`)
      : ["Job requirements are well covered by your profile knowledge base"],
    generatedAt: new Date().toISOString(),
  }

  const resumeText = formatResumeText(generatedWithoutText)
  const deterministicScore = scoreResumeAgainstJob(resumeText, jobDescription)

  return {
    ...generatedWithoutText,
    atsScore: deterministicScore.atsScore,
    matchedKeywords: deterministicScore.matchedKeywords,
    missingKeywords: deterministicScore.missingKeywords,
    resume: resumeText,
  }
}
