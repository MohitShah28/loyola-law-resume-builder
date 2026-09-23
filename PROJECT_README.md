# Loyola Law Resume Builder: Project README (for Claude)

A complete, current description of this project, written so another Claude
session (or developer) can pick it up without re-deriving anything. It covers
what the app does, how it is built, where everything lives, the rules the code
depends on, and what is still open.

> The student-facing guide is `README.md` (and `SETUP.md`). This file is the
> engineering handoff. Where they disagree, this file is newer (September 2026).

---

## 1. What the app is

An AI-assisted resume tailoring web app **only for Loyola Law School (LLS) and
law students**, including international LL.M. and J.D. students.

1. A student keeps one **master profile** (their truthful career knowledge base).
2. For each application they paste a **job description** (judicial clerkship,
   summer associate, firm associate, government, public interest).
3. The app produces a **one-page legal resume in the official Loyola Law format**,
   with an ATS keyword score, live preview, and PDF / DOCX / plain-text export,
   plus an optional cover letter.

Key properties:

- **Loyola format everywhere.** Every template renders the structure of the
  university's official sample resume (see section 4). Templates only change fonts
  and heading style.
- **Truthful by construction.** Bar admission, work authorization, education and
  additional information are printed straight from the profile. The AI only
  rewrites experience bullets. Server-side validation drops invented entries.
- **Works with zero API keys.** A deterministic local generator always runs first;
  AI providers only improve on it.
- **Private by architecture.** No database, no accounts. All student data lives in
  the browser's `localStorage`.
- **No login.** "Law students only" is enforced by content (legal keyword bank,
  legal prompts, legal demo data), not by authentication.

---

## 2. Stack and commands

- Next.js 16.2 (App Router, Turbopack) · React 19 · TypeScript 5.7
- Tailwind CSS 4 · shadcn/ui (Radix) · framer-motion · sonner
- AI SDKs: `@anthropic-ai/sdk`, `groq-sdk`; Gemini via REST `fetch`
- Parsing: `pdf-parse`, `mammoth` (DOCX) · PDF rendering: `puppeteer-core` + local Chrome
- Tests: Vitest · Lint: ESLint 10 flat config
- Package manager: pnpm 11 (`packageManager` in `package.json`). If `pnpm` is not
  installed, `npx` works for everything (`npx tsc --noEmit`, `npx eslint .`,
  `npx vitest run`, `npx next build`).

```bash
pnpm install      # or: bash setup.sh / setup.bat (creates .env.local too)
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint (currently clean)
pnpm test         # Vitest (3 files, 34 tests, all passing)
npx tsc --noEmit  # typecheck (currently clean)
```

---

## 3. Architecture

```
Profile Knowledge Base (/profile)      Job description (/resume-builder)
   stored in localStorage                        │
            └──────────────┬─────────────────────┘
                           ▼
              POST /api/generate-resume
   1. Local rule-based generator builds a complete fallback resume
   2. Optional Google Custom Search adds public job/company context
   3. AI tailoring, first provider that succeeds wins:
        Claude  →  Gemini  →  Groq (3 models × every key)  →  local fallback
   4. Response normalized + validated against the profile
   5. Deterministic ATS score computed from the final resume text
                           ▼
              saved to localStorage (latest + history)
                           ▼
   /resume-preview: buildResumeDocument(resume)  ← single layout model
        ├─ React renderer (6 template styles)  → on-screen page → PDF
        ├─ documentToDocxBody()                → DOCX (built in browser)
        └─ documentToText()                    → copy text, cover letter, ATS score
```

---

## 4. The Loyola resume format (most important rule)

The university's official sample (Timothy Lyon, LL.M.) defines the layout. **All
six templates** produce these sections, in this order, each shown only if the
student has data for it:

```
                         TIMOTHY LYON
      Los Angeles, CA | (310) 555-1234 | timothy.lyon@lls.edu

BAR ADMISSION            (plain lines)
WORK AUTHORIZATION       (one plain line)
EDUCATION                School ......................... Location
                         Degree, Field, Honors .............. Date   (italic)
                         Coursework:  Course; Course
                         Activities:  Org, Role (dates); Org, Role (dates)
EXPERIENCE               Employer ....................... Location   (bold)
                         Position .................. Start – End      (italic)
                           • bullet
ADDITIONAL INFORMATION   Languages:    …; …
                         Volunteer:    …
                         Memberships:  …; …
                         Honors / Certifications / Skills (only if the student has them)
                         Interests:    …
```

- There is **no** Summary, Skills or Projects section on the page. The summary is
  kept in the profile only for cover letters and AI context.
- Real skills, certifications and honors appear as rows inside Additional
  Information, and only when the student entered them. Skills never include
  anything the student did not list.
- Date ranges use an en dash (`August 2017 – June 2021`).
- The contact line is `Location | Phone | Email` (+ LinkedIn if filled).

**Single source of truth: `lib/resume-document.ts`.**
- `buildResumeDocument(resume)` turns a generated resume into a typed document
  model (sections of kind `lines`, `education`, `experience`, `rows`).
- `documentToText()`: plain text (tab = right-aligned column).
- `documentToDocxBody()`: WordprocessingML body. Property order follows the
  OOXML schema (`tabs, spacing, ind, jc` / `rFonts, b, i, sz, u`) or Word ignores
  the right tab stops. Every run carries an explicit font.
- `barAdmissionLines()`, `formatWorkAuthorization()`, `workAuthorizationLine()`:
  formatting for the international-student fields (section 5).

**Templates** (`templateStyles` in `app/resume-preview/page.tsx`): styles only,
covering font, sizes, page padding, header and heading classes, and DOCX font and
margins. IDs: `university-law` (label "University (Loyola official)", default,
Calibri), `original-cv`, `harvard`, `modern`, `executive`, `compact`.

The preview **always opens in the University template** and has a Template
dropdown; PDF and DOCX follow the selected template.

`tests/resume-document.test.ts` renders the sample profile
(`tests/fixtures/loyola-sample-profile.ts`) and asserts the output equals the
official sample **line for line**. If you change the layout, that test must stay
green.

---

## 5. Data model (`lib/data.ts`)

`ProfileData = typeof mockProfile`. `mockProfile` is the demo student,
**Sofia Martinez** (fictional 3L J.D. candidate), with **every section filled** as an
example for students. Fields:

| Field | Notes |
|---|---|
| `personalInfo` | name, email, phone, location, linkedin, github, portfolio, `summary` (not printed) |
| `barDetails.admissions[]` | `{ id, jurisdiction, year }` → "British Columbia Bar (2017)" |
| `barDetails.usBarExams[]` | `{ id, jurisdiction, examDate, status }`, status `registered` / `eligible` / `passed` → "Registered for the July 2027 California Bar exam" |
| `barAdmission: string[]` | extra free-text bar lines, printed after the structured ones |
| `workAuthorizationDetails` | `{ status, startDate, endDate, needsSponsorship }`; status ∈ `us-citizen`, `permanent-resident`, `f1-opt`, `f1-cpt`, `j1-academic-training`, `h1b`, `ead`, or `""` (section omitted) |
| `workAuthorization: string` | custom line; **overrides** the generated one when non-empty |
| `education[]` | institution, **location**, degree, field, startDate, endDate, `gpa` (**doubles as honors**: a value starting with a digit prints as "GPA: x", otherwise as-is, e.g. "With Distinction"), **coursework: string[]**, **activities: string[]** |
| `experience[]` | company, position, location, startDate, endDate, description (bullets) |
| `skills` | keys are legacy names: `programming` = research platforms, `dataAnalysis` = legal skills, `visualization` = technology/office software, `databases` = practice/litigation tools, `tools` = additional, `cloud` = unused |
| `certifications[]`, `achievements[]` | printed in Additional Information only if present |
| `additionalInfo` | `languages`, `volunteer`, `memberships`, `interests` (string arrays) |
| `projects[]` | **legacy only.** Not printed and not generated (`selectedProjects` is always `[]`). Kept so older saved profiles and imports load. |

`needsSponsorship` is **never printed**; it only tells the AI not to imply
otherwise.

### Adding a profile field: update all of these
1. `lib/data.ts`: the field and demo value
2. `lib/profile-storage.ts` `withNewFieldDefaults()`: backfill for older saved profiles
3. `lib/resume-generator.ts`: `GenerateResumePayload`, `profileToGeneratePayload`, `payloadToProfile` (give an **empty** default; never fall back to `mockProfile` values)
4. `lib/resume-document.ts`: if it prints
5. `app/resume-preview/page.tsx` `normalizeGeneratedResume()`: default for older stored resumes
6. `app/api/import-profile-from-resume/route.ts`: prompt schema, `getEmptyProfile`, normalizer
7. `app/profile/page.tsx`: editor UI and `mergeProfileFromResume`
8. `tests/fixtures/loyola-sample-profile.ts`: keep the fixture type-correct

---

## 6. Storage (`lib/profile-storage.ts`)

All in `localStorage`:

| Key | Contents |
|---|---|
| `master_profile` | the profile |
| `master_profile_version` | must equal `PROFILE_KNOWLEDGE_BASE_VERSION` |
| `resumeProfile` | legacy profile key (read once, cleared on reset) |
| `generatedResume` | latest generated resume (what the preview opens) |
| `generated_resumes` | history, newest first, max 30 |
| `app_notifications` | header notifications (`lib/notifications.ts`) |

> **Warning: `PROFILE_KNOWLEDGE_BASE_VERSION` is a reset switch.** When the stored
> version differs, `syncKnowledgeBaseVersion()` **replaces the saved profile with
> the demo profile and deletes all generated resumes.** It was bumped on purpose to
> `2026-09-loyola-jd-demo-full` to wipe old personal data. **Do not change it once real
> students use the app.** Add new fields through `withNewFieldDefaults()` instead.

`withNewFieldDefaults()` also moves legacy data: if education entries have no
`activities` array (old schema), the names of old `projects` go into the first
education entry's activities, once.

`saveMasterProfile` only accepts the source `"profile_management"` (the profile
page); generation never writes the profile.

---

## 7. Generation pipeline (`app/api/generate-resume/route.ts`)

1. **Local fallback** (`generateResumeFromJob` in `lib/resume-generator.ts`):
   legal keyword bank (about 60 terms) + requirement phrases ("experience with …")
   + capitalized terms → keywords; experience ranked by keyword overlap, up to 4
   roles, reverse-chronological (handles "Summer 2016", "Present"); keeps the
   student's own bullets (no generic filler).
2. **Google Custom Search** (optional) for public job/company context.
3. **Providers**, in order, each skipped if disabled or keyless:
   - Claude: `ANTHROPIC_MODEL`, default `claude-opus-5`
   - Gemini: models tried best first from `lib/gemini-models.ts`
     (`gemini-3.1-pro-preview` → `gemini-3.8-flash` → `gemini-3.7-flash` →
     `gemini-3.5-flash` → `gemini-2.5-flash`; `GEMINI_MODEL` may override with a
     comma-separated list). Free-tier keys get an instant 429 on Pro (limit 0) and
     fall through to Flash; busy Flash models return 503 and are retried once, then
     skipped. When a lower model wins, the response `warning` lists what was skipped.
   - OpenRouter (`lib/openrouter.ts`): one request carrying up to 3 models (an
     OpenRouter limit); OpenRouter moves to the next itself when one is busy.
     Defaults are free models (`nvidia/nemotron-3-ultra-550b-a55b:free` →
     `qwen/qwen3.8-27b:free` → `openrouter/free`), because a free-tier key can only
     run those, at 50 requests/day. `OPENROUTER_MODEL` overrides. No JSON mode
     (several free models lack it); output goes through json-repair.
   - Groq: `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `openai/gpt-oss-20b`,
     tried across every key in `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GROQ_API_KEYS`
   - Placeholder keys like `your_groq_api_key_here` are ignored.
4. **Prompt rules** (`buildPrompt`): Loyola section order; AI rewrites **experience
   bullets only** (3–5 per role, past-tense verb, no ending period); never invent
   facts or numbers; `selectedProjects` must be `[]`; `tailoredSkills` only from the
   student's own skills; international rules (never imply citizenship, residency or
   no-sponsorship-needed unless the data says so; never mention visa status in
   bullets; never imply U.S. bar admission unless `barDetails` lists it).
5. **Normalization**: model JSON is repaired (`lib/json-repair.ts`), experience is
   capped at 4 roles × 6 bullets, and certifications/achievements are filtered to
   entries that exist in the profile.
6. **ATS score** (`scoreResumeAgainstJob`): share of extracted job keywords present in
   the final resume text, mapped to 40–98. Deterministic, not an LLM guess.
7. Runs and token usage are appended to `logs/*.jsonl` (gitignored).

Response: `{ resume, source: "claude" | "gemini" | "openrouter" | "groq" | "local", modelUsed?, tokenUsage?, warning? }`.
The preview shows a "Basic mode" banner when `modelUsed` is empty (local result).

### Other API routes
- `POST /api/import-profile-from-resume`: PDF/DOCX → text → Groq, then OpenRouter
  if every Groq key fails → structured profile (schema includes location,
  activities, barDetails, workAuthorizationDetails). Errors only when neither key
  is set. Gemini is not wired in here yet.
- `POST /api/generate-cover-letter`: Claude → Gemini (same model list) → OpenRouter
  → Groq on the resume text + job description. Returns structured `letter` JSON.
  Prompt forbids inferring unstated facts such as class year ("second-year") —
  a free model did exactly that in testing. Placeholder keys are skipped.
- `POST /api/render-pdf`: receives self-contained print HTML and prints it with
  headless Chrome via `puppeteer-core` (`CHROME_PATH` or auto-detected paths). The
  client inlines all same-origin CSS rules into that HTML (`collectPageStyles`);
  linked stylesheets were not applied by the server's Chrome, which produced
  unstyled PDFs. Without a local Chrome, the client falls back to the browser print
  dialog.

---

## 8. Pages

| Route | What it does | Real or demo |
|---|---|---|
| `/` | Dashboard: links to Profile, Job Analysis, Resume Preview, Cover Letter | static content |
| `/profile` | Profile editor: Personal, Bar Admission (admissions, U.S. bar exams, other lines, "Prints on your resume as" preview), Work Authorization (status, dates, sponsorship, custom line, printed preview), Education (with Location and Activities), Work Experience, Skills, Certifications, Achievements, Links, Additional Information, Uploaded Files (import) | real |
| `/job-analysis` | Paste a job description: ATS score, required/matching/missing keywords, and experience entries ranked by keyword coverage (`rankExperienceForJob`). Uses the same local engine as the resume, no AI call | real |
| `/resume-builder` | Paste job description, pick template/tone/level/length, generate | real |
| `/resume-preview` | Letter-size preview (auto-fit and zoom), template dropdown (defaults to University), ATS panel (its message follows the score), inline edit mode, PDF/DOCX/copy, cover letter. "Missing From Profile" keywords are clickable: the student confirms the ones they genuinely have and they are added to the profile via `addSkillsToMasterProfile` (never invented into the resume text). Shows the demo student with a "Sample resume" banner until the student generates one | real |
| `/cover-letter` | Job description → one-page letter (same letterhead as the resume), "What this job asks for" panel (score; keywords named in the letter / in profile but not in letter / not in profile, with confirm-then-add), edit mode, PDF/DOCX/copy, recent letters | real |
| `/history` | Reopen or delete past generated resumes | real |
| `/settings` | Theme (light/dark/system) and profile backup export/import. Placeholder controls (account, password, notifications, unsaved defaults) were removed | real |

---

## 9. File map

```
app/
  layout.tsx                    root layout; dev-only script strips browser-extension
                                attributes (e.g. Bitdefender bis_skin_checked)
                                that cause hydration warnings
  page.tsx                      dashboard
  profile/page.tsx              profile editor (largest form; all section editors)
  resume-builder/page.tsx       generation form + template thumbnails
  resume-preview/page.tsx       templateStyles, LoyolaResume renderer, DOCX zip
                                writer, print HTML builder, ATS panel
  job-analysis/ cover-letter/ history/ settings/
  api/generate-resume/route.ts  provider chain, prompt, normalization, logging
  api/import-profile-from-resume/route.ts
  api/generate-cover-letter/route.ts
  api/render-pdf/route.ts
lib/
  resume-document.ts            Loyola layout model + text/DOCX output + bar/work-auth formatting
  resume-generator.ts           types, local generator, keyword bank, ATS scoring, payload mapping,
                                atsScoreMessage, rankExperienceForJob
  cover-letter.ts               letter layout model, text/DOCX output, keywordCoverage
  docx.ts, print-html.ts        shared DOCX zip writer; self-contained print HTML
  gemini-models.ts, openrouter.ts  provider model lists; OpenRouter client
  profile-storage.ts            localStorage, version reset, schema backfill
  data.ts                       demo profile (Sofia Martinez), dashboard demo data, version constant
  json-repair.ts                repairs malformed LLM JSON
  notifications.ts, utils.ts
components/layout/              app shell: sidebar, header, app-layout
components/ui/                  the 13 shadcn/Radix pieces still in use (button, input,
                                label, textarea, select, dialog, badge, avatar,
                                animated-card, ats-score-circle, file-upload-zone,
                                skeleton-loader, sonner)
tests/
  resume-document.test.ts       sample fidelity, DOCX XML, bar/work-auth formatting
  resume-generator.test.ts      sorting, ATS scoring, keyword-noise cases, rankExperienceForJob
  cover-letter.test.ts          letter layout, DOCX body, keywordCoverage
  json-repair.test.ts
  fixtures/loyola-sample-profile.ts   the official sample as profile data
public/templates/university-law-resume-template.docx   reference file
loyola_law_resume_guide.md      older clone/rebrand guide (partly outdated)
```

---

## 10. Environment variables (`.env.local`, template in `.env.example`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY`, `ANTHROPIC_API_ENABLED`, `ANTHROPIC_MODEL` | Claude (tried first) |
| `GEMINI_API_KEY`, `GEMINI_API_ENABLED`, `GEMINI_MODEL` | Gemini |
| `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GROQ_API_KEYS`, `GROQ_API_ENABLED`, `GROQ_MODEL` | Groq (also the only import provider) |
| `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`, `GOOGLE_SEARCH_ENABLED` | optional job-context enrichment |
| `CHROME_PATH` | Chrome/Edge binary for server PDF rendering |

Never commit `.env.local` (gitignored). No keys at all → local generator only.

---

## 11. Known issues and next steps

- **Profile import has no Gemini path.** It uses Groq, then OpenRouter; with only a
  Gemini key configured, resume import fails.
- **One shared OpenRouter free key = 50 requests/day** for everyone on a deployment.
- **Activity roles are not italic.** The sample italicizes the role inside an activity
  ("Society, *Secretary*"); activities are plain strings.
- **Calibri is not bundled.** On machines without Calibri the preview and PDF fall
  back to Arial; the DOCX specifies Calibri. A metric-compatible web font (Carlito)
  could be added.
- **DOCX not yet opened in Word.** The XML is schema-ordered and text-verified;
  macOS Quick Look ignores custom tab stops, so check right-aligned dates in Word
  itself.
- **One page only.** Long profiles are scaled down, not flowed to page two.
- `logs/*.jsonl` grows without rotation.
- `loyola_law_resume_guide.md` is the original clone blueprint; it names a personal
  folder path and the old provider order. Internal only.

---

## 12. Recent change log (September 2026, not yet committed)

All work below is **uncommitted** on `main` (last commit: "Rebrand as Loyola Law
Resume Builder for law students").

- All 6 templates rebuilt on the official Loyola sample via `lib/resume-document.ts`;
  old per-template renderers and text builders removed.
- Education gained `location` and `activities`; the "Activities & Leadership"
  (projects) section was removed from the profile editor and the output.
- Structured **international-student** fields: work-authorization status/dates/
  sponsorship and bar admissions / U.S. bar exam status, with editors, import
  support, and AI prompt rules.
- **Law-only cleanup**: legal keyword bank and job-title patterns; software-specific
  summary text, filler bullets and "Data Analyst" demo content removed.
- **PDF export fixed** (CSS now inlined into the print HTML).
- **DOCX export fixed** (OOXML property order; explicit fonts).
- Preview: template dropdown, always opens in University; sample-resume banner.
- New demo student (Sofia Martinez); the official sample moved to a test fixture;
  version bumped to wipe previously stored personal data; personal email removed
  from Settings.
- Tests: 34 passing, including a line-by-line comparison with the official sample.
- Cover Letter page (`/cover-letter`) with job-match panel.
- Release audit (Sept 21): preview auto-fit rewritten as a binary search (the old
  fixed-point loop could overflow the page bottom); Job Analysis wired to the real
  engine; Settings, header search, and "Share Link" placeholders removed; Loyola
  template named consistently; OpenRouter added as backup provider; default Claude
  model `claude-opus-5`; README, SETUP, and setup scripts refreshed.
- Dead code removed (Sept 23): 49 unused shadcn components, both unused hooks, and 5
  placeholder images deleted (56 files, ~170 KB) — nothing in the app imported them.
  `components/ui/` went from 62 files to 13. README now maps every remaining file.
  Verified after deletion: build, lint, 56 tests, and a 24-step click-through of
  every feature including PDF/DOCX downloads.
