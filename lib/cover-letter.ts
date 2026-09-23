import type { ProfileData } from "@/lib/resume-generator"
import { includesTerm } from "@/lib/resume-generator"
import { escapeXml } from "@/lib/resume-document"

// Cover letters share the resume's letterhead (name + contact line) so a
// student's application reads as one set of documents, then follow standard
// business-letter order: date, recipient, subject, salutation, body, closing.

export type CoverLetterContent = {
  greeting: string
  subject: string
  paragraphs: string[]
  closing: string
}

export type CoverLetterJob = {
  jobTitle?: string
  organization?: string
  recipient?: string
  location?: string
}

export type CoverLetterDocument = {
  name: string
  contact: string
  date: string
  recipientLines: string[]
  subject: string
  greeting: string
  paragraphs: string[]
  closing: string
  signature: string
}

function clean(values: Array<string | undefined | null>) {
  return values.map((value) => (value || "").trim()).filter(Boolean)
}

export function formatLetterDate(date = new Date()) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function buildCoverLetterDocument({
  profile,
  content,
  job,
  date,
}: {
  profile: ProfileData
  content: CoverLetterContent
  job: CoverLetterJob
  date?: string
}): CoverLetterDocument {
  const info = profile.personalInfo
  const recipient = (job.recipient || "").trim() || "Hiring Committee"
  const organization = (job.organization || "").trim()

  return {
    name: clean([info.firstName, info.lastName]).join(" "),
    contact: clean([info.location, info.phone, info.email, info.linkedin]).join(" | "),
    date: date || formatLetterDate(),
    recipientLines: clean([recipient, organization, job.location]),
    subject: (content.subject || "").trim(),
    greeting: (content.greeting || `Dear ${recipient}:`).trim(),
    paragraphs: content.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
    closing: (content.closing || "Sincerely,").trim(),
    signature: clean([info.firstName, info.lastName]).join(" "),
  }
}

export function coverLetterToText(document: CoverLetterDocument) {
  return [
    document.name.toUpperCase(),
    document.contact,
    "",
    document.date,
    "",
    ...document.recipientLines,
    ...(document.subject ? ["", document.subject] : []),
    "",
    document.greeting,
    "",
    ...document.paragraphs.flatMap((paragraph, index) => (index ? ["", paragraph] : [paragraph])),
    "",
    document.closing,
    "",
    document.signature,
  ]
    .join("\n")
    .trim()
}

// A keyword can be in the profile yet never make it into the 300-word letter.
// Split the job's requirements by whether the letter body actually names them,
// so the student can see what the letter left on the table.
export function keywordCoverage(document: CoverLetterDocument, keywords: string[]) {
  const body = document.paragraphs.join(" ")
  const mentioned: string[] = []
  const unmentioned: string[] = []
  for (const keyword of keywords) {
    ;(includesTerm(body, keyword) ? mentioned : unmentioned).push(keyword)
  }
  return { mentioned, unmentioned }
}

export function countWords(document: CoverLetterDocument) {
  return document.paragraphs.join(" ").split(/\s+/).filter(Boolean).length
}

type DocxStyle = { font: string; bodySize: number; nameSize: number; margin: number }

function run(text: string, style: DocxStyle, options: { bold?: boolean; size?: number } = {}) {
  const props = [
    `<w:rFonts w:ascii="${style.font}" w:hAnsi="${style.font}" w:cs="${style.font}"/>`,
    options.bold ? "<w:b/>" : "",
    `<w:sz w:val="${options.size || style.bodySize}"/><w:szCs w:val="${options.size || style.bodySize}"/>`,
  ].join("")
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function paragraph(runs: string, options: { center?: boolean; after?: number } = {}) {
  const props = [
    `<w:spacing w:before="0" w:after="${options.after ?? 0}"/>`,
    options.center ? '<w:jc w:val="center"/>' : "",
  ].join("")
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`
}

// WordprocessingML <w:body> content for the letter (no sectPr).
export function coverLetterToDocxBody(document: CoverLetterDocument, style: DocxStyle) {
  const gap = style.bodySize * 10
  const line = (text: string, after = 0) => paragraph(run(text, style), { after })

  return [
    paragraph(run(document.name.toUpperCase(), style, { bold: true, size: style.nameSize }), { center: true }),
    paragraph(run(document.contact, style), { center: true, after: gap }),
    line(document.date, gap),
    ...document.recipientLines.map((text) => line(text)),
    ...(document.subject ? [paragraph(run(document.subject, style, { bold: true }), { after: gap })] : [paragraph("", { after: gap })]),
    line(document.greeting, gap),
    ...document.paragraphs.map((text) => line(text, gap)),
    line(document.closing, gap * 2),
    line(document.signature),
  ].join("")
}
