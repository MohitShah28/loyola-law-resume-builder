import { describe, expect, it } from "vitest"
import { loyolaSampleProfile as sampleProfile } from "./fixtures/loyola-sample-profile"
import {
  barAdmissionLines,
  buildResumeDocument,
  documentToDocxBody,
  documentToText,
  formatWorkAuthorization,
  workAuthorizationLine,
} from "@/lib/resume-document"
import { generateResumeFromJob } from "@/lib/resume-generator"

const sample = {
  profile: sampleProfile,
  selectedExperience: sampleProfile.experience,
  selectedCertifications: [],
  selectedAchievements: [],
  tailoredSkills: [],
}

const emptyAdditionalInfo = { languages: [], volunteer: [], memberships: [], interests: [] }

// Line-for-line transcription of the official Loyola Law sample resume
// (Timothy Lyon, LL.M.), with tabs where the sample right-aligns text.
const SAMPLE_RESUME_TEXT = [
  "TIMOTHY LYON",
  "Los Angeles, CA | (310) 555-1234 | timothy.lyon@lls.edu",
  "",
  "BAR ADMISSION",
  "British Columbia Bar (2017)",
  "Registered for the July 2022 California Bar exam",
  "",
  "WORK AUTHORIZATION",
  "Anticipated OPT start date [insert date]",
  "",
  "EDUCATION",
  "LMU Loyola Law School\tLos Angeles, CA",
  "LL.M. Candidate with focus on Entertainment Law\tMay 2022",
  "Activities:\tIntellectual Property Law Society, Secretary (Fall 2021 – Present); Business Law Society, Member (Fall 2021 – Present)",
  "",
  "University of Alberta\tEdmonton, AB",
  "Bachelor of Laws, With Distinction\tMay 2017",
  "",
  "University of British Columbia\tVancouver, B.C.",
  "Bachelor of Arts, International Relations\tMay 2016",
  "",
  "EXPERIENCE",
  "Blake, Cassels & Graydon LLP\tVancouver, B.C.",
  "Associate\tAugust 2017 – June 2021",
  "• Provided strategic advice to clients regarding risk management and compliance",
  "• Represented clients in the defense and resolution of regulatory charges",
  "• Assisted with environmental and Indigenous due diligence for successful corporate transactions",
  "",
  "Diamond & Diamond Lawyers LLP\tVancouver, B.C.",
  "Law Clerk\tSummer 2016",
  "• Performed complex legal research",
  "• Conducted fact investigations and interviewed clients",
  "• Drafted research memoranda and discovery",
  "",
  "ADDITIONAL INFORMATION",
  "Languages:\tFrench (fluent); English (fluent); Spanish (basic)",
  "Volunteer:\tLegal Name & Gender Marker Change Pro Bono Project (Spring 2022)",
  "Memberships:\tInternational Association of Young Lawyers (Fall 2021 – Present); International Bar Association (Fall 2021 – Present)",
  "Interests:\tIndoor cycling, golf, and visiting National Parks",
].join("\n")

describe("buildResumeDocument (Loyola sample layout)", () => {
  const document = buildResumeDocument(sample)

  it("uses the sample's sections in the sample's order", () => {
    expect(document.sections.map((section) => section.title)).toEqual([
      "Bar Admission",
      "Work Authorization",
      "Education",
      "Experience",
      "Additional Information",
    ])
  })

  it("reproduces every line of the sample resume", () => {
    expect(documentToText(document)).toBe(SAMPLE_RESUME_TEXT)
  })

  it("omits empty sections and never prints summary, skills, or projects headings", () => {
    const text = documentToText(
      buildResumeDocument({
        ...sample,
        profile: {
          ...sampleProfile,
          barAdmission: [],
          barDetails: { admissions: [], usBarExams: [] },
          workAuthorization: "",
          workAuthorizationDetails: { status: "", startDate: "", endDate: "", needsSponsorship: "" },
          additionalInfo: emptyAdditionalInfo,
        },
      })
    )
    expect(text).not.toContain("BAR ADMISSION")
    expect(text).not.toContain("WORK AUTHORIZATION")
    expect(text).not.toContain("ADDITIONAL INFORMATION")
    expect(text).not.toMatch(/SUMMARY|PROJECTS|^SKILLS$/m)
  })

  it("adds only the student's own skills, certifications, and honors to Additional Information", () => {
    const certification = { id: "c1", name: "Notary Public", issuer: "State of California", date: "2024", credentialId: "" }
    const profile = {
      ...sampleProfile,
      skills: { ...sampleProfile.skills, programming: ["Westlaw", "Lexis"] },
      certifications: [certification],
      achievements: ["Dean's List"],
    }
    const document = buildResumeDocument({
      profile,
      selectedExperience: [],
      selectedCertifications: [certification],
      selectedAchievements: ["Dean's List"],
      tailoredSkills: ["Lexis", "Python"],
    })
    const additional = document.sections.at(-1)
    expect(additional?.kind).toBe("rows")
    const rows = additional?.kind === "rows" ? additional.rows : []
    expect(rows.map((row) => row.label)).toEqual([
      "Languages",
      "Volunteer",
      "Memberships",
      "Honors",
      "Certifications",
      "Skills",
      "Interests",
    ])
    // Ordered by relevance to the job; "Python" is not the student's skill.
    expect(rows.find((row) => row.label === "Skills")?.value).toBe("Lexis; Westlaw")
    expect(rows.find((row) => row.label === "Certifications")?.value).toBe("Notary Public, State of California, 2024")
  })

  it("prints relevant coursework above activities", () => {
    const profile = {
      ...sampleProfile,
      education: sampleProfile.education.map((edu, index) =>
        index === 0 ? { ...edu, coursework: ["Federal Income Tax", "Corporate Taxation"] } : edu
      ),
    }
    const text = documentToText(buildResumeDocument({ ...sample, profile }))
    expect(text).toContain("Coursework:\tFederal Income Tax; Corporate Taxation")
    expect(text.indexOf("Coursework:")).toBeLessThan(text.indexOf("Activities:"))
  })

  it("tolerates profiles saved before education had location and activities", () => {
    const legacyEducation = sampleProfile.education.map(
      ({ location: _location, activities: _activities, coursework: _coursework, ...edu }) => edu
    )
    const document = buildResumeDocument({
      ...sample,
      profile: { ...sampleProfile, education: legacyEducation as typeof sampleProfile.education },
    })
    const education = document.sections.find((section) => section.kind === "education")
    expect(education?.kind === "education" && education.entries[0]).toMatchObject({
      institution: "LMU Loyola Law School",
      location: "",
      rows: [],
    })
  })
})

describe("documentToDocxBody", () => {
  const xml = documentToDocxBody(buildResumeDocument(sample), { font: "Calibri", bodySize: 22, nameSize: 28, margin: 1440 })
  const font = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'

  it("renders headings bold and underlined, properties in schema order", () => {
    expect(xml).toContain(`<w:rPr>${font}<w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">BAR ADMISSION</w:t>`)
  })

  it("declares tab stops before spacing so locations and dates right-align", () => {
    expect(xml).toContain('<w:pPr><w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs><w:spacing')
    expect(xml).not.toMatch(/<w:spacing[^>]*\/><w:tabs>/)
  })

  it("italicizes degree and position lines", () => {
    expect(xml).toContain(`<w:rPr>${font}<w:i/></w:rPr><w:t xml:space="preserve">Associate</w:t>`)
    expect(xml).toContain(`<w:rPr>${font}<w:i/></w:rPr><w:t xml:space="preserve">Bachelor of Laws, With Distinction</w:t>`)
  })

  it("uses a hanging indent for Activities and Additional Information rows", () => {
    expect(xml).toContain('<w:ind w:left="1440" w:hanging="1440"/>')
  })

  it("sets the template font on every text run", () => {
    const textRuns = xml.match(/<w:t xml:space="preserve">/g)?.length ?? 0
    const fontedRuns = xml.match(/<w:rFonts /g)?.length ?? 0
    expect(fontedRuns).toBe(textRuns)
  })

  it("escapes XML special characters", () => {
    expect(xml).toContain("Blake, Cassels &amp; Graydon LLP")
    expect(xml).not.toContain("Cassels & Graydon")
  })
})

describe("bar admission and work authorization (international students)", () => {
  it("formats admissions and U.S. bar exams like the sample", () => {
    expect(
      barAdmissionLines({
        barDetails: {
          admissions: [{ id: "1", jurisdiction: "British Columbia", year: "2017" }],
          usBarExams: [{ id: "1", jurisdiction: "California", examDate: "July 2022", status: "registered" }],
        },
        barAdmission: [],
      })
    ).toEqual(["British Columbia Bar (2017)", "Registered for the July 2022 California Bar exam"])
  })

  it("handles eligible and passed exams, a trailing 'Bar', and extra lines", () => {
    expect(
      barAdmissionLines({
        barDetails: {
          admissions: [{ id: "1", jurisdiction: "New York Bar", year: "" }],
          usBarExams: [
            { id: "2", jurisdiction: "New York", examDate: "", status: "eligible" },
            { id: "3", jurisdiction: "California", examDate: "February 2026", status: "passed" },
          ],
        },
        barAdmission: ["U.S. District Court, Central District of California (2026)"],
      })
    ).toEqual([
      "New York Bar",
      "Eligible to sit for the New York Bar exam",
      "Passed the February 2026 California Bar exam; admission pending",
      "U.S. District Court, Central District of California (2026)",
    ])
  })

  it("builds the work authorization line from status and dates", () => {
    expect(formatWorkAuthorization({ status: "f1-opt", startDate: "August 2027" })).toBe("Anticipated OPT start date August 2027")
    expect(formatWorkAuthorization({ status: "f1-opt", startDate: "August 2027", endDate: "August 2028" })).toBe(
      "Anticipated OPT start date August 2027; authorized through August 2028"
    )
    expect(formatWorkAuthorization({ status: "f1-cpt", startDate: "May 2027" })).toBe(
      "Eligible for Curricular Practical Training (CPT) beginning May 2027"
    )
    expect(formatWorkAuthorization({ status: "j1-academic-training", startDate: "June 2027" })).toBe(
      "Eligible for J-1 Academic Training beginning June 2027"
    )
    expect(formatWorkAuthorization({ status: "us-citizen" })).toBe("U.S. Citizen")
    expect(formatWorkAuthorization({ status: "" })).toBe("")
  })

  it("prefers a typed-in line and never prints the sponsorship answer", () => {
    const details = { status: "f1-opt", startDate: "", endDate: "", needsSponsorship: "yes" }
    expect(workAuthorizationLine({ workAuthorization: "Anticipated OPT start date [insert date]", workAuthorizationDetails: details })).toBe(
      "Anticipated OPT start date [insert date]"
    )
    expect(workAuthorizationLine({ workAuthorization: "", workAuthorizationDetails: details })).not.toMatch(/sponsor/i)
  })
})

describe("generateResumeFromJob uses the Loyola layout for every template", () => {
  const templates = ["university-law", "original-cv", "harvard", "modern", "executive", "compact"]
  const generate = (template: string) =>
    generateResumeFromJob({
      profile: sampleProfile,
      jobDescription: "Title: Associate\nRequirements: regulatory compliance, due diligence, legal research.",
      template,
      tone: "professional",
      experienceLevel: "mid",
      length: "medium",
    })

  it("produces the same Loyola-format text regardless of template", () => {
    const texts = templates.map((template) => generate(template).resume)
    expect(new Set(texts).size).toBe(1)
    expect(texts[0]).toBe(SAMPLE_RESUME_TEXT)
  })

  it("keeps the student's own bullets without generic filler", () => {
    const resume = generate("modern")
    expect(resume.selectedExperience.map((exp) => exp.description)).toEqual(
      sampleProfile.experience.map((exp) => exp.description)
    )
  })
})
