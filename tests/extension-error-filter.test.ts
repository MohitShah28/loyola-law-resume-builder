import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The development-only inline script in app/layout.tsx stops browser-extension
// crashes from opening Next's error overlay, which made an extension's bug look
// like ours. These tests run that exact script, so the assertions cover the code
// that ships rather than a copy of it.
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
const script = layout.match(/__html: `([\s\S]*?)`,\n/)?.[1]

type Handler = (event: unknown) => void

function runScript() {
  if (!script) throw new Error("Could not find the inline script in app/layout.tsx")
  const handlers: Record<string, Handler[]> = {}
  const fakeWindow = {
    addEventListener(type: string, handler: Handler) {
      handlers[type] = handlers[type] || []
      handlers[type].push(handler)
    },
  }
  new Function("window", script)(fakeWindow)
  return handlers
}

// Returns true when the script swallowed the event.
function fire(type: string, event: Record<string, unknown>) {
  const handlers = runScript()
  let stopped = false
  let prevented = false
  const fullEvent = {
    ...event,
    stopImmediatePropagation: () => { stopped = true },
    preventDefault: () => { prevented = true },
  }
  for (const handler of handlers[type] || []) handler(fullEvent)
  return stopped && prevented
}

const extensionFile = "chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js"

describe("the inline script exists", () => {
  it("is present in the layout", () => {
    expect(script).toBeTruthy()
    expect(script).toContain("addEventListener")
  })
})

describe("errors from browser extensions are swallowed", () => {
  it("hides an error whose file is an extension script", () => {
    expect(fire("error", { filename: extensionFile, error: { stack: `TypeError\n    at Y (${extensionFile}:1:761)` } })).toBe(true)
  })

  it("hides an error whose stack points at an extension, even with no filename", () => {
    expect(fire("error", { filename: "", error: { stack: `TypeError: undefined\n    at E (${extensionFile}:1:1442)` } })).toBe(true)
  })

  it("hides Firefox and Safari extension errors too", () => {
    expect(fire("error", { filename: "moz-extension://abc/content.js", error: null })).toBe(true)
    expect(fire("error", { filename: "safari-web-extension://abc/content.js", error: null })).toBe(true)
  })

  it("hides an unhandled promise rejection from an extension", () => {
    expect(fire("unhandledrejection", { reason: { stack: `TypeError\n    at ${extensionFile}:1:1442` } })).toBe(true)
  })
})

describe("the app's own errors still reach the overlay", () => {
  it("does not hide an error from the app's own bundle", () => {
    expect(
      fire("error", {
        filename: "http://localhost:3000/_next/static/chunks/app/page.js",
        error: { stack: "TypeError: real bug\n    at Page (http://localhost:3000/_next/static/chunks/app/page.js:12:3)" },
      })
    ).toBe(false)
  })

  it("does not hide an app promise rejection", () => {
    expect(fire("unhandledrejection", { reason: { stack: "Error: generation failed\n    at fetchResume (http://localhost:3000/app/resume-builder/page.tsx:120:9)" } })).toBe(false)
  })

  it("does not hide an error with no source information", () => {
    expect(fire("error", { filename: "", error: null })).toBe(false)
  })

  it("does not hide an app error that merely mentions an extension in its message", () => {
    expect(fire("error", { filename: "http://localhost:3000/app/page.js", error: { stack: "Error: could not load extension settings\n    at Page (http://localhost:3000/app/page.js:4:1)" } })).toBe(false)
  })
})
