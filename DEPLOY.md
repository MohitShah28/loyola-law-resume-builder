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
3. Open **Environment Variables** and add, copying values from your `.env.local`:

   | Name | Value |
   | --- | --- |
   | `GROQ_API_KEY` | your Groq key (required for AI) |
   | `GROQ_API_KEY_2` | optional second Groq key (helps when many people test at once) |
   | `GEMINI_API_KEY` | optional backup |
   | `OPENROUTER_API_KEY` | optional backup |
   | `ANTHROPIC_API_KEY` | optional, paid, best quality |

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
- **Access:** anyone with the link can use it, and each use spends your API quota.
  Share the link only with testers.
