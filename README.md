# Resume AI

AI-powered resume tailoring app. Paste a job description, and it rewrites your master profile into a job-specific, ATS-friendly, one-page resume — with keyword matching, an ATS score, live preview, and PDF/DOCX export.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**, using **Groq** (Llama 3.3 70B) as the primary LLM and **Gemini** as a fallback.

## How It Works

```
Master Profile (localStorage)      Job Description (pasted)
            \                         /
             ▼                       ▼
        POST /api/generate-resume
             │
             ├─ 1. Local rule-based generator builds a fallback resume
             │     (keyword extraction, scoring, skill/experience selection)
             ├─ 2. Optional: Google Custom Search adds public job/company context
             ├─ 3. Groq (llama-3.3-70b) tailors the resume
             │     └─ on failure → Gemini → on failure → local fallback
             └─ 4. Response normalized, validated, and merged with fallback
             ▼
     Resume Preview page → edit, re-score, download PDF / DOCX / plain text
```

- **Profile import**: upload an existing resume (PDF or DOCX) and `/api/import-profile-from-resume` parses it (`pdf-parse` / `mammoth` + Groq) into a structured profile.
- **Everything is stored client-side** in `localStorage` (master profile, generated resumes). There is no database or auth.
- **PDF export** opens a print-ready popup window (letter size, ligatures disabled for clean ATS text extraction) — choose "Save as PDF" in the print dialog.
- **DOCX export** is generated fully in the browser (hand-built OOXML zip, no server round-trip).
- Generation runs and token usage are appended to `logs/*.jsonl` for debugging.

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard / landing |
| `/profile` | Master profile editor (personal info, experience, projects, skills, certifications) + resume import |
| `/job-analysis` | Paste and analyze a job description |
| `/resume-builder` | Configure generation (template, tone, experience level, length) and generate |
| `/resume-preview` | Live one-page preview with auto-fit scaling, zoom, template switcher, and PDF/DOCX/text downloads |
| `/settings` | App settings |
| `/history` | Placeholder (empty — see "What's Missing") |

Resume templates: `modern` (default), `compact`, `original-cv`, `university-law`. A reference DOCX for the law template lives in `public/templates/`.

## Getting Started

**Quick setup (recommended):** install [Node.js 20+ (LTS)](https://nodejs.org), then run the setup script — it checks Node, sets up pnpm, installs dependencies, and creates `.env.local` for you:

```bash
bash setup.sh    # Mac / Linux
setup.bat        # Windows (or double-click it)
```

See [SETUP.md](SETUP.md) for a step-by-step student guide with troubleshooting.

**Manual setup:** Node.js 20+ and pnpm (`corepack enable` is the easiest way).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
#    then edit .env.local (see table below)

# 3. Run the dev server
pnpm dev
#    open http://localhost:3000
```

Other scripts:

```bash
pnpm build   # production build
pnpm start   # serve the production build
pnpm lint    # ESLint
```

### Environment Variables (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for AI) | Groq API key — get one free at console.groq.com |
| `GROQ_API_KEY_2` / `GROQ_API_KEYS` | No | Extra keys used as fallbacks when rate-limited (comma-separated list supported) |
| `GROQ_API_ENABLED` | No | Set `false` to skip Groq |
| `GROQ_MODEL` | No | Defaults to `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | No | Enables Gemini as a fallback LLM |
| `GEMINI_API_ENABLED` / `GEMINI_MODEL` | No | Gemini toggle and model override |
| `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` | No | Google Custom Search enrichment for job/company context |
| `GOOGLE_SEARCH_ENABLED` | No | Set `false` to disable search enrichment |

**No keys at all?** The app still works — it falls back to the local rule-based generator (lower quality, but functional).

## Typical Workflow

1. **Set up your profile** on `/profile` — fill it in manually or import an existing resume PDF/DOCX.
2. **Paste a job description** on `/resume-builder`, pick a template and tone, and generate.
3. **Review on `/resume-preview`** — generated/changed text is highlighted; check the ATS score, matched and missing keywords.
4. **Download** — PDF (via print dialog), DOCX, or copy plain text.

## Project Structure

```
app/
  api/generate-resume/            # Main generation endpoint (Groq → Gemini → local fallback)
  api/import-profile-from-resume/ # Resume file → structured profile
  profile/ job-analysis/ resume-builder/ resume-preview/ settings/
components/
  layout/                         # App shell (sidebar, header)
  ui/                             # shadcn/ui (Radix) component library
lib/
  resume-generator.ts             # Local generation engine: keyword extraction, scoring,
                                  #   selection, chronological sorting, plain-text formatting
  profile-storage.ts              # localStorage persistence for profile + generated resumes
  data.ts                         # Default/mock master profile (knowledge base)
hooks/                            # use-mobile, use-toast
logs/                             # JSONL logs of generation runs + token usage
public/templates/                 # Reference DOCX template(s)
```

## What's Missing / Roadmap

- [ ] **History page** — `/history` exists but is empty; generated resumes are already saved in localStorage (`generated_resumes`), just needs a UI to list/reopen them.
- [ ] **No tests** — no unit or e2e tests exist yet. `lib/resume-generator.ts` (keyword extraction, scoring, date sorting) is the highest-value place to start.
- [ ] **No database / accounts** — all data lives in the browser's localStorage; clearing site data loses everything. Consider export/import of the profile as JSON, or a real backend.
- [ ] **Direct PDF download** — export currently relies on the browser print dialog; a server-side or library-based PDF renderer would give one-click downloads.
- [ ] **Multi-page resumes** — content is auto-scaled to force one page; long profiles just shrink instead of flowing to page two.
- [ ] **Template thumbnails/gallery** — templates are switchable but there's no visual picker preview.
- [ ] **Rate-limit UX** — when all Groq keys are exhausted the fallback is silent; surface which model actually generated the result more prominently.
- [ ] **`package.json` metadata** — still named `my-project`; add a real name, description, and repository field.
- [ ] **Log rotation** — `logs/*.jsonl` grows forever; also consider gitignoring it.

## Tech Stack

Next.js 16 · React 19 · TypeScript 5.7 · Tailwind CSS 4 · shadcn/ui (Radix primitives) · framer-motion · groq-sdk · pdf-parse · mammoth · zod · sonner
