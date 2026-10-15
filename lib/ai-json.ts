import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { getGeminiModels } from "@/lib/gemini-models"
import { getOpenRouterApiKey, requestOpenRouterText } from "@/lib/openrouter"
import { parseJsonWithRepair } from "@/lib/json-repair"

// One JSON request against the provider chain, for prompts that are not the
// main resume schema (the recruiter audit and the ATS scan). Same order as
// /api/generate-resume: Claude, Gemini, OpenRouter, Groq. Returns null when
// every provider is unavailable or fails, so callers can carry on without the
// extra stage rather than failing the whole generation.

function configuredKey(value: string | undefined) {
  const key = value?.trim()
  return key && !/^your_.*_here$/i.test(key) ? key : ""
}

async function tryClaude(system: string, prompt: string, maxTokens: number, _attemptMs?: number) {
  const apiKey = configuredKey(process.env.ANTHROPIC_API_KEY)
  if (!apiKey || process.env.ANTHROPIC_API_ENABLED === "false") return null

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5"
  const response = await new Anthropic({ apiKey }).messages.create({
    model,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: prompt }],
  })
  if (response.stop_reason === "refusal") throw new Error("Claude declined the request.")
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
  return text ? { text, model } : null
}

async function tryGemini(system: string, prompt: string, maxTokens: number, attemptMs = 25_000) {
  const apiKey = configuredKey(process.env.GEMINI_API_KEY)
  if (!apiKey || process.env.GEMINI_API_ENABLED === "false") return null

  const failures: string[] = []
  for (const model of getGeminiModels()) {
    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)
    url.searchParams.set("key", apiKey)
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(attemptMs),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
        error?: { message?: string }
      }
      if (!response.ok) throw new Error(data.error?.message || `status ${response.status}`)
      const text = (data.candidates?.[0]?.content?.parts || [])
        .filter((part) => !part.thought)
        .map((part) => part.text || "")
        .join("")
        .trim()
      if (text) return { text, model }
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message.slice(0, 80) : "failed"}`)
    }
  }
  if (failures.length) throw new Error(`Gemini failed (${failures.join("; ")})`)
  return null
}

async function tryOpenRouter(system: string, prompt: string, maxTokens: number, _attemptMs?: number) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) return null
  const result = await requestOpenRouterText({ apiKey, system, prompt, maxTokens, temperature: 0.3 })
  return { text: result.text, model: result.model }
}

async function tryGroq(system: string, prompt: string, maxTokens: number, _attemptMs?: number) {
  const apiKey = configuredKey(process.env.GROQ_API_KEY)
  if (!apiKey || process.env.GROQ_API_ENABLED === "false") return null

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile"
  const completion = await new Groq({ apiKey }).chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: Math.min(maxTokens, 3000),
    response_format: { type: "json_object" },
  })
  const text = completion.choices[0]?.message?.content?.trim()
  return text ? { text, model } : null
}

export type JsonRequestResult<T> = { data: T; model: string }

export async function requestJsonFromProviders<T>({
  system,
  prompt,
  maxTokens = 4000,
  timeoutMs,
  parse,
}: {
  system: string
  prompt: string
  maxTokens?: number
  // Caps the whole chain. Used by stage 1 so a slow audit cannot eat the time
  // the rewrite needs before the serverless function is killed.
  timeoutMs?: number
  // Returns null when the response parsed but holds nothing usable, which is
  // treated as a provider failure so the next provider gets a turn.
  parse: (value: unknown) => T | null
}): Promise<JsonRequestResult<T> | null> {
  // Each provider gets its own slice of whatever time is left, so one stalled
  // provider cannot eat the budget and starve the rest of the chain — which is
  // exactly what happened when Gemini returned "high demand" for 50s and
  // OpenRouter never got a turn.
  const deadline = timeoutMs ? Date.now() + timeoutMs : null
  const providers = [tryClaude, tryGemini, tryOpenRouter, tryGroq]
  for (const [index, provider] of providers.entries()) {
    const remaining = deadline ? deadline - Date.now() : Infinity
    if (remaining < 5_000) break
    const attemptMs = deadline
      ? Math.max(10_000, Math.floor(remaining / Math.max(1, providers.length - index)))
      : 25_000
    try {
      const result = await provider(system, prompt, maxTokens, attemptMs)
      if (!result) continue
      const parsed = parse(parseJsonWithRepair<unknown>(result.text))
      if (parsed) return { data: parsed, model: result.model }
    } catch {
      // Try the next provider; this stage is an enhancement, not the resume.
    }
  }
  return null
}
