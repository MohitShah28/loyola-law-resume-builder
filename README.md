# Loyola Law Resume Builder

AI-powered resume tailoring app for **Loyola Law School students**. Paste a job description — judicial clerkship, firm associate, summer associate, government, or public interest — and it rewrites your master profile into a job-specific, ATS-friendly, one-page legal resume — with keyword matching, an ATS score, live preview, and PDF/DOCX export.

Your data never leaves your browser: everything is stored in `localStorage`, with no accounts and no database.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**, using a five-tier LLM chain — **Claude → Gemini → OpenRouter → Groq → local rule-based generator**.

## Abstract

### Problem

Law students apply to many employers — judicial clerkships, firm summer associate programs, government agencies, public interest organizations — each with different expectations of what a resume should emphasize. Manually re-tailoring a resume per application is slow and error-prone, and the general-purpose resume tools available to students are built around software-industry conventions: they assume a "Projects" section, technical skill lists, and metric-driven bullets. That framing maps poorly onto legal credentials such as bar admission, journal membership, moot court, clinics, and Latin honors. Students also face two failure modes with naive AI resume tools: the model fabricates credentials the student does not hold, and the output silently fails applicant tracking system (ATS) parsing.

### Approach

This project is a browser-local, AI-assisted resume tailoring system specialized for the Loyola Law School resume format. It separates a durable **master profile** (the student's full, truthful career knowledge base) from **per-application generated artifacts**. The user maintains the profile once; for each application they paste a job description, and the system produces a one-page legal resume tailored to that posting.

Three design decisions define the system:

1. **Truthfulness by construction.** The generation prompt forbids inventing experience, and the server independently validates the model's response against the stored profile — selected activities and certifications are filtered to those that match a real profile entry by id or name, and achievements are intersected with the profile's own list. Content the model invents is dropped rather than trusted, so hallucinated credentials cannot reach the final document.

2. **Graceful degradation over hard failure.** A deterministic local generator runs *first* on every request, producing a complete usable resume from rule-based keyword extraction and scoring. The LLM tiers then attempt to improve on it. Any provider failure, rate limit, malformed response, or missing API key falls back to the previous tier, and ultimately to the local result. The application therefore remains fully functional with **no API keys configured at all** — an important property for distribution to students who will not obtain credentials.

3. **Privacy by architecture.** There is no database, no authentication, and no server-side persistence of user data. The master profile and generated resumes live entirely in browser `localStorage`. Resume text reaches a third-party model only at the moment of generation, and only if the user has configured a key.

### Implementation

The system is a single Next.js 16 application (~16,000 lines of TypeScript across ~100 source files) combining the UI and its API routes.

- **Generation pipeline** (`/api/generate-resume`): builds the deterministic fallback, optionally enriches context via Google Custom Search, then attempts Claude (`claude-opus-5`), Gemini, OpenRouter (free models by default), and Groq (`llama-3.3-70b-versatile`) in order. Responses are parsed through a custom JSON-repair layer (`lib/json-repair.ts`) that salvages truncated or corrupted model output rather than discarding a nearly complete answer.
- **Local generation engine** (`lib/resume-generator.ts`): extracts keywords from the posting using a curated legal keyword bank plus requirement-phrase and capitalized-term pattern matching, scores and ranks experience and activities by keyword overlap, sorts chronologically with support for non-numeric dates ("Summer 2016", "Present"), and emits plain text per template.
- **ATS scoring**: deliberately deterministic and reproducible rather than model-generated. The score is the proportion of extracted job keywords actually present in the final rendered resume text, mapped onto a 40–98 range, and is recomputed against the finished document so the number reflects what the employer's parser will see.
- **Profile import** (`/api/import-profile-from-resume`): accepts PDF or DOCX, extracts text via `pdf-parse` / `mammoth`, and uses an LLM with a strict schema and a no-invention instruction to populate the structured profile, including the legal-specific sections.
- **Export**: DOCX is assembled entirely client-side as hand-built OOXML inside a zip written byte-by-byte, requiring no server round-trip or document library. PDF export renders through headless Chrome via `/api/render-pdf`, degrading to the browser print dialog when no local browser binary is present. Both paths disable ligatures so ATS text extraction stays clean.
- **Preview fidelity**: the preview renders a true letter-size page (8.5in × 11in) and auto-scales it to the container via a `ResizeObserver`, with a fit routine that searches for the largest scale at which the content still fits the page — so the on-screen page matches the exported document while remaining readable from 375px mobile up to desktop.

### Outcome and limitations

The result is a self-contained tool a student can run locally, populate once, and reuse per application, producing format-consistent one-page legal resumes with an interpretable ATS signal and no cloud dependency on their personal data.

Known limitations: content is force-scaled to a single page rather than flowing to a second; and correctness of the tailored output still depends on the student reviewing it, since the system can only guarantee that content originates from their own profile, not that emphasis is optimal for a given employer.

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
             ├─ 3. Claude (claude-opus-5) tailors the resume
             │     └─ on failure → Gemini → OpenRouter → Groq (llama-3.3-70b) → local fallback
             └─ 4. Response normalized, validated against the profile, and
                   merged with the fallback (invented entries are dropped)
             ▼
     Resume Preview page → edit, re-score, download PDF / DOCX / plain text
```

- **Profile import**: upload an existing resume (PDF or DOCX) and `/api/import-profile-from-resume` parses it (`pdf-parse` / `mammoth` + Groq, with OpenRouter as backup) into a structured profile — including bar admission, work authorization, and additional information.
- **Everything is stored client-side** in `localStorage` (master profile, generated resumes). There is no database or auth.
- **PDF export** tries a real one-click download first via `/api/render-pdf` (headless Chrome through `puppeteer-core`), and falls back to a print-ready popup window ("Save as PDF") if no local browser binary is found.
- **DOCX export** is generated fully in the browser (hand-built OOXML zip, no server round-trip).
- **Cover letters** (`/cover-letter`): paste a job description and get a one-page letter grounded in a resume tailored to that job, with the same letterhead as the resume. A "What this job asks for" panel shows which requirements the letter names, which your profile covers but the letter left out, and which your profile lacks. Export to PDF/DOCX or copy.
- Generation runs and token usage are appended to `logs/*.jsonl` for debugging (gitignored).

## The Master Profile

The profile at `/profile` is the single knowledge base every resume is generated from. It follows the LLS legal-resume format rather than a generic tech-resume shape:

| Section | Notes |
|---|---|
| Personal Information | Name, contact, and professional summary |
| Bar Admission | Jurisdictions admitted, or an exam you are registered to sit for |
| Work Authorization | e.g. citizenship, sponsorship needs, or anticipated OPT start date |
| Education | Degree, field, location, dates, GPA **or** Latin/written honors, plus Relevant Coursework and Activities (journals, moot court, clinics, student organizations) |
| Work Experience | Employer, position, location, dates, and action-verb bullets |
| Skills | Research platforms, legal skills, technology, practice tools, additional |
| Certifications · Achievements · Links | Supporting credentials and profiles |
| Additional Information | Languages, volunteer work, memberships, interests |

Every field shows an always-visible **Example:** hint drawn from a real LLS sample resume, so students can see the expected format even when the field already has content.

> There is deliberately **no "Projects" section** — that is a software-resume concept. Journals, moot court, and clinics go under each school's Activities, as in the official Loyola format.

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard / landing |
| `/profile` | Master profile editor (see table above) + resume import |
| `/job-analysis` | Paste a job description to see its keywords, which your profile covers, which it lacks, and which experience entries to highlight |
| `/resume-builder` | Configure generation (template, tone, experience level, length) and generate |
| `/resume-preview` | Live one-page preview with auto-fit scaling, zoom, template switcher, inline editing, and PDF/DOCX/text downloads |
| `/cover-letter` | Generate a job-specific cover letter, with the job-match panel and PDF/DOCX export |
| `/history` | Past generated resumes — reopen or delete |
| `/settings` | Light/dark theme, and profile backup (export/import JSON) |

Resume templates: `university-law` (default — the law-school format), `modern`, `compact`, `harvard`, `executive`, `original-cv`. A reference DOCX for the law template lives in `public/templates/`.

The UI is responsive down to ~375px: the sidebar collapses into an overlay drawer, page grids stack to a single column, and the letter-size resume preview auto-scales to fit its container (zoom multiplies on top of that).

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
pnpm test    # Vitest unit tests
```

### Environment Variables (`.env.local`)

Providers are tried in the order below; each is optional, and the app degrades to the next tier (and finally to the local generator) when a key is absent or a call fails.

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Claude — **first** provider tried, and the highest-quality tier |
| `ANTHROPIC_API_ENABLED` / `ANTHROPIC_MODEL` | No | Claude toggle and model override (defaults to `claude-opus-5`) |
| `GROQ_API_KEY` | No | Groq API key — get one free at console.groq.com |
| `GROQ_API_KEY_2` / `GROQ_API_KEYS` | No | Extra keys used as fallbacks when rate-limited (comma-separated list supported) |
| `GROQ_API_ENABLED` | No | Set `false` to skip Groq |
| `GROQ_MODEL` | No | Defaults to `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | No | Enables Gemini as a fallback LLM |
| `GEMINI_API_ENABLED` / `GEMINI_MODEL` | No | Gemini toggle and model override |
| `OPENROUTER_API_KEY` | No | OpenRouter — backup when Claude and Gemini fail or hit limits. A free key runs free models only, 50 requests/day |
| `OPENROUTER_API_ENABLED` / `OPENROUTER_MODEL` | No | OpenRouter toggle and up to 3 comma-separated models (defaults to free models) |
| `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` | No | Google Custom Search enrichment for job/company context |
| `GOOGLE_SEARCH_ENABLED` | No | Set `false` to disable search enrichment |
| `CHROME_PATH` | No | Explicit Chrome/Edge binary for one-click PDF export; common install paths are auto-detected |

**No keys at all?** The app still works — it falls back to the local rule-based generator (lower quality, but functional).

## Typical Workflow

1. **Set up your profile** on `/profile` — fill it in manually or import an existing resume PDF/DOCX.
2. **Paste a job description** on `/resume-builder`, pick a template and tone, and generate.
3. **Review on `/resume-preview`** — generated/changed text is highlighted; check the ATS score, matched and missing keywords.
4. **Download** — PDF, DOCX, or copy plain text.
5. **Write the cover letter** on `/cover-letter` with the same job description.

## Project Structure

Every file in the repository, and what it is for. Nothing here is unused — files
the app no longer needed were removed.

### The pages people use (`app/`)

Each folder is one page at that web address.

| File | Page | What it does |
|---|---|---|
| `app/page.tsx` | `/` | Dashboard: links to Profile, Job Analysis, Resume Preview, Cover Letter |
| `app/profile/page.tsx` | `/profile` | The Profile Knowledge Base editor — every section of the student's master profile, plus resume import. The largest file in the project |
| `app/job-analysis/page.tsx` | `/job-analysis` | Paste a job description; shows its keywords, which the profile covers, which it lacks, and which experience to highlight |
| `app/resume-builder/page.tsx` | `/resume-builder` | Paste a job description, choose template/tone/length, generate |
| `app/resume-preview/page.tsx` | `/resume-preview` | The letter-size preview, template switcher, ATS panel, inline editing, PDF/DOCX/copy |
| `app/cover-letter/page.tsx` | `/cover-letter` | Cover letter generation, job-match panel, PDF/DOCX/copy, recent letters |
| `app/history/page.tsx` | `/history` | Reopen or delete past resumes |
| `app/settings/page.tsx` | `/settings` | Light/dark theme and profile backup (export/import) |
| `app/layout.tsx` | — | Wraps every page (theme, notifications) |
| `app/globals.css` | — | Tailwind theme: colors, fonts, print rules |
| `app/icon.svg` | — | The icon in the browser tab |

### The server routes (`app/api/`)

These run on the server, because they hold the API keys.

| File | What it does |
|---|---|
| `app/api/generate-resume/route.ts` | The main generator: builds a local resume first, then asks Claude → Gemini → OpenRouter → Groq to improve it, and drops anything the AI invented |
| `app/api/generate-cover-letter/route.ts` | Writes the cover letter from the tailored resume, same provider order |
| `app/api/import-profile-from-resume/route.ts` | Reads an uploaded PDF/DOCX resume and fills the profile |
| `app/api/render-pdf/route.ts` | Turns the on-screen page into a PDF using headless Chrome |

### The logic (`lib/`)

The rules live here, separate from the screens, so the same rules feed the preview, the downloads, and the score.

| File | What it does |
|---|---|
| `lib/resume-generator.ts` | The matching engine: pulls keywords from a job description, ranks the student's experience, scores the match. Works with no API key at all |
| `lib/resume-document.ts` | One definition of the Loyola resume layout, used by the preview, the DOCX, the plain text, and the score — so they can never disagree |
| `lib/cover-letter.ts` | The same idea for letters: layout, DOCX, and which job keywords the letter names |
| `lib/profile-storage.ts` | Saves and loads everything in the browser; upgrades older saved profiles |
| `lib/data.ts` | The example student (fictional person, real Loyola course and organization names) |
| `lib/docx.ts` | Builds the Word file in the browser, with no server and no Word library |
| `lib/print-html.ts` | Builds the self-contained page used for printing and PDFs |
| `lib/openrouter.ts` | The OpenRouter backup provider and its model list |
| `lib/gemini-models.ts` | Which Gemini models to try, best first |
| `lib/json-repair.ts` | Repairs half-finished JSON from an AI so a nearly complete answer is not thrown away |
| `lib/notifications.ts` | The bell menu in the header |
| `lib/utils.ts` | One small helper for CSS class names |

### Shared screen pieces (`components/`)

| Folder | What it holds |
|---|---|
| `components/layout/` | The app shell: sidebar, header, page wrapper |
| `components/ui/` | The 13 building blocks actually used — button, input, label, textarea, select, dialog, badge, avatar, animated card, ATS score circle, file upload, loading skeleton, toast |
| `components/theme-provider.tsx` | Light/dark mode |

### Tests (`tests/`)

Run them with `pnpm test`. 56 tests.

| File | What it checks |
|---|---|
| `tests/resume-document.test.ts` | The resume matches Loyola's official sample line by line, and the Word file is built correctly |
| `tests/resume-generator.test.ts` | Keyword extraction, ranking, and scoring — including the noise cases that once polluted the ATS list |
| `tests/cover-letter.test.ts` | Letter layout, Word output, and keyword coverage |
| `tests/json-repair.test.ts` | Broken AI JSON is repaired |
| `tests/fixtures/loyola-sample-profile.ts` | The official Loyola sample, used as the yardstick |

### Documentation

| File | Who it is for |
|---|---|
| `README.md` | This file — what the project is and how it works |
| `SETUP.md` | Students installing it for the first time, with troubleshooting |
| `PROJECT_README.md` | Developers taking over the code: architecture, decisions, known issues |
| `avtar.md` | A portable copy of a profile, to paste into an AI to find matching jobs |
| `loyola_law_resume_guide.md` | Internal: the original notes used to create this project |

### Setup and configuration

| File | What it is |
|---|---|
| `setup.sh` / `setup.bat` | One-click setup for Mac/Linux and Windows |
| `.env.example` | The template for API keys — safe to share, contains no keys |
| `.env.local` | **Your real API keys. Never share or commit this file** (git ignores it) |
| `package.json` | The project's dependencies and commands |
| `pnpm-lock.yaml` | Exact dependency versions, so everyone installs the same ones |
| `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `components.json` | Framework, TypeScript, CSS, linting, and test settings |
| `public/` | The browser tab icons and Loyola's reference Word template |
| `logs/` | Local record of past generation runs. Git ignores it; **it contains job descriptions and profile data, so delete it before zipping the folder for anyone** |

### Profile schema changes

`lib/data.ts` defines the profile shape. When you add a field, also update:

- `lib/profile-storage.ts` — backfill a default so profiles saved under the older schema still load
- `lib/resume-generator.ts` — payload types and the plain-text template builders
- `app/api/import-profile-from-resume/route.ts` — extraction prompt and normalizer
- `app/profile/page.tsx` — the editor UI section

## What's Missing / Roadmap

- [ ] **Test coverage** — `tests/` covers the generator, resume document, cover letter, and JSON repair; the API routes and profile storage have no automated tests, and there are no e2e tests in the repo.
- [ ] **No database / accounts** — all data lives in the browser's localStorage; clearing site data loses everything. Consider export/import of the profile as JSON, or a real backend.
- [ ] **PDF export needs a local browser** — `/api/render-pdf` shells out to an installed Chrome/Edge; on a machine without one it silently degrades to the print dialog. A bundled renderer would make this portable.
- [ ] **Multi-page resumes** — content is auto-scaled to force one page; long profiles just shrink instead of flowing to page two.
- [ ] **Template thumbnails/gallery** — templates are switchable but there's no visual picker preview.
- [ ] **Rate-limit UX** — when every provider is exhausted the local fallback is used with only a toast; surface which model generated the result more prominently.
- [ ] **Shared free quota** — one OpenRouter free key is 50 requests/day for everyone using the deployment; students running their own copy should add their own keys.
- [ ] **Log rotation** — `logs/*.jsonl` is gitignored but still grows without bound locally.

## Tech Stack

Next.js 16 · React 19 · TypeScript 5.7 · Tailwind CSS 4 · shadcn/ui (Radix primitives) · framer-motion · groq-sdk · pdf-parse · mammoth · puppeteer-core · zod · sonner · vitest
