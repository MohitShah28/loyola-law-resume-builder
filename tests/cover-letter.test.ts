import { describe, expect, it } from "vitest"
import { loyolaSampleProfile as sampleProfile } from "./fixtures/loyola-sample-profile"
import {
  buildCoverLetterDocument,
  coverLetterToDocxBody,
  coverLetterToText,
  countWords,
  formatLetterDate,
  keywordCoverage,
} from "@/lib/cover-letter"

const content = {
  subject: "Re: Application for Judicial Law Clerk",
  greeting: "Dear Judge Alvarez:",
  paragraphs: [
    "I am applying for the judicial clerkship in your chambers.",
    "As a certified law student I drafted research memoranda and cite-checked draft orders.",
    "I would welcome the chance to interview.",
  ],
  closing: "Sincerely,",
}

const job = {
  jobTitle: "Judicial Law Clerk",
  organization: "United States District Court, Central District of California",
  recipient: "Judge Alvarez",
}

const build = (overrides = {}) =>
  buildCoverLetterDocument({ profile: sampleProfile, content, job, date: "September 17, 2026", ...overrides })

describe("buildCoverLetterDocument", () => {
  it("uses the resume letterhead so both documents match", () => {
    const document = build()
    expect(document.name).toBe("Timothy Lyon")
    expect(document.contact).toBe("Los Angeles, CA | (310) 555-1234 | timothy.lyon@lls.edu")
    expect(document.signature).toBe("Timothy Lyon")
  })

  it("addresses the recipient and organization", () => {
    expect(build().recipientLines).toEqual([
      "Judge Alvarez",
      "United States District Court, Central District of California",
    ])
  })

  it("falls back to a hiring committee salutation", () => {
    const document = buildCoverLetterDocument({
      profile: sampleProfile,
      content: { ...content, greeting: "" },
      job: {},
    })
    expect(document.greeting).toBe("Dear Hiring Committee:")
    expect(document.recipientLines).toEqual(["Hiring Committee"])
  })
})

describe("coverLetterToText", () => {
  const text = coverLetterToText(build())

  it("lays the letter out in business-letter order", () => {
    const order = ["TIMOTHY LYON", "September 17, 2026", "Judge Alvarez", "Re: Application", "Dear Judge Alvarez:", "Sincerely,"]
    const positions = order.map((part) => text.indexOf(part))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it("separates paragraphs with a blank line and ends with the signature", () => {
    expect(text).toContain("chambers.\n\nAs a certified law student")
    expect(text.trim().endsWith("Timothy Lyon")).toBe(true)
  })

  it("counts only body words", () => {
    expect(countWords(build())).toBe(
      content.paragraphs.join(" ").split(/\s+/).length
    )
  })
})

describe("coverLetterToDocxBody", () => {
  const xml = coverLetterToDocxBody(build(), { font: "Calibri", bodySize: 22, nameSize: 28, margin: 1440 })

  it("centers the letterhead and keeps the body left aligned", () => {
    expect(xml).toContain('<w:jc w:val="center"/>')
    expect(xml.split("Dear Judge Alvarez:")[1]).not.toContain('<w:jc w:val="center"/>')
  })

  it("writes every line with the template font", () => {
    const textRuns = xml.match(/<w:t xml:space="preserve">/g)?.length ?? 0
    const fontedRuns = xml.match(/<w:rFonts /g)?.length ?? 0
    expect(fontedRuns).toBe(textRuns)
  })

  it("escapes XML special characters", () => {
    const xmlWithAmp = coverLetterToDocxBody(
      build({ content: { ...content, paragraphs: ["Blake, Cassels & Graydon LLP"] } }),
      { font: "Calibri", bodySize: 22, nameSize: 28, margin: 1440 }
    )
    expect(xmlWithAmp).toContain("Blake, Cassels &amp; Graydon LLP")
  })
})

describe("formatLetterDate", () => {
  it("writes the date the way a letter does", () => {
    expect(formatLetterDate(new Date("2026-09-17T12:00:00Z"))).toMatch(/^September 1[67], 2026$/)
  })
})

describe("keywordCoverage", () => {
  it("splits job requirements by whether the letter body names them", () => {
    const { mentioned, unmentioned } = keywordCoverage(build(), [
      "research memoranda",
      "cite-check",
      "deposition",
    ])
    expect(mentioned).toEqual(["research memoranda", "cite-check"])
    expect(unmentioned).toEqual(["deposition"])
  })

  it("ignores case and the letterhead, date, and salutation", () => {
    const { mentioned, unmentioned } = keywordCoverage(build(), ["CERTIFIED LAW STUDENT", "Judge Alvarez"])
    expect(mentioned).toEqual(["CERTIFIED LAW STUDENT"])
    expect(unmentioned).toEqual(["Judge Alvarez"])
  })

  it("returns empty lists when no keywords were extracted", () => {
    expect(keywordCoverage(build(), [])).toEqual({ mentioned: [], unmentioned: [] })
  })
})
