# Setup Guide (for Students)

This project runs the same on **Mac** and **Windows**. Follow the steps for your system.

> Note: this is a JavaScript (Next.js) project, not Python — so there is no
> `requirements.txt`. The equivalent here is `package.json`: running
> `pnpm install` installs every dependency automatically.

## Step 0 — Install Node.js (one time)

Download and install **Node.js 20 or newer (LTS)** from <https://nodejs.org>.
That's the only thing you install manually — everything else is automatic.

To check it worked, open a terminal (Mac: Terminal app, Windows: Command Prompt) and run:

```bash
node -v
```

You should see `v20.x.x` or higher.

## Step 1 — Run the setup script

Open a terminal **inside the project folder**, then:

**Mac / Linux:**

```bash
bash setup.sh
```

**Windows:** double-click `setup.bat`, or run in Command Prompt:

```bat
setup.bat
```

The script will:
1. Check your Node.js version
2. Enable `pnpm` (the package manager)
3. Install all dependencies
4. Create your `.env.local` config file from the template

## Step 2 — Add your API key (optional but recommended)

Open the file `.env.local` in any text editor and paste your key:

```
GROQ_API_KEY=your_key_here
```

Get a **free** key at <https://console.groq.com>.

**No key?** The app still works — it uses a built-in local generator (lower quality, but functional).

## Step 3 — Start the app

```bash
pnpm dev
```

Then open <http://localhost:3000> in your browser.

## Troubleshooting

| Problem | Fix |
|---|---|
| `node: command not found` / `'node' is not recognized` | Install Node.js from nodejs.org, then **close and reopen** your terminal |
| `pnpm: command not found` | Run `corepack enable` (Mac: may need `sudo corepack enable`), or `npm install -g pnpm` |
| `pnpm install` fails | Check internet connection; if on a school/office network, try a different network |
| Port 3000 already in use | Run `pnpm dev -- -p 3001` and open http://localhost:3001 |
| Windows: "running scripts is disabled" | Use Command Prompt (cmd) instead of PowerShell, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell once |
