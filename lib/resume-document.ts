import type { GeneratedResume, ProfileData } from "@/lib/resume-generator"

// Single source of truth for resume layout, modeled on the official Loyola Law
// sample resume. Every template (preview, PDF, DOCX, copied text, ATS text)
// renders this same structure; templates only change fonts and heading style.
//
//   NAME
//   Location | Phone | Email
//   BAR ADMISSION           plain lines
//   WORK AUTHORIZATION      plain line
//   EDUCATION               School ........ Location
//                           Degree, Honors ....... Date
//                           Activities:  entry; entry
//   EXPERIENCE              Employer ...... Location
//                           Position ...... Start – End
//                           • bullet
//   ADDITIONAL INFORMATION  Label:  value; value

export type LabeledRow = { label: string; value: string }

export type EducationEntry = {
  id: string
  institution: string
  location: string
  degreeLine: string
  date: string
  rows: LabeledRow[]
}

export type ExperienceEntry = {
  id: string
  company: string
  location: string
  position: string
  dates: string
  bullets: string[]
}

export type ResumeSection =
  | { kind: "lines"; title: string; lines: string[] }
  | { kind: "education"; title: string; entries: EducationEntry[] }
  | { kind: "experience"; title: string; entries: ExperienceEntry[] }
  | { kind: "rows"; title: string; rows: LabeledRow[] }

export type ResumeDocument = {
  name: string
  contact: string
  sections: ResumeSection[]
}

export type ResumeDocumentInput = Pick<
  GeneratedResume,
  "profile" | "selectedExperience" | "selectedCertifications" | "selectedAchievements" | "tailoredSkills"
>

type EducationItem = ProfileData["education"][number]

// International students: the Work Authorization line is built from a status
// plus dates. These are general descriptions for a resume, not legal advice.
export const WORK_AUTHORIZATION_STATUSES = [
  { value: "us-citizen", label: "U.S. Citizen" },
  { value: "permanent-resident", label: "U.S. Permanent Resident (Green Card)" },
  { value: "f1-opt", label: "F-1 student: OPT (Optional Practical Training)" },
  { value: "f1-cpt", label: "F-1 student: CPT (Curricular Practical Training)" },
  { value: "j1-academic-training", label: "J-1 student: Academic Training" },
  { value: "h1b", label: "H-1B" },
  { value: "ead", label: "Other work authorization (EAD)" },
] as const

export const BAR_EXAM_STATUSES = [
  { value: "registered", label: "Registered for the exam" },
  { value: "eligible", label: "Eligible to sit for the exam" },
  { value: "passed", label: "Passed, admission pending" },
] as const

type WorkAuthorizationDetails = {
  status?: string
  startDate?: string
  endDate?: string
  needsSponsorship?: string
}

type BarProfile = Partial<Pick<ProfileData, "barAdmission" | "barDetails">>
type WorkAuthorizationProfile = Partial<Pick<ProfileData, "workAuthorization" | "workAuthorizationDetails">>

const MAX_SKILLS = 12

function clean(values: Array<string | undefined | null>) {
  return values.map((value) => (value || "").trim()).filter(Boolean)
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function formatDateRange(start?: string, end?: string) {
  const from = (start || "").trim()
  const to = (end || "").trim()
  if (from && to && from !== to) return `${from} – ${to}`
  return from || to
}

// "Bachelor of Laws, With Distinction" / "Bachelor of Arts, International Relations".
// The GPA field doubles as honors; a bare number is labeled as a GPA.
function formatDegreeLine(edu: EducationItem) {
  const honors = (edu.gpa || "").trim()
  const honorsText = honors && /^\d/.test(honors) ? `GPA: ${honors}` : honors
  return clean([edu.degree, edu.field, honorsText]).join(", ")
}

export function formatWorkAuthorization(details?: WorkAuthorizationDetails) {
  const start = (details?.startDate || "").trim()
  const end = (details?.endDate || "").trim()
  const through = end ? ` through ${end}` : ""
  switch (details?.status) {
    case "us-citizen":
      return "U.S. Citizen"
    case "permanent-resident":
      return "U.S. Permanent Resident"
    case "f1-opt":
      return start ? `Anticipated OPT start date ${start}${end ? `; authorized${through}` : ""}` : "Eligible for Optional Practical Training (OPT)"
    case "f1-cpt":
      return `Eligible for Curricular Practical Training (CPT)${start ? ` beginning ${start}` : ""}${through}`
    case "j1-academic-training":
      return `Eligible for J-1 Academic Training${start ? ` beginning ${start}` : ""}${through}`
    case "h1b":
      return `H-1B status${through}`
    case "ead":
      return `Authorized to work in the U.S.${through}`
    default:
      return ""
  }
}

// A typed-in line wins; otherwise the line is built from status and dates.
export function workAuthorizationLine(profile: WorkAuthorizationProfile) {
  return (profile.workAuthorization || "").trim() || formatWorkAuthorization(profile.workAuthorizationDetails)
}

function barName(jurisdiction: string) {
  return `${jurisdiction.trim().replace(/\s+bar$/i, "")} Bar`
}

// Sample style: "British Columbia Bar (2017)", "Registered for the July 2022
// California Bar exam". Admissions first, then U.S. bar exams, then extra lines.
export function barAdmissionLines(profile: BarProfile) {
  const admissions = (profile.barDetails?.admissions || [])
    .filter((item) => item.jurisdiction?.trim())
    .map((item) => `${barName(item.jurisdiction)}${item.year?.trim() ? ` (${item.year.trim()})` : ""}`)
  const exams = (profile.barDetails?.usBarExams || [])
    .filter((item) => item.jurisdiction?.trim())
    .map((item) => {
      const date = (item.examDate || "").trim()
      if (item.status === "passed") return `Passed the ${clean([date, barName(item.jurisdiction)]).join(" ")} exam; admission pending`
      if (item.status === "eligible") return `Eligible to sit for the ${barName(item.jurisdiction)} exam${date ? ` (${date})` : ""}`
      return `Registered for the ${clean([date, barName(item.jurisdiction)]).join(" ")} exam`
    })
  return [...admissions, ...exams, ...clean(profile.barAdmission || [])]
}

function row(label: string, values: string[]): LabeledRow | null {
  const items = clean(values)
  return items.length ? { label, value: items.join("; ") } : null
}

// Only skills the student actually entered, ordered by relevance to the job.
function orderedProfileSkills(profile: ProfileData, tailoredSkills: string[]) {
  const skills = Array.from(new Set(clean(Object.values(profile.skills || {}).flat())))
  const rank = new Map(tailoredSkills.map((skill, index) => [normalizeKey(skill), index]))
  const unranked = Number.MAX_SAFE_INTEGER
  return skills
    .map((skill, index) => ({ skill, index, rank: rank.get(normalizeKey(skill)) ?? unranked }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ skill }) => skill)
    .slice(0, MAX_SKILLS)
}

export function buildResumeDocument(resume: ResumeDocumentInput): ResumeDocument {
  const profile = resume.profile
  const info = profile.personalInfo
  const sections: ResumeSection[] = []

  const barAdmission = barAdmissionLines(profile)
  if (barAdmission.length) {
    sections.push({ kind: "lines", title: "Bar Admission", lines: barAdmission })
  }

  const workAuthorization = workAuthorizationLine(profile)
  if (workAuthorization) {
    sections.push({ kind: "lines", title: "Work Authorization", lines: [workAuthorization] })
  }

  const education = (profile.education || []).filter((edu) => clean([edu.institution, edu.degree]).length)
  if (education.length) {
    sections.push({
      kind: "education",
      title: "Education",
      entries: education.map((edu) => ({
        id: edu.id,
        institution: (edu.institution || "").trim(),
        location: (edu.location || "").trim(),
        degreeLine: formatDegreeLine(edu),
        date: (edu.endDate || "").trim(),
        rows: [
          row("Coursework", edu.coursework || []),
          row("Activities", edu.activities || []),
        ].filter((item): item is LabeledRow => Boolean(item)),
      })),
    })
  }

  const experience = resume.selectedExperience?.length ? resume.selectedExperience : profile.experience || []
  if (experience.length) {
    sections.push({
      kind: "experience",
      title: "Experience",
      entries: experience.map((exp) => ({
        id: exp.id,
        company: (exp.company || "").trim(),
        location: (exp.location || "").trim(),
        position: (exp.position || "").trim(),
        dates: formatDateRange(exp.startDate, exp.endDate),
        bullets: clean(exp.description || []),
      })),
    })
  }

  const additional = profile.additionalInfo
  const certifications = (resume.selectedCertifications || []).map((cert) => clean([cert.name, cert.issuer, cert.date]).join(", "))
  const additionalRows = [
    row("Languages", additional?.languages || []),
    row("Volunteer", additional?.volunteer || []),
    row("Memberships", additional?.memberships || []),
    row("Honors", resume.selectedAchievements || []),
    row("Certifications", certifications),
    row("Skills", orderedProfileSkills(profile, resume.tailoredSkills || [])),
    row("Interests", additional?.interests || []),
  ].filter((item): item is LabeledRow => Boolean(item))
  if (additionalRows.length) {
    sections.push({ kind: "rows", title: "Additional Information", rows: additionalRows })
  }

  return {
    name: clean([info.firstName, info.lastName]).join(" "),
    contact: clean([info.location, info.phone, info.email, info.linkedin]).join(" | "),
    sections,
  }
}

function twoColumn(left: string, right: string) {
  return clean([left, right]).join("\t")
}

// Plain text: used for Copy Resume, the cover-letter prompt, and ATS scoring.
export function documentToText(document: ResumeDocument) {
  const lines: string[] = [document.name.toUpperCase(), document.contact]

  for (const section of document.sections) {
    lines.push("", section.title.toUpperCase())
    if (section.kind === "lines") lines.push(...section.lines)
    if (section.kind === "rows") lines.push(...section.rows.map((item) => `${item.label}:\t${item.value}`))
    if (section.kind === "education") {
      section.entries.forEach((entry, index) => {
        if (index > 0) lines.push("")
        lines.push(twoColumn(entry.institution, entry.location), twoColumn(entry.degreeLine, entry.date))
        lines.push(...entry.rows.map((item) => `${item.label}:\t${item.value}`))
      })
    }
    if (section.kind === "experience") {
      section.entries.forEach((entry, index) => {
        if (index > 0) lines.push("")
        lines.push(twoColumn(entry.company, entry.location), twoColumn(entry.position, entry.dates))
        lines.push(...entry.bullets.map((bullet) => `• ${bullet}`))
      })
    }
  }

  return lines.filter((line, index) => line !== "" || index > 1).join("\n").trim()
}

export type DocxStyle = {
  font: string
  bodySize: number // half-points
  nameSize: number // half-points
  margin: number // twips
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

type RunStyle = { font?: string; bold?: boolean; italic?: boolean; underline?: boolean; size?: number }

// Child order follows the OOXML schema (rFonts, b, i, sz, u); Word and other
// readers ignore out-of-order properties.
function styledRun(text: string, style: RunStyle = {}) {
  if (!text) return ""
  const props = [
    style.font ? `<w:rFonts w:ascii="${style.font}" w:hAnsi="${style.font}" w:cs="${style.font}"/>` : "",
    style.bold ? "<w:b/>" : "",
    style.italic ? "<w:i/>" : "",
    style.size ? `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` : "",
    style.underline ? '<w:u w:val="single"/>' : "",
  ].join("")
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

const TAB_RUN = "<w:r><w:tab/></w:r>"

type ParagraphStyle = {
  center?: boolean
  before?: number
  tabs?: Array<{ align: "left" | "right"; pos: number }>
  indent?: { left: number; hanging: number }
}

// Child order follows the OOXML schema (tabs, spacing, ind, jc); otherwise
// Word and other readers drop the tab stops that right-align locations/dates.
function paragraph(runs: string, style: ParagraphStyle = {}) {
  const props = [
    style.tabs?.length
      ? `<w:tabs>${style.tabs.map((tab) => `<w:tab w:val="${tab.align}" w:pos="${tab.pos}"/>`).join("")}</w:tabs>`
      : "",
    `<w:spacing w:before="${style.before || 0}" w:after="0"/>`,
    style.indent ? `<w:ind w:left="${style.indent.left}" w:hanging="${style.indent.hanging}"/>` : "",
    style.center ? '<w:jc w:val="center"/>' : "",
  ].join("")
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`
}

const LABEL_COLUMN = 1440 // 1 inch, like the "Activities:" column in the sample
const BULLET_INDENT = 720
const BULLET_HANGING = 360
const PAGE_WIDTH = 12240

// WordprocessingML <w:body> content (without sectPr) for the Loyola layout.
export function documentToDocxBody(document: ResumeDocument, style: DocxStyle) {
  const rightTab = PAGE_WIDTH - style.margin * 2
  const run = (text: string, runStyle: RunStyle = {}) => styledRun(text, { ...runStyle, font: style.font })
  const twoCol = (left: string, right: string, leftStyle: RunStyle, before = 0) =>
    paragraph(`${run(left, leftStyle)}${right ? `${TAB_RUN}${run(right)}` : ""}`, {
      before,
      tabs: [{ align: "right", pos: rightTab }],
    })
  const labeled = (item: LabeledRow) =>
    paragraph(`${run(`${item.label}:`)}${TAB_RUN}${run(item.value)}`, {
      tabs: [{ align: "left", pos: LABEL_COLUMN }],
      indent: { left: LABEL_COLUMN, hanging: LABEL_COLUMN },
    })
  const gap = style.bodySize * 10 // one blank body line, in twips

  const body = [
    paragraph(run(document.name.toUpperCase(), { bold: true, size: style.nameSize }), { center: true }),
    paragraph(run(document.contact), { center: true }),
  ]

  for (const section of document.sections) {
    body.push(paragraph(run(section.title.toUpperCase(), { bold: true, underline: true }), { before: gap }))
    if (section.kind === "lines") body.push(...section.lines.map((line) => paragraph(run(line))))
    if (section.kind === "rows") body.push(...section.rows.map(labeled))
    if (section.kind === "education") {
      section.entries.forEach((entry, index) => {
        body.push(
          twoCol(entry.institution, entry.location, { bold: true }, index > 0 ? gap : 0),
          twoCol(entry.degreeLine, entry.date, { italic: true }),
          ...entry.rows.map(labeled)
        )
      })
    }
    if (section.kind === "experience") {
      section.entries.forEach((entry, index) => {
        body.push(
          twoCol(entry.company, entry.location, { bold: true }, index > 0 ? gap : 0),
          twoCol(entry.position, entry.dates, { italic: true }),
          ...entry.bullets.map((bullet) =>
            paragraph(`${run("•")}${TAB_RUN}${run(bullet)}`, {
              tabs: [{ align: "left", pos: BULLET_INDENT }],
              indent: { left: BULLET_INDENT, hanging: BULLET_HANGING },
            })
          )
        )
      })
    }
  }

  return body.join("")
}
