// OpenRouter is the backup provider: it runs when Claude and Gemini are
// unavailable or out of quota, before the smaller Groq model and the local
// generator. One request carries up to three models (an OpenRouter limit) and
// OpenRouter itself moves to the next when one is busy, so a busy model does
// not cost an extra request against the free tier's daily cap.
//
// The defaults are free models, because a free-tier key can only run those
// (50 requests a day on a key with no credits). A key with credits can point
// OPENROUTER_MODEL at paid models instead, as a comma-separated list.
export const DEFAULT_OPENROUTER_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "qwen/qwen3.8-27b:free",
  // Routes to whichever free model is available right now.
  "openrouter/free",
]

const MAX_MODELS_PER_REQUEST = 3

export function getOpenRouterModels() {
  const configured = (process.env.OPENROUTER_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  return (configured.length ? configured : DEFAULT_OPENROUTER_MODELS).slice(0, MAX_MODELS_PER_REQUEST)
}

export function getOpenRouterApiKey() {
  if (process.env.OPENROUTER_API_ENABLED === "false") return ""
  const key = process.env.OPENROUTER_API_KEY?.trim()
  return key && !/^your_.*_here$/i.test(key) ? key : ""
}

type OpenRouterResponse = {
  model?: string
  choices?: { message?: { content?: string | null }; finish_reason?: string }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  error?: { message?: string; code?: number }
}

export type OpenRouterResult = {
  text: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export async function requestOpenRouterText({
  apiKey,
  system,
  prompt,
  maxTokens,
  temperature = 0.35,
}: {
  apiKey: string
  system: string
  prompt: string
  maxTokens: number
  temperature?: number
}): Promise<OpenRouterResult> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional attribution headers OpenRouter shows on its dashboard.
      "X-Title": "Loyola Law Resume Builder",
    },
    body: JSON.stringify({
      models: getOpenRouterModels(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      // No response_format: several of the free models do not support JSON
      // mode, and requesting it would make OpenRouter skip them. The prompts
      // demand JSON and callers parse with json-repair.
    }),
  })

  const data = (await response.json().catch(() => ({}))) as OpenRouterResponse
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `OpenRouter request failed with status ${response.status}`)
  }

  // Reasoning models return their thinking in a separate field; only
  // `content` is the answer.
  const text = data.choices?.[0]?.message?.content?.trim() || ""
  if (!text) throw new Error("OpenRouter returned an empty response.")

  return {
    text,
    model: data.model || getOpenRouterModels()[0],
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }
}
