import { existsSync } from "node:fs"
import { NextResponse } from "next/server"
import puppeteer from "puppeteer-core"

export const maxDuration = 60

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((candidate): candidate is string => Boolean(candidate))

function findBrowser() {
  return BROWSER_CANDIDATES.find((candidate) => existsSync(candidate)) || ""
}

export async function POST(request: Request) {
  let payload: { html?: string; fileName?: string }
  try {
    payload = (await request.json()) as { html?: string; fileName?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  if (!payload.html?.trim()) {
    return NextResponse.json({ error: "html is required" }, { status: 400 })
  }

  const executablePath = findBrowser()
  if (!executablePath) {
    return NextResponse.json(
      { error: "No local Chrome/Edge found. Set CHROME_PATH in .env.local." },
      { status: 501 }
    )
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    })
    const page = await browser.newPage()
    await page.setContent(payload.html, { waitUntil: "load", timeout: 30000 })
    // Give webfonts/styles a moment to settle before printing.
    await new Promise((resolve) => setTimeout(resolve, 400))
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(payload.fileName || "resume").replace(/[^\w.-]/g, "_")}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[render-pdf] failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF rendering failed" },
      { status: 500 }
    )
  } finally {
    await browser?.close().catch(() => undefined)
  }
}
