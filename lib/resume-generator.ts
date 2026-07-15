import { mockProfile } from "@/lib/data"
import { addNotification } from "@/lib/notifications"

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
  provider: "claude" | "groq" | "gemini"
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

const keywordBank = [
  "Python",
  "SQL",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Web Applications",
  "Website Features",
  "Backend Development",
  "APIs",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "TensorFlow",
  "Machine Learning",
  "Deep Learning",
  "NLP",
  "LLMs",
  "AI",
  "AI Model Training",
  "Prompt Engineering",
  "Data Analysis",
  "Data Visualization",
  "Tableau",
  "Power BI",
  "Business Intelligence",
  "ETL",
  "Data Pipeline",
  "Dashboard",
  "Analytics",
  "A/B Testing",
  "Predictive Analytics",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Spark",
  "Stakeholder Management",
  "Executive Presentation",
  "Cross-functional Collaboration",
  "Agile",
  "Leadership",
  "Automation",
  "Workflow Automation",
  "Internal Tools",
  "QA",
  "Debugging",
  "Deployment",
  "Startup",
  "Product Development",
  "Reporting",
  "Forecasting",
  "Customer Segmentation",
]

const actionVerbs = ["Built", "Developed", "Automated", "Optimized", "Delivered", "Collaborated on"]

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim()
}

function includesTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term))
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
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
    jobDescription.matchAll(/\b(?:[A-Z][a-zA-Z+#.]{2,})(?:\s+[A-Z][a-zA-Z+#.]{2,}){0,2}\b/g),
    (match) => match[0]
  ).filter((term) => !["The", "And", "Job", "Description", "Responsibilities", "Requirements"].includes(term))

  return unique([...matchedBank, ...requirementTerms, ...capitalizedTerms]).slice(0, 28)
}

function inferJobTitle(jobDescription: string) {
  const titlePatterns = [
    /(?:title|role|position)\s*[:-]\s*([^\n.]+)/i,
    /looking for a\s+([^.]+?)\s+to join/i,
    /\b(Software Engineering Intern|Software Engineer Intern|Software Developer Intern|Software Engineer|Software Developer|Data Analyst|Data Scientist|Business Analyst|ML Engineer|Machine Learning Engineer|Analytics Manager)\b/i,
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

function tailorBullets(bullets: string[], keywords: string[], jobDescription: string, targetCount = 5) {
  const selectedKeywords = keywords.slice(0, 6)
  const roleFocus = selectedKeywords.slice(0, 3).join(", ")
  const tailored = bullets.slice(0, targetCount)

  if (tailored.length >= targetCount) return tailored

  return [
    ...tailored,
    roleFocus
      ? `Translated requirements involving ${roleFocus} into practical deliverables, documentation, and reusable workflows`
      : "Collaborated with stakeholders to translate business requirements into practical technical solutions",
    includesTerm(jobDescription, "team") || includesTerm(jobDescription, "stakeholder")
      ? "Communicated progress, tradeoffs, and results clearly with technical and non-technical stakeholders"
      : "Documented workflows, tested outputs, and improved repeatability for analytical and automation processes",
    includesTerm(jobDescription, "quality") || includesTerm(jobDescription, "test")
      ? "Validated outputs through review, testing, and iteration to improve quality and reliability"
      : "Improved project quality by organizing outputs for easier review, reuse, and decision-making",
    includesTerm(jobDescription, "data") || includesTerm(jobDescription, "analysis")
      ? "Cleaned, structured, and interpreted data to identify trends, explain findings, and support practical recommendations"
      : "Organized project requirements, implementation notes, and final outputs so work could be reviewed and extended",
    includesTerm(jobDescription, "business") || includesTerm(jobDescription, "analyst")
      ? "Converted business questions into analysis plans, technical tasks, and concise reporting for decision makers"
      : "Balanced technical execution with usability, maintainability, and clear communication of results",
    "Reviewed deliverables for completeness, consistency, and alignment with stakeholder expectations before final handoff",
  ].slice(0, targetCount)
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
        (keywords.some((keyword) => includesTerm(skill, keyword) || includesTerm(keyword, skill)) ? 2 : 0) +
        (["JavaScript", "TypeScript", "Next.js", "Python", "OpenAI API", "SQL", "Git", "Docker"].includes(skill) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill)
    .slice(0, targetCount)
}

function buildImprovedSummary(profile: ProfileData, jobTitle: string, keywords: string[]) {
  const focus = keywords.slice(0, 5).join(", ")
  if (includesTerm(jobTitle, "software")) {
    return `Software developer and data-focused builder with experience in Python, JavaScript, TypeScript, automation, and AI-driven applications. Strong foundation in analytics, dashboards, workflow tooling, and full-cycle project execution, with interest in building product features, internal tools, and LLM-powered systems for practical business use cases.${focus ? ` Relevant focus areas include ${focus}.` : ""} Known for translating ambiguous requirements into usable technical solutions, improving processes through automation, and presenting clear outputs for technical and non-technical stakeholders.`
  }

  return `${profile.personalInfo.summary} Tailored for ${jobTitle} roles${focus ? ` with emphasis on ${focus}` : ""}. Brings hands-on experience across data cleaning, dashboards, automation, project delivery, and stakeholder-focused problem solving, with a strong ability to turn complex requirements into practical, measurable outputs.`
}

function tailorProjectHighlights(project: ProfileData["projects"][number], keywords: string[], jobDescription: string, targetCount = 5) {
  const existingHighlights = project.highlights.length
    ? project.highlights
    : [project.description]
  const projectEvidence = `${project.name} ${project.description} ${project.technologies.join(" ")} ${project.highlights.join(" ")}`
  const relevantKeywords = keywords.filter((keyword) => includesTerm(projectEvidence, keyword))
  const relevantTechnologies = project.technologies.filter((technology) =>
    keywords.some((keyword) => includesTerm(technology, keyword) || includesTerm(keyword, technology)) ||
    includesTerm(jobDescription, technology)
  )
  const rewrittenHighlights = existingHighlights.slice(0, targetCount)
  const supportedAdditions = [
    project.description
      ? `Delivered ${/^[A-Z][a-z]/.test(project.description) ? project.description.charAt(0).toLowerCase() + project.description.slice(1) : project.description}`
      : "",
    relevantTechnologies.length
      ? `Used ${relevantTechnologies.slice(0, 5).join(", ")} to support project implementation and analysis`
      : "",
    relevantKeywords.length && (includesTerm(projectEvidence, "dashboard") || includesTerm(projectEvidence, "visual") || includesTerm(projectEvidence, "report"))
      ? `Organized findings into dashboard-ready outputs and visual summaries using supported project workflows`
      : "",
    relevantKeywords.length && (includesTerm(projectEvidence, "analysis") || includesTerm(projectEvidence, "data"))
      ? `Analyzed project data and outputs to surface practical insights for decision-making`
      : "",
  ]

  return unique([
    ...rewrittenHighlights,
    ...supportedAdditions,
  ]).slice(0, targetCount)
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

export function formatResumeText(resume: Omit<GeneratedResume, "resume">) {
  const profile = resume.profile
  const skills = resume.tailoredSkills.length ? resume.tailoredSkills : [
      ...profile.skills.programming,
      ...profile.skills.dataAnalysis,
      ...profile.skills.visualization,
      ...profile.skills.cloud,
      ...profile.skills.tools,
    ]
  const profileCertifications = Array.isArray(profile.certifications) ? profile.certifications : []
  const profileAchievements = Array.isArray(profile.achievements) ? profile.achievements : []
  const certificationSource = resume.selectedCertifications.length ? resume.selectedCertifications : profileCertifications
  const achievementSource = resume.selectedAchievements.length ? resume.selectedAchievements : profileAchievements
  const profileAchievementSet = new Set(profileAchievements.map(normalize).filter(Boolean))
  const certificationLines = certificationSource.filter((cert) =>
    profileCertifications.some((profileCert) =>
      (cert.id && profileCert.id && cert.id === profileCert.id) || normalize(cert.name) === normalize(profileCert.name)
    )
  ).map((cert) => [
    cert.name,
    cert.issuer,
    cert.date,
    cert.credentialId ? `Credential ID: ${cert.credentialId}` : "",
  ].filter(Boolean).join(" | "))
  const achievementLines = achievementSource
    .filter((achievement) => profileAchievementSet.has(normalize(achievement)))
    .map((achievement) => `- ${achievement}`)

  if (resume.template === "university-law") {
    return [
      `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.toUpperCase(),
      `${profile.personalInfo.location} | ${profile.personalInfo.phone} | ${profile.personalInfo.email}`,
      [profile.personalInfo.linkedin, profile.personalInfo.github].filter(Boolean).join(" | "),
      "",
      "PROFILE",
      resume.improvedSummary,
      "",
      "EDUCATION",
      ...profile.education.flatMap((edu) => [
        edu.institution,
        `${edu.degree} in ${edu.field} | ${edu.endDate}`,
        edu.gpa ? `GPA: ${edu.gpa}` : "",
        "",
      ]),
      "EXPERIENCE",
      ...resume.selectedExperience.flatMap((exp) => [
        `${exp.company} | ${exp.location}`,
        `${exp.position} | ${exp.startDate} - ${exp.endDate}`,
        ...exp.description.map((bullet) => `- ${bullet}`),
        "",
      ]),
      "PROJECTS",
      ...resume.selectedProjects.flatMap((project) => [
        `${project.name} | ${project.technologies.join(", ")}`,
        project.description,
        ...project.highlights.map((highlight) => `- ${highlight}`),
        "",
      ]),
      "TECHNICAL SKILLS",
      unique(skills).join(", "),
      certificationLines.length ? "" : undefined,
      certificationLines.length ? "CERTIFICATIONS" : undefined,
      ...certificationLines,
      achievementLines.length ? "" : undefined,
      achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
      ...achievementLines,
    ].filter((line) => line !== undefined).join("\n").trim()
  }

  if (resume.template === "original-cv") {
    const expertise = unique([
      "Business Systems Analysis",
      "Python & SQL Programming",
      "Project Management",
      "Data Analysis & Reporting",
      "Database Management",
      "Technical Documentation",
      "Data Visualization",
      "Cross-Functional Collaboration",
      ...skills,
    ]).slice(0, 15)

    return [
      `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}, M.SC.`,
      `${resume.jobTitle !== "Target Role" ? resume.jobTitle : "Business Analyst"} | Data Specialist | Data Analyst`,
      `${profile.personalInfo.phone} | ${profile.personalInfo.location} | ${profile.personalInfo.email} | ${profile.personalInfo.linkedin}`,
      "",
      "PROFESSIONAL SUMMARY",
      resume.improvedSummary,
      "",
      "AREAS OF EXPERTISE",
      expertise.map((skill) => `- ${skill}`).join("\n"),
      "",
      "PROFESSIONAL EXPERIENCE",
      ...resume.selectedExperience.flatMap((exp) => [
        `${exp.position} | ${exp.company}, ${exp.location} | ${exp.startDate} - ${exp.endDate}`,
        ...exp.description.map((bullet) => `- ${bullet}`),
        "",
      ]),
      "PROJECTS",
      ...resume.selectedProjects.flatMap((project) => [
        `${project.name}`,
        `Tools: ${project.technologies.join(", ")}`,
        ...project.highlights.map((highlight) => `- ${highlight}`),
        "",
      ]),
      "EDUCATION",
      ...profile.education.map((edu) => `${edu.degree} in ${edu.field}, ${edu.institution}${edu.gpa ? ` [${edu.gpa} GPA]` : ""}`),
      "",
      "TECHNICAL SKILLS",
      `Programming Languages: ${profile.skills.programming.join(", ")}`,
      `Business Intelligence: ${unique([...profile.skills.visualization, "MS Excel"]).join(", ")}`,
      `Data & Machine Learning: ${profile.skills.dataAnalysis.join(", ")}`,
      `Databases & Tools: ${unique([...profile.skills.databases, ...profile.skills.tools]).join(", ")}`,
      certificationLines.length ? "" : undefined,
      certificationLines.length ? "CERTIFICATIONS" : undefined,
      ...certificationLines,
      achievementLines.length ? "" : undefined,
      achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
      ...achievementLines,
    ].filter((line) => line !== undefined).join("\n").trim()
  }

  return [
    `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`,
    `${profile.personalInfo.email} | ${profile.personalInfo.phone} | ${profile.personalInfo.location}`,
    [profile.personalInfo.linkedin, profile.personalInfo.github].filter(Boolean).join(" | "),
    "",
    "PROFESSIONAL SUMMARY",
    resume.improvedSummary,
    "",
    "TECHNICAL SKILLS",
    unique(skills).join(", "),
    "",
    "PROFESSIONAL EXPERIENCE",
    ...resume.selectedExperience.flatMap((exp) => [
      `${exp.position} | ${exp.company} | ${exp.location} | ${exp.startDate} - ${exp.endDate}`,
      ...exp.description.map((bullet) => `- ${bullet}`),
      "",
    ]),
    "PROJECTS",
    ...resume.selectedProjects.flatMap((project) => [
      `${project.name} | ${project.technologies.join(", ")}`,
      ...project.highlights.map((highlight) => `- ${highlight}`),
      "",
    ]),
    "EDUCATION",
    ...profile.education.map((edu) => `${edu.degree} in ${edu.field} | ${edu.institution} | ${edu.endDate}`),
    certificationLines.length ? "" : undefined,
    certificationLines.length ? "CERTIFICATIONS" : undefined,
    ...certificationLines,
    achievementLines.length ? "" : undefined,
    achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
    ...achievementLines,
  ].filter((line) => line !== undefined).join("\n").trim()
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
  const experienceCount = isDenseOnePage ? Math.min(profile.experience.length, 4) : 3
  const projectCount = isDenseOnePage ? Math.min(profile.projects.length, 4) : hasSupplementalSections ? 3 : Math.min(profile.projects.length, 4)
  const bulletCount = isDenseOnePage ? 8 : hasSupplementalSections ? 5 : 6
  const projectBulletCount = isDenseOnePage ? 5 : 5
  const softwareRoleBoost = (text: string) =>
    includesTerm(jobDescription, "software") || includesTerm(jobDescription, "website") || includesTerm(jobDescription, "LLM")
      ? scoreText(text, ["JavaScript", "TypeScript", "Python", "AI", "LLMs", "Automation", "Dashboard", "API", "OpenAI", "Next.js"]) * 2
      : 0

  const selectedExperience = sortExperienceByRecency(profile.experience
    .map((exp) => ({
      ...exp,
      description: tailorBullets(exp.description, keywordsAdded, jobDescription, bulletCount),
      score:
        scoreText(`${exp.position} ${exp.company} ${exp.description.join(" ")}`, keywordsAdded) +
        softwareRoleBoost(`${exp.position} ${exp.company} ${exp.description.join(" ")}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, experienceCount)
    .map(({ score: _score, ...exp }) => exp))

  const selectedProjects = profile.projects
    .map((project) => ({
      ...project,
      highlights: tailorProjectHighlights(project, keywordsAdded, jobDescription, projectBulletCount),
      score:
        scoreText(`${project.name} ${project.description} ${project.technologies.join(" ")} ${project.highlights.join(" ")}`, keywordsAdded) +
        softwareRoleBoost(`${project.name} ${project.description} ${project.technologies.join(" ")} ${project.highlights.join(" ")}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, projectCount)
    .map(({ score: _score, ...project }) => project)

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
      `Rewrote the professional summary for ${jobTitle}`,
      `Prioritized ${selectedExperience.length} experience section${selectedExperience.length === 1 ? "" : "s"} most relevant to the job`,
      `Optimized ${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"} with job-aligned descriptions and bullets`,
      `Added or emphasized ${keywordsAdded.slice(0, 5).join(", ") || "job-specific"} keywords`,
    ],
    atsScore,
    strengths: [
      "Resume content is tailored to the job description",
      "Relevant profile experience and projects are prioritized",
      "Project bullets are rewritten from existing project evidence",
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
