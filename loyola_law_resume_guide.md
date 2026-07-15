# Loyola Law Resume Guide

**Purpose:** Complete blueprint of the Resume AI project, written so a graduate assistant at Loyola Law School can create an exact clone of this project dedicated to Loyola Law students. Includes: full project documentation (every file), all 6 resume templates, setup instructions, and a ready-to-paste prompt for Claude Code to perform the clone in a new folder.

---

## 1. What This Project Is

**Resume AI (ResumeForge)** — AI-powered resume tailoring web app. A student pastes a job description; the app rewrites their master profile into a job-specific, ATS-friendly, one-page resume with keyword matching, an ATS score, live preview, and PDF/DOCX export.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui (Radix)
- **AI:** Groq (Llama 3.3 70B, free tier) primary → Gemini fallback → Anthropic Claude optional (tried first when configured) → local rule-based generator as final fallback (works with zero API keys)
- **Storage:** everything client-side in browser `localStorage` — no database, no accounts, no student data ever leaves the browser (privacy-friendly for a school deployment)
- **Package manager:** pnpm 11 (via corepack, ships with Node.js 20+)

### Generation pipeline

```
Master Profile (localStorage)      Job Description (pasted)
            \                         /
             ▼                       ▼
        POST /api/generate-resume
             ├─ 1. Local rule-based generator builds fallback resume
             ├─ 2. Optional: Google Custom Search adds job/company context
             ├─ 3. AI tailors resume (Claude → Groq → Gemini → local fallback)
             └─ 4. Response normalized, validated, merged with fallback
             ▼
     Resume Preview → edit, re-score, download PDF / DOCX / text / cover letter
```

---

## 2. Complete File Inventory

Every file that matters, what it does, and whether the clone needs it.

### Root configuration

| File | Purpose |
|---|---|
| `package.json` | All dependencies + scripts (`dev`, `build`, `start`, `lint`, `test`). This is the project's "requirements file" — `pnpm install` installs everything |
| `pnpm-lock.yaml` | Locked dependency versions — copy as-is for reproducible installs |
| `pnpm-workspace.yaml` | pnpm config; `allowBuilds: sharp: true` lets the sharp image library build |
| `next.config.mjs` | Next.js config |
| `tsconfig.json` | TypeScript config (`@/*` path alias) |
| `postcss.config.mjs` | Tailwind CSS 4 via PostCSS |
| `eslint.config.mjs` | ESLint flat config |
| `vitest.config.ts` | Test runner config |
| `components.json` | shadcn/ui generator config |
| `.env.example` | Environment variable template (safe to share) |
| `.env.local` | **Real API keys — NEVER copy or commit this file** |
| `.gitignore` | Ignores `node_modules`, `.next`, `.env.local`, `logs`, etc. |
| `setup.sh` / `setup.bat` | One-click setup scripts (Mac/Linux and Windows): check Node 20+, set up pnpm via corepack, install dependencies, create `.env.local` from template |
| `README.md` | Main project documentation |
| `SETUP.md` | Step-by-step student setup guide with troubleshooting |
| `tsconfig.tsbuildinfo` | Build cache — do not copy (regenerated) |

### `app/` — pages and API routes (Next.js App Router)

| File | Purpose |
|---|---|
| `app/layout.tsx` | Root layout: fonts, theme provider, toaster, analytics |
| `app/globals.css` | Tailwind base + design tokens (light/dark themes) |
| `app/page.tsx` | Dashboard / landing page |
| `app/profile/page.tsx` | Master profile editor (personal info, experience, projects, skills, certifications) + resume import (PDF/DOCX upload) |
| `app/job-analysis/page.tsx` | Paste + analyze a job description |
| `app/resume-builder/page.tsx` | Configure generation: template picker, tone, experience level, length; triggers generation |
| `app/resume-preview/page.tsx` | **Largest file (~1,800 lines).** Live one-page preview with: responsive auto-fit scaling (ResizeObserver), zoom, all 6 template renderers, ATS score panel, matched/missing keywords, inline edit mode, PDF/DOCX/text downloads, cover letter generation. Also contains `templateStyles` (the 6 templates) and print/export HTML builders |
| `app/settings/page.tsx` | App settings |
| `app/history/page.tsx` | Placeholder (empty — resumes already saved in localStorage under `generated_resumes`, needs UI) |
| `app/api/generate-resume/route.ts` | Main generation endpoint: AI provider chain + fallback merge |
| `app/api/generate-cover-letter/route.ts` | Cover letter generation from resume + job description |
| `app/api/import-profile-from-resume/route.ts` | Uploaded PDF/DOCX (`pdf-parse` / `mammoth`) + AI → structured profile |
| `app/api/render-pdf/route.ts` | Server-side PDF rendering via `puppeteer-core` + local Chrome (`CHROME_PATH`); falls back to browser print dialog if unavailable |

### `lib/` — core logic

| File | Purpose |
|---|---|
| `lib/resume-generator.ts` | Local generation engine: keyword extraction, ATS scoring, skill/experience selection, chronological sorting, plain-text formatting |
| `lib/profile-storage.ts` | localStorage persistence (master profile, generated resumes) |
| `lib/data.ts` | Default/mock master profile (the demo data — **replace for Loyola clone** with a law-student example profile) |
| `lib/json-repair.ts` | Repairs malformed JSON returned by LLMs |
| `lib/notifications.ts` | Notification helpers |
| `lib/utils.ts` | `cn()` class-merge utility |

### `components/`

| Path | Purpose |
|---|---|
| `components/layout/app-layout.tsx` | App shell wrapper (sidebar + header + content) |
| `components/layout/sidebar.tsx` | Navigation sidebar — **app name/brand lives here** |
| `components/layout/header.tsx` | Top header (title, search, notifications, avatar) |
| `components/theme-provider.tsx` | Light/dark theme (next-themes) |
| `components/ui/*` (60+ files) | shadcn/ui component library (button, card, dialog, toast, …) plus custom ones: `animated-card`, `ats-score-circle`, `count-up`, `file-upload-zone`, `skeleton-loader` |

### Other directories

| Path | Purpose |
|---|---|
| `hooks/use-mobile.ts`, `hooks/use-toast.ts` | Responsive breakpoint + toast hooks |
| `public/templates/university-law-resume-template.docx` | Reference DOCX for the university-law template (supervisor-provided format) |
| `public/*.svg`, `public/*.jpg` | App icon + placeholder images |
| `tests/resume-generator.test.ts`, `tests/json-repair.test.ts` | Vitest unit tests (`pnpm test`) |
| `logs/*.jsonl` | Generation run + token usage logs — **do not copy** (runtime debug data) |

---

## 3. All 6 Resume Templates

Defined in `templateStyles` in `app/resume-preview/page.tsx` (line ~43). Each template styles: body font, header block, name, contact line, section headings, item titles. Every template renders the same profile data — switching is instant in the preview.

| ID | Style | Notes |
|---|---|---|
| `modern` | Sans-serif, left-aligned header with top border | Default template |
| `compact` | Sans-serif, tight spacing (`px-6 py-5`) | Fits the most content |
| `harvard` | Serif, centered header, heavy bottom border, uppercase tracked sections | Classic academic look |
| `executive` | Serif, centered header with double border, wide letter-spacing | Formal/senior |
| `original-cv` | Centered header, uppercase underlined-border sections; has dedicated renderer `OriginalCvResume` + its own download-text builder | Mirrors a traditional CV layout |
| `university-law` | Centered uppercase name, underlined section headings; dedicated renderer `UniversityLawResume` + its own download-text builder; reference DOCX in `public/templates/` | **The law-school format — default for the Loyola clone** |

Templates with dedicated renderers (`original-cv`, `university-law`) also have dedicated DOCX/plain-text builders (`buildOriginalCvDownloadText`, `buildUniversityLawDownloadText`) — a new law template must add all three pieces: `templateStyles` entry, renderer component, download-text builder.

---

## 4. Environment Variables (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for AI) | Free at console.groq.com |
| `GROQ_API_KEY_2` / `GROQ_API_KEYS` | No | Fallback keys when rate-limited (comma-separated supported) |
| `GROQ_API_ENABLED` / `GROQ_MODEL` | No | Toggle + model override (default `llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` / `GEMINI_API_ENABLED` / `GEMINI_MODEL` | No | Gemini fallback |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_API_ENABLED` / `ANTHROPIC_MODEL` | No | Claude (paid, best quality — tried first when set) |
| `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` / `GOOGLE_SEARCH_ENABLED` | No | Google Custom Search job/company enrichment |
| `CHROME_PATH` | No | Chrome/Edge binary path for server-side PDF rendering |

**No keys at all?** App still works via the local rule-based generator.

---

## 5. How to Make the Exact Copy

An exact copy is a **file copy, not a regeneration** — never ask an AI to rewrite 100+ files from memory; copy them, then customize.

```bash
# From the parent directory of Resume_Automation:
rsync -a --exclude node_modules --exclude .next --exclude .git \
      --exclude .env.local --exclude logs --exclude tsconfig.tsbuildinfo \
      Resume_Automation/ Loyola_Law_Resume/

cd Loyola_Law_Resume
git init && git add -A && git commit -m "Initial copy of Resume AI for Loyola Law"
bash setup.sh          # installs dependencies, creates fresh .env.local
```

Excluded on purpose: `node_modules` + `.next` (regenerated by install/build), `.git` (new history), `.env.local` (**your real API keys — never share**), `logs` (runtime debug data), `tsconfig.tsbuildinfo` (build cache).

---

## 6. The Clone Prompt (paste this to Claude Code in the new folder)

> Copy everything inside the block below into Claude Code after opening the new (empty or freshly-copied) folder. It covers both cases: folder already copied, or not yet.

```text
I am a graduate assistant at Loyola Law School. I need an exact working clone of my
Resume AI project, adapted for Loyola Law students only. The original project lives at:
/Users/mohitshah/Resume_Automation
A complete blueprint is in that folder: loyola_law_resume_guide.md — read it first.

STEP 1 — EXACT COPY (verify, don't regenerate):
- If this folder is empty, copy the original project here with rsync, excluding:
  node_modules, .next, .git, .env.local, logs, tsconfig.tsbuildinfo.
- Then verify NOTHING is missing: diff the file list against the original
  (same exclusions). Every app/, components/, lib/, hooks/, public/, tests/ file
  and every root config file must be present. Report the diff before continuing.
- Run: bash setup.sh (installs dependencies, creates .env.local from .env.example).
  I will paste my own API key into .env.local myself — never copy my keys.
- Verify the copy works: pnpm test must pass, pnpm build must succeed, and
  pnpm dev must serve all pages (/, /profile, /job-analysis, /resume-builder,
  /resume-preview, /settings, /history) without errors.

STEP 2 — LOYOLA LAW REBRAND (only after Step 1 verified):
- Rename the app to "Loyola Law Resume Builder" everywhere user-visible:
  sidebar brand (components/layout/sidebar.tsx), page metadata (app/layout.tsx),
  dashboard copy (app/page.tsx), package.json name, README.
- Keep ALL 6 resume templates working: modern, compact, harvard, executive,
  original-cv, university-law.
- Make university-law the DEFAULT template in the resume builder and preview.
- Replace the demo profile in lib/data.ts with a realistic law-student example
  (J.D. candidate at Loyola Law School: legal internships, moot court, law review,
  legal research/writing skills, bar-relevant certifications).
- Tune AI prompts in app/api/generate-resume/route.ts and
  app/api/generate-cover-letter/route.ts toward legal-industry resumes
  (judicial clerkships, firm associate roles, public interest law) while keeping
  the general pipeline intact.
- Update README.md and SETUP.md to address Loyola Law students.
- Do NOT change: the generation pipeline, localStorage model, PDF/DOCX export,
  responsive preview scaling, or the setup scripts.

STEP 3 — SUPERVISOR TEMPLATE (I will provide the file later):
- My supervisor gave me an official Loyola Law resume template. When I share it,
  add it as a 7th template following the university-law pattern: a templateStyles
  entry, a dedicated renderer component, and a dedicated download-text builder in
  app/resume-preview/page.tsx, plus the reference file in public/templates/.
  Until then, leave a TODO noting where it plugs in.

VERIFY AT THE END: pnpm test, pnpm build, and a browser check of every page and
every template in the preview. Report anything skipped or failing honestly.
```

---

## 7. Quick Reference

```bash
bash setup.sh      # one-time setup (Mac/Linux) — setup.bat on Windows
pnpm dev           # dev server → http://localhost:3000
pnpm build         # production build
pnpm start         # serve production build
pnpm test          # unit tests (vitest)
pnpm lint          # ESLint
```

| Route | Purpose |
|---|---|
| `/` | Dashboard |
| `/profile` | Master profile editor + resume import |
| `/job-analysis` | Job description analysis |
| `/resume-builder` | Template/tone config + generate |
| `/resume-preview` | Preview, ATS score, edit, downloads |
| `/settings` | Settings |
| `/history` | Placeholder (roadmap) |

---

*Generated 2026-07-15 from the project at `/Users/mohitshah/Resume_Automation` (branch `my-changes`).*
