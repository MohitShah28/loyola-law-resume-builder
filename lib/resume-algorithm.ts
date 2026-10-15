// The three-stage tailoring algorithm used by /api/generate-resume.
//
//   Stage 1  Recruiter audit  - a senior recruiter for this exact role scores
//            the profile against the posting, names the missing keywords, and
//            lists the red flags visible in a ten-second skim.
//   Stage 2  Rewrite          - the resume is rewritten to close those gaps,
//            using the XYZ shape (accomplished X, measured by Y, by doing Z).
//   Stage 3  ATS scan         - an ATS parser and a hiring manager reading 200
//            resumes say which sections get skipped, and rewrite them.
//
// Everything here is pure: prompt text in, parsed and bounded data out. The
// provider calls live in the route.
//
// The hard rule across all three stages: a tailored resume may re-order,
// re-word and re-frame what the student actually did. It may never add a fact,
// and it may never invent a number. "Measured by Y" is the part of the XYZ
// formula that invites fabrication, so Y must come from the student's own data
// or be expressed as real scope rather than a figure.

export type RedFlag = {
  flag: string
  why: string
  fix: string
}

export type RecruiterAudit = {
  matchScore: number
  verdict: string
  missingKeywords: string[]
  redFlags: RedFlag[]
}

export type SkippedSection = {
  section: string
  why: string
  rewrite: string
}

export type AtsScan = {
  skippedSections: SkippedSection[]
  stopTheScroll: string[]
}

export const NO_INVENTION_RULES = [
  "Use only facts present in the candidate data. Never add an employer, date, degree, course, certification, or practice area.",
  'Never invent a number. No invented counts, percentages, dollar amounts, caseloads, or team sizes. A figure may appear only if it is already in the candidate data.',
  "Never upgrade involvement: observed stays observed, assisted stays assisted, shadowed stays shadowed.",
  "Never move work into a different practice area, forum, or client type to match the posting.",
].join("\n- ")

const MAX_MISSING_KEYWORDS = 5
const MAX_RED_FLAGS = 3
const MAX_SKIPPED_SECTIONS = 3

function cleanLine(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : ""
}

function cleanList(value: unknown, limit: number, maxLength = 120) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    const text = cleanLine(item, maxLength)
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

// Stage 1 ---------------------------------------------------------------

export function buildRecruiterAuditPrompt({
  jobDescription,
  profileText,
  jobTitle,
  company,
}: {
  jobDescription: string
  profileText: string
  jobTitle?: string
  company?: string
}) {
  const role = [jobTitle, company].filter(Boolean).join(" at ") || "the posted role"
  return `Act as a senior recruiter hiring for ${role}. You screen candidates for this exact posting every week.

Assess the candidate's profile against the job description and answer as a recruiter would in a hiring meeting: direct, specific, no encouragement.

What to return:
- matchScore: 0-100, how strong this candidate is for THIS posting. Be strict. A score above 85 means you would shortlist today. Judge only on evidence in the profile.
- verdict: one sentence explaining the score, naming the single biggest strength and the single biggest gap.
- missingKeywords: up to ${MAX_MISSING_KEYWORDS} terms the posting asks for that the profile never mentions, most damaging first. Skills and qualifications only, not the job title or the employer's name.
- redFlags: exactly the ${MAX_RED_FLAGS} problems a hiring manager would notice in a ten-second skim of this resume. Each needs:
    flag  - what they would notice
    why   - why it costs the candidate the interview
    fix   - what the candidate can do about it using experience they genuinely have, or what they must honestly acquire

Rules:
- ${NO_INVENTION_RULES}
- Red flags must be visible in the resume itself: vague bullets with no outcome, no evidence of a required skill, experience that reads as unrelated to this posting, a stale or thin section, no sign of the required credential.
- Do not invent biography. If the profile does not show a gap in dates, do not claim one.
- Return valid JSON only, no markdown.

Return this exact shape:
{"matchScore": 0, "verdict": "", "missingKeywords": [""], "redFlags": [{"flag": "", "why": "", "fix": ""}]}

JOB DESCRIPTION:
${jobDescription.slice(0, 6000)}

CANDIDATE PROFILE:
${profileText.slice(0, 8000)}`
}

export function parseRecruiterAudit(value: unknown): RecruiterAudit | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const rawScore = Number(raw.matchScore)
  const matchScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0
  const redFlags = Array.isArray(raw.redFlags)
    ? raw.redFlags
        .map((item) => {
          const flag = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          return {
            flag: cleanLine(flag.flag, 160),
            why: cleanLine(flag.why, 240),
            fix: cleanLine(flag.fix, 240),
          }
        })
        .filter((item) => item.flag)
        .slice(0, MAX_RED_FLAGS)
    : []
  const audit: RecruiterAudit = {
    matchScore,
    verdict: cleanLine(raw.verdict, 300),
    missingKeywords: cleanList(raw.missingKeywords, MAX_MISSING_KEYWORDS),
    redFlags,
  }
  // A response with no usable content is a failure, not an empty result.
  if (!audit.verdict && !audit.missingKeywords.length && !audit.redFlags.length) return null
  return audit
}

// Stage 2 ---------------------------------------------------------------

// Appended to the main tailoring prompt so the rewrite answers the audit
// instead of ignoring it.
export function buildRewriteDirectives(audit: RecruiterAudit | null) {
  if (!audit) return ""
  const missing = audit.missingKeywords.length
    ? `\n- Terms this posting wants that the profile never states: ${audit.missingKeywords.join(", ")}. Use one ONLY where the candidate's real work already is that thing, phrased in the posting's words. If the candidate has not done it, leave it out — the gap is reported to the student separately.`
    : ""
  const flags = audit.redFlags.length
    ? `\n- A recruiter skimming this resume for ten seconds flagged:\n${audit.redFlags
        .map((item, index) => `    ${index + 1}. ${item.flag} — ${item.why}`)
        .join("\n")}\n  Fix what rewriting can fix: make vague bullets concrete, lead with the work this posting cares about, and cut filler. Do not fix a flag by inventing experience.`
    : ""

  return `

STAGE 2 — REWRITE AGAINST THE RECRUITER AUDIT (match score ${audit.matchScore}/100)
Write each experience bullet in the XYZ shape where the candidate's own data supports it: accomplished X, as measured by Y, by doing Z.
- X is the result or output: what existed afterwards that did not before.
- Y is the measure. Use a number ONLY if that number is already in the candidate data. When there is no real number, measure with real scope instead — the forum, the governing law, the document type, the stage of the matter, the language used with clients. Writing "40+ memoranda" when the profile does not say 40 is a fabrication and is forbidden.
- Z is the method: the research, drafting, advocacy, or client work that produced X.
- Keep the Loyola bullet style: one line, past-tense verb first, no ending period.${missing}${flags}`
}

// Stage 3 ---------------------------------------------------------------

export function buildAtsScanPrompt({
  jobDescription,
  resumeText,
}: {
  jobDescription: string
  resumeText: string
}) {
  return `Act as two readers at once.

Reader one is the applicant tracking system that parses this resume into fields. Reader two is a hiring manager working through 200 resumes in one sitting, giving each about eight seconds before deciding to read on or move to the next.

Name the sections that get skipped — the ones an ATS would mis-parse or a tired human would slide past — and rewrite them so they hold attention.

What to return:
- skippedSections: up to ${MAX_SKIPPED_SECTIONS} entries, worst first. Each needs:
    section  - the section or entry as it appears on the resume (for example "EXPERIENCE — Bet Tzedek Legal Services" or "ADDITIONAL INFORMATION")
    why      - why it gets skipped: buried under a stronger entry, generic phrasing, no evidence of what the posting asks for, formatting an ATS mis-reads
    rewrite  - the replacement text, in the same format as the original (bullets stay bullets, one line each, past-tense verb first, no ending period)
- stopTheScroll: up to 3 short notes on what now makes a skimmer stop.

Rules:
- ${NO_INVENTION_RULES}
- A rewrite re-words and re-orders what is already there. If a section is weak because the candidate genuinely lacks the experience, say so in "why" and keep the rewrite honest rather than padding it.
- Plain text only. No markdown, tables, or icons — an ATS reads none of them.
- Return valid JSON only.

Return this exact shape:
{"skippedSections": [{"section": "", "why": "", "rewrite": ""}], "stopTheScroll": [""]}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

RESUME AS IT STANDS:
${resumeText.slice(0, 7000)}`
}

export function parseAtsScan(value: unknown): AtsScan | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const skippedSections = Array.isArray(raw.skippedSections)
    ? raw.skippedSections
        .map((item) => {
          const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          return {
            section: cleanLine(entry.section, 160),
            why: cleanLine(entry.why, 240),
            rewrite: typeof entry.rewrite === "string" ? entry.rewrite.trim().slice(0, 900) : "",
          }
        })
        .filter((item) => item.section && (item.why || item.rewrite))
        .slice(0, MAX_SKIPPED_SECTIONS)
    : []
  const scan: AtsScan = {
    skippedSections,
    stopTheScroll: cleanList(raw.stopTheScroll, 3, 200),
  }
  if (!scan.skippedSections.length && !scan.stopTheScroll.length) return null
  return scan
}

export const ALGORITHM_SYSTEM_PROMPT =
  "You advise law students on resumes for legal roles: clerkships, firm associate and summer associate positions, government and public interest work. You are blunt, specific, and you never invent experience, credentials, or numbers. Return valid JSON only."
