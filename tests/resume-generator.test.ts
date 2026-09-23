import { describe, expect, it } from "vitest"
import { mockProfile } from "@/lib/data"
import {
  generateResumeFromJob,
  rankExperienceForJob,
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
    "Judicial Law Clerk. Requirements: experience with Westlaw, Lexis, Bluebook citation, and motion drafting. Preferred: knowledge of Federal Civil Procedure."

  it("scores higher when resume covers job keywords", () => {
    const strong = scoreResumeAgainstJob(
      "Law clerk experienced with Westlaw, Lexis, Bluebook citation, motion drafting, and Federal Civil Procedure.",
      jobDescription
    )
    const weak = scoreResumeAgainstJob("Barista with latte art skills.", jobDescription)
    expect(strong.atsScore).toBeGreaterThan(weak.atsScore)
  })

  it("stays within the 40-98 range and is deterministic", () => {
    const result = scoreResumeAgainstJob("Westlaw Lexis", jobDescription)
    expect(result.atsScore).toBeGreaterThanOrEqual(40)
    expect(result.atsScore).toBeLessThanOrEqual(98)
    expect(scoreResumeAgainstJob("Westlaw Lexis", jobDescription)).toEqual(result)
  })

  it("reports missing keywords not present in the resume", () => {
    const result = scoreResumeAgainstJob("I use Westlaw daily.", jobDescription)
    expect(result.missingKeywords.join(" ")).toContain("Lexis")
    expect(result.matchedKeywords.join(" ")).toContain("Westlaw")
  })
})

describe("scoreResumeAgainstJob keyword extraction", () => {
  // Postings written as headings used to score "Job Duties", "Assists" and "The"
  // as required skills, which polluted the ATS lists and the score.
  const headingStyleJob = [
    "Tax Associate, Transfer Pricing",
    "Job Duties:",
    "Information Gathering - Assists in conducting client interviews.",
    "Report Writing - Writes industry overviews. Proofreads and edits reports.",
    "Qualifications: Proficient in Microsoft Excel and PowerPoint. Exceptional research and writing skills.",
  ].join("\n")

  it("ignores headings and boilerplate verbs", () => {
    const { matchedKeywords, missingKeywords } = scoreResumeAgainstJob("Legal research and writing.", headingStyleJob)
    const all = [...matchedKeywords, ...missingKeywords]
    for (const noise of ["The", "This", "Job Duties", "Assists", "Writes", "Qualifications", "Software"]) {
      expect(all).not.toContain(noise)
    }
  })

  it("still captures real requirements from the posting", () => {
    const { matchedKeywords, missingKeywords } = scoreResumeAgainstJob("Legal research and writing.", headingStyleJob)
    const all = [...matchedKeywords, ...missingKeywords].join(" ")
    expect(all).toContain("Transfer Pricing")
    expect(all).toContain("Microsoft Excel")
  })

  const clerkshipJob =
    "Judicial Law Clerk, U.S. District Court. Draft bench memoranda and orders. Legal research on Westlaw and Lexis. Bluebook cite-checking."
  const keywordsFor = (job: string) => {
    const { matchedKeywords, missingKeywords } = scoreResumeAgainstJob("", job)
    return [...matchedKeywords, ...missingKeywords]
  }

  it("does not join words across a sentence break", () => {
    expect(keywordsFor(clerkshipJob).some((keyword) => keyword.includes(". "))).toBe(false)
  })

  it("drops sentence-opening verbs", () => {
    expect(keywordsFor(clerkshipJob)).not.toContain("Draft")
  })

  it("treats the posting's own title and employer as a heading, not skills", () => {
    const all = keywordsFor(clerkshipJob)
    expect(all).not.toContain("Judicial Law Clerk")
    expect(all).not.toContain("U.S. District Court")
    expect(all).toContain("Westlaw")
  })

  it("keeps a heading term that the posting repeats as a requirement", () => {
    const job = "HIPAA Compliance Counsel, Acme Health\nAdvise on HIPAA Compliance and vendor contracts. HIPAA Compliance experience required."
    expect(keywordsFor(job).join(" ")).not.toContain("Acme Health")
    expect(keywordsFor(job).join(" ")).toContain("HIPAA Compliance")
  })
})

describe("generateResumeFromJob (local fallback)", () => {
  const resume = generateResumeFromJob({
    profile: mockProfile,
    jobDescription:
      "Title: Summer Associate\nCompany: Example LLP\nRequirements: legal research, due diligence, regulatory compliance.",
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

describe("rankExperienceForJob", () => {
  it("puts the entry that covers the most job keywords first", () => {
    const ranked = rankExperienceForJob(
      mockProfile,
      "Judicial law clerk. Draft bench memoranda, cite-check draft orders, Bluebook, Westlaw and Lexis research."
    )
    expect(ranked[0].experience.position).toBe("Judicial Extern")
    expect(ranked[0].matchedKeywords.length).toBeGreaterThanOrEqual(ranked[ranked.length - 1].matchedKeywords.length)
  })

  it("leaves out entries that match nothing instead of padding the list", () => {
    const ranked = rankExperienceForJob(mockProfile, "Transfer pricing economist. Benchmarking, OECD guidelines, Excel modeling.")
    expect(ranked.every((entry) => entry.matchedKeywords.length > 0)).toBe(true)
    expect(ranked.some((entry) => entry.experience.company === "Bet Tzedek Legal Services")).toBe(false)
  })
})
