// Gemini models, best first; each request uses the first one the API key can
// run. Pro needs a paid plan (free-tier keys get an instant 429 "quota" error
// and fall through), then Flash models newest first. Several Flash versions
// are listed because Google returns 503 "high demand" on busy models.
// Override with GEMINI_MODEL, which may be a comma-separated list.
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
]

export function getGeminiModels() {
  const configured = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  return configured.length ? configured : DEFAULT_GEMINI_MODELS
}
