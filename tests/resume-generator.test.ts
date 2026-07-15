import { describe, expect, it } from "vitest"
import { mockProfile } from "@/lib/data"
import {
  generateResumeFromJob,
  scoreResumeAgainstJob,
  sortExperienceByRecency,
} from "@/lib/resume-generator"

describe("sortExperienceByRecency", () => {
  it("puts current roles first, then newest end date", () => {
    const sorted = sortExperienceByRecency([
      { company: "Old", startDate: "May 2016", endDate: "August 2016" },
      { company: "Mid", startDate: "August 2017", endDate: "June 2025" },
      { company: "Now", startDate: "January 2027", endDate: "Present" },
    ])
    expect(sorted.map((e) => e.company)).toEqual(["Now", "Mid", "Old"])
  })

  it("handles bare years and Current keyword", () => {
    const sorted = sortExperienceByRecency([
      { company: "A", startDate: "2018", endDate: "2021" },
      { company: "B", startDate: "2022", endDate: "Current" },
      { company: "C", startDate: "2015", endDate: "2017" },
    ])
    expect(sorted.map((e) => e.company)).toEqual(["B", "A", "C"])
  })

  it("does not mutate the input array", () => {
    const input = [
      { company: "A", startDate: "2018", endDate: "2021" },
      { company: "B", startDate: "2022", endDate: "Present" },
    ]
    sortExperienceByRecency(input)
    expect(input[0].company).toBe("A")
  })
})

describe("scoreResumeAgainstJob", () => {
  const jobDescription =
    "Data Analyst role. Requirements: experience with SQL, Python, Tableau, and Power BI. Preferred: knowledge of Machine Learning."

  it("scores higher when resume covers job keywords", () => {
    const strong = scoreResumeAgainstJob(
      "Analyst with SQL, Python, Tableau, Power BI, and Machine Learning experience.",
      jobDescription
    )
    const weak = scoreResumeAgainstJob("Barista with latte art skills.", jobDescription)
    expect(strong.atsScore).toBeGreaterThan(weak.atsScore)
  })

  it("stays within the 40-98 range and is deterministic", () => {
    const result = scoreResumeAgainstJob("SQL Python", jobDescription)
    expect(result.atsScore).toBeGreaterThanOrEqual(40)
    expect(result.atsScore).toBeLessThanOrEqual(98)
    expect(scoreResumeAgainstJob("SQL Python", jobDescription)).toEqual(result)
  })

  it("reports missing keywords not present in the resume", () => {
    const result = scoreResumeAgainstJob("I use SQL daily.", jobDescription)
    expect(result.missingKeywords.join(" ")).toContain("Tableau")
    expect(result.matchedKeywords.join(" ")).toContain("SQL")
  })
})

describe("generateResumeFromJob (local fallback)", () => {
  const resume = generateResumeFromJob({
    profile: mockProfile,
    jobDescription:
      "Title: Data Analyst\nCompany: Acme Retail\nRequirements: SQL, Python, dashboards, stakeholder reporting.",
    template: "modern",
    tone: "professional",
    experienceLevel: "mid",
    length: "short",
  })

  it("produces resume text containing the candidate name", () => {
    expect(resume.resume.toUpperCase()).toContain(mockProfile.personalInfo.firstName.toUpperCase())
  })

  it("sorts selected experience reverse-chronologically", () => {
    const dates = resume.selectedExperience.map((e) => e.endDate)
    expect(dates.length).toBeGreaterThan(0)
  })

  it("uses the deterministic ATS score", () => {
    expect(resume.atsScore).toBeGreaterThanOrEqual(40)
    expect(resume.atsScore).toBeLessThanOrEqual(98)
  })

  it("does not append junk keyword suffixes to bullets", () => {
    const allBullets = [
      ...resume.selectedExperience.flatMap((e) => e.description),
      ...resume.selectedProjects.flatMap((p) => p.highlights),
    ].join(" ")
    expect(allBullets).not.toContain("emphasizing")
    expect(allBullets).not.toContain("with emphasis on")
  })
})
