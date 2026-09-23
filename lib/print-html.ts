// Shared by the resume preview and the cover letter page. The server-side PDF
// renderer does not apply linked stylesheets, so every same-origin stylesheet's
// rules are inlined and the printed HTML is self-contained.

function collectPageStyles() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return `<style>${Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n")}</style>`
      } catch {
        return sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : ""
      }
    })
    .join("\n")
}

export function buildPrintHtml(node: HTMLElement, fileBaseName: string, options?: { forServer?: boolean }) {
  const styleTags = collectPageStyles()
  const cloned = node.cloneNode(true) as HTMLElement

  cloned.classList.remove("shadow-lg", "rounded-lg")
  cloned.style.width = "8.5in"
  cloned.style.height = "11in"
  cloned.style.maxWidth = "none"
  cloned.style.margin = "0 auto"
  cloned.style.boxShadow = "none"
  cloned.style.borderRadius = "0"
  cloned.style.overflow = "hidden"

  return `<!doctype html>
<html>
  <head>
    <title>${fileBaseName}</title>
    ${options?.forServer ? `<base href="${window.location.origin}/">` : ""}
    ${styleTags}
    <style>
      @page { size: letter; margin: 0; }
      * {
        font-variant-ligatures: none !important;
        -webkit-font-variant-ligatures: none !important;
        font-feature-settings: "liga" 0, "clig" 0, "dlig" 0 !important;
      }
      html, body {
        width: 8.5in;
        height: 11in;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #111827;
        overflow: hidden;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      .resume-print-root {
        width: 8.5in !important;
        max-width: none !important;
        height: 11in !important;
        min-height: 11in !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      .resume-print-page {
        width: 8.5in !important;
        height: 11in !important;
        min-height: 11in !important;
        box-sizing: border-box !important;
        background: #ffffff !important;
        color: #111827 !important;
        overflow: hidden !important;
        transform: none !important;
        transform-origin: top left !important;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .resume-page-content {
        transform-origin: top left !important;
      }
      .resume-preview-highlight {
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
      }
    </style>
  </head>
  <body>
    ${cloned.outerHTML}
    ${options?.forServer ? "" : `<script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.print();
          window.close();
        }, 250);
      });
    </script>`}
  </body>
</html>`
}

export function openPrintWindow(node: HTMLElement, fileBaseName: string) {
  const printWindow = window.open("", "_blank", "width=980,height=1200")
  if (!printWindow) return false

  printWindow.document.open()
  printWindow.document.write(buildPrintHtml(node, fileBaseName))
  printWindow.document.close()
  return true
}
