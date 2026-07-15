import { describe, expect, it } from "vitest"
import { parseJsonWithRepair, repairJson } from "@/lib/json-repair"

describe("parseJsonWithRepair", () => {
  it("parses clean JSON unchanged", () => {
    const parsed = parseJsonWithRepair<{ a: number }>('{"a": 1}')
    expect(parsed).toEqual({ a: 1 })
  })

  it("parses JSON wrapped in markdown fences and prose", () => {
    const parsed = parseJsonWithRepair<{ ok: boolean }>('Here you go:\n```json\n{"ok": true}\n```\nDone.')
    expect(parsed).toEqual({ ok: true })
  })

  it("salvages JSON truncated mid-string (Gemini max-tokens cutoff)", () => {
    const truncated = '{"summary": "Strong analyst", "skills": ["SQL", "Python"], "bullets": ["Documented data preparation steps and'
    const parsed = parseJsonWithRepair<{ summary: string; skills: string[] }>(truncated)
    expect(parsed.summary).toBe("Strong analyst")
    expect(parsed.skills).toEqual(["SQL", "Python"])
  })

  it("salvages JSON with a duplicated garbage tail and missing closing brace", () => {
    const corrupted =
      '{"improvedSummary": "Results-driven analyst focused on business performance."\nfocused on business performance."\n'
    const parsed = parseJsonWithRepair<{ improvedSummary: string }>(corrupted)
    expect(parsed.improvedSummary).toContain("Results-driven analyst")
  })

  it("returns empty object for hopeless input", () => {
    expect(parseJsonWithRepair("no json here at all")).toEqual({})
    expect(parseJsonWithRepair("")).toEqual({})
  })
})

describe("repairJson", () => {
  it("closes unterminated arrays and objects", () => {
    const repaired = repairJson('{"items": ["a", "b"')
    expect(() => JSON.parse(repaired)).not.toThrow()
    expect(JSON.parse(repaired).items).toContain("a")
  })

  it("drops a trailing partial key", () => {
    const repaired = repairJson('{"done": true, "partialKe')
    expect(JSON.parse(repaired)).toEqual({ done: true })
  })
})
