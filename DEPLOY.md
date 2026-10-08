# Deploying the Loyola Law Resume Builder

Put the app online at a shareable link (free) with GitHub + Vercel.

## 1. Push the code to GitHub (once)

1. Go to <https://github.com/new>, name the repo `loyola-law-resume-builder`,
   set it to **Private**, and do **not** add a README. Click **Create repository**.
2. In Terminal on your Mac:

   ```bash
   cd ~/Desktop/Graduate_Assistant/LLS_RESUME_AUTOMATION
   git remote add origin https://github.com/<your-username>/loyola-law-resume-builder.git
   git push -u origin main
   ```

`.env.local` (your API keys) and `logs/` are in `.gitignore`, so they are never uploaded.

## 2. Deploy on Vercel

1. Go to <https://vercel.com>, sign in with GitHub.
2. **Add New → Project**, pick `loyola-law-resume-builder`, click **Import**.
   Vercel detects Next.js and pnpm automatically; leave build settings as they are.
3. Open **Environment Variables** and add, copying the values from your
   `.env.local` (one row per line in that file):

   | Name | Value | Needed? |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | your Gemini key | Yes — this is the main provider |
   | `GEMINI_MODEL` | the model list from `.env.local` | Optional; omit to use the built-in list |
   | `OPENROUTER_API_KEY` | your OpenRouter key | Recommended — backup when Gemini is busy |

   Optional extras, only if you add those keys later: `ANTHROPIC_API_KEY`
   (paid, tried first), `GROQ_API_KEY`. `.env.example` documents every setting.

   Set each variable for **Production, Preview and Development** so previews work too.

4. Click **Deploy**. After ~2 minutes you get a link like
   `https://loyola-law-resume-builder.vercel.app` — that is the link to share.

## Updating the live site

Every `git push` to `main` redeploys automatically.

## How the hosted version behaves

- **Privacy:** student profiles stay in each person's browser. On Vercel the server
  writes no generation logs (`SAVE_GENERATION_LOGS` defaults to off there).
- **PDF download:** the server-side Chrome renderer is not available on Vercel, so
  "Download PDF" opens the print dialog — choose **Save as PDF**. Word download is unchanged.
- **No keys:** the app still works with the built-in rule-based generator, at lower quality.
- **Shared quota:** everyone using the link spends the same keys. A free OpenRouter
  key allows 50 requests a day in total, not per person.
- **Access:** anyone with the link can use it, and each use spends your API quota.
  Share the link only with testers.
