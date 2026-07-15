// Salvages JSON from LLM responses that arrive truncated mid-stream or with
// corrupted/duplicated tails, so a mostly-complete response is used instead of
// being silently replaced by the local fallback generator.

export function extractJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed

  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return "{}"
}

export function balanceJson(text: string) {
  let inString = false
  let escape = false
  const stack: string[] = []

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (escape) {
      escape = false
      continue
    }
    if (char === "\\") {
      escape = inString
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === "{" || char === "[") stack.push(char)
    else if (char === "}" || char === "]") {
      stack.pop()
      if (stack.length === 0) return text.slice(0, index + 1)
    }
  }

  let repaired = inString ? `${text}"` : text
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*$/, "").replace(/[,:]\s*$/, "")
  return repaired + stack.reverse().map((char) => (char === "{" ? "}" : "]")).join("")
}

export function repairJson(value: string) {
  const start = value.indexOf("{")
  if (start < 0) return "{}"
  const text = value.slice(start)
  let cut = text.length

  for (let attempt = 0; attempt < 40 && cut > 1; attempt += 1) {
    const candidate = balanceJson(text.slice(0, cut))
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      cut = Math.max(
        text.lastIndexOf(",", cut - 2),
        text.lastIndexOf("}", cut - 2),
        text.lastIndexOf("]", cut - 2),
        text.lastIndexOf('"', cut - 2)
      )
    }
  }

  return "{}"
}

export function parseJsonWithRepair<T>(content: string): Partial<T> {
  const extracted = extractJsonObject(content)

  // extractJsonObject falls back to "{}" when it can't find balanced braces —
  // don't treat that as a successful parse of non-empty content.
  if (extracted !== "{}" || content.trim() === "{}") {
    try {
      return JSON.parse(extracted) as Partial<T>
    } catch {
      // fall through to repair
    }
  }

  try {
    return JSON.parse(repairJson(content)) as Partial<T>
  } catch {
    return {}
  }
}
