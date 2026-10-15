// Gemini models, best first; each request uses the first one the API key can
// run. Probed against a free key on 2026-10-15:
//   gemini-3.1-pro-preview / gemini-4-argon / gemini-pro-latest -> 429, no free
//     quota (kept first so paid keys get the best model available)
//   gemini-3.8-flash, 3.6-flash, 3.5-flash -> work
//   gemini-3.7-flash -> works, but often returns 503 "high demand", so the
//     route retries it once before moving on
//   gemini-2.5-flash -> 404, "no longer available to new users" (removed)
// Override with GEMINI_MODEL, which may be a comma-separated list; a free key
// should list the flash models only, to skip a guaranteed 429 on every call.
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
]

export function getGeminiModels() {
  const configured = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  return configured.length ? configured : DEFAULT_GEMINI_MODELS
}
