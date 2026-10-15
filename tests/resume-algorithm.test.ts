import { describe, expect, it } from "vitest"
import {
  buildAtsScanPrompt,
  buildRecruiterAuditPrompt,
  buildRewriteDirectives,
  parseAtsScan,
  parseRecruiterAudit,
} from "@/lib/resume-algorithm"

const audit = {
  matchScore: 72,
  verdict: "Strong research background, no tax exposure.",
  missingKeywords: ["Transfer Pricing", "OECD Guidelines"],
  redFlags: [
    { flag: "No tax coursework", why: "Every shortlisted candidate has it", fix: "Take Federal Income Tax next term" },
  ],
}

describe("parseRecruiterAudit", () => {
  it("keeps a well-formed audit", () => {
    const parsed = parseRecruiterAudit(audit)
    expect(parsed?.matchScore).toBe(72)
    expect(parsed?.missingKeywords).toEqual(["Transfer Pricing", "OECD Guidelines"])
    expect(parsed?.redFlags[0].fix).toContain("Federal Income Tax")
  })

  it("clamps a score outside 0-100 and rounds it", () => {
    expect(parseRecruiterAudit({ ...audit, matchScore: 140 })?.matchScore).toBe(100)
    expect(parseRecruiterAudit({ ...audit, matchScore: -20 })?.matchScore).toBe(0)
    expect(parseRecruiterAudit({ ...audit, matchScore: 71.6 })?.matchScore).toBe(72)
    expect(parseRecruiterAudit({ ...audit, matchScore: "not a number" })?.matchScore).toBe(0)
  })

  it("caps the lists the prompt asked for", () => {
    const parsed = parseRecruiterAudit({
      ...audit,
      missingKeywords: ["a", "b", "c", "d", "e", "f", "g"],
      redFlags: [1, 2, 3, 4, 5].map((n) => ({ flag: `flag ${n}`, why: "w", fix: "f" })),
    })
    expect(parsed?.missingKeywords).toHaveLength(5)
    expect(parsed?.redFlags).toHaveLength(3)
  })

  it("drops duplicate and empty keywords", () => {
    const parsed = parseRecruiterAudit({ ...audit, missingKeywords: ["Westlaw", "westlaw", "  ", "Lexis"] })
    expect(parsed?.missingKeywords).toEqual(["Westlaw", "Lexis"])
  })

  it("drops a red flag with no flag text", () => {
    const parsed = parseRecruiterAudit({ ...audit, redFlags: [{ why: "orphaned", fix: "x" }] })
    expect(parsed?.redFlags).toEqual([])
  })

  it("returns null for junk, so the caller can try the next provider", () => {
    expect(parseRecruiterAudit(null)).toBeNull()
    expect(parseRecruiterAudit("a string")).toBeNull()
    expect(parseRecruiterAudit({ matchScore: 50 })).toBeNull()
  })
})

describe("parseAtsScan", () => {
  const scan = {
    skippedSections: [
      { section: "EXPERIENCE — Bet Tzedek", why: "Generic phrasing", rewrite: "Drafted wage-and-hour memoranda" },
    ],
    stopTheScroll: ["Federal externship now leads"],
  }

  it("keeps a well-formed scan", () => {
    expect(parseAtsScan(scan)?.skippedSections[0].section).toContain("Bet Tzedek")
  })

  it("caps sections at three", () => {
    const parsed = parseAtsScan({
      ...scan,
      skippedSections: [1, 2, 3, 4, 5].map((n) => ({ section: `s${n}`, why: "w", rewrite: "r" })),
    })
    expect(parsed?.skippedSections).toHaveLength(3)
  })

  it("drops a section with a name but nothing to say", () => {
    expect(parseAtsScan({ skippedSections: [{ section: "EDUCATION" }], stopTheScroll: [] })).toBeNull()
  })

  it("returns null when empty", () => {
    expect(parseAtsScan({ skippedSections: [], stopTheScroll: [] })).toBeNull()
  })
})

describe("prompts carry the anti-fabrication rules", () => {
  it("the audit prompt forbids inventing facts and numbers", () => {
    const prompt = buildRecruiterAuditPrompt({ jobDescription: "Tax associate", profileText: "Law student" })
    expect(prompt).toContain("Never invent a number")
    expect(prompt).toContain("Never add an employer, date, degree, course, certification, or practice area")
  })

  it("the ATS prompt keeps rewrites to what is already there", () => {
    const prompt = buildAtsScanPrompt({ jobDescription: "Clerkship", resumeText: "EXPERIENCE" })
    expect(prompt).toContain("Never invent a number")
    expect(prompt).toContain("re-words and re-orders what is already there")
  })

  it("the XYZ directive bans a number that is not in the candidate data", () => {
    const directives = buildRewriteDirectives(audit)
    expect(directives).toContain("accomplished X, as measured by Y, by doing Z")
    expect(directives).toContain("Use a number ONLY if that number is already in the candidate data")
    expect(directives).toContain("is a fabrication and is forbidden")
  })

  it("passes the audit's findings into the rewrite", () => {
    const directives = buildRewriteDirectives(audit)
    expect(directives).toContain("72/100")
    expect(directives).toContain("Transfer Pricing")
    expect(directives).toContain("No tax coursework")
  })

  it("tells the rewrite to leave a missing keyword out rather than claim it", () => {
    expect(buildRewriteDirectives(audit)).toContain("If the candidate has not done it, leave it out")
  })

  it("adds nothing when stage 1 was unavailable", () => {
    expect(buildRewriteDirectives(null)).toBe("")
  })
})
