import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Loyola Law Resume Builder - AI-Powered Resume Tailoring',
  description: 'Create ATS-optimized legal resumes tailored to any job description. Built for Loyola Law School students.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {process.env.NODE_ENV !== 'production' && (
          <script
            // Browser extensions (password managers, antivirus, AI assistants)
            // throw inside their own injected scripts. Next's dev overlay
            // catches every error on the page, so an extension's crash is shown
            // as though this app threw it. Swallow only errors whose source is
            // an extension file; the app's own errors still reach the overlay.
            // This inline script runs while the document parses, before the dev
            // runtime's deferred bundles register their handlers - window
            // listeners fire in registration order, so ours goes first.
            dangerouslySetInnerHTML={{
              __html: `(function(){var E=/(?:chrome|moz|safari-web)-extension:/;function ext(v){return typeof v==='string'&&E.test(v)}function hide(e){try{e.stopImmediatePropagation()}catch(_){}try{e.preventDefault()}catch(_){}}
window.addEventListener('error',function(e){var err=e&&e.error;if(ext(e&&e.filename)||ext(err&&err.stack))hide(e)},true);
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;if(ext(r&&r.stack)||ext(r&&r.message))hide(e)},true)})()`,
            }}
          />
        )}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="top-right" />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
        {process.env.NODE_ENV !== 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var A=['bis_skin_checked','bis_register','__processed_by_react_hydration__'];function strip(root){for(var i=0;i<A.length;i++){if(root.nodeType===1&&root.hasAttribute(A[i]))root.removeAttribute(A[i]);var n=root.querySelectorAll?root.querySelectorAll('['+A[i]+']'):[];for(var j=0;j<n.length;j++)n[j].removeAttribute(A[i])}}strip(document.documentElement);new MutationObserver(function(recs){for(var i=0;i<recs.length;i++){var r=recs[i];if(r.type==='attributes'){r.target.removeAttribute(r.attributeName)}else{for(var j=0;j<r.addedNodes.length;j++){if(r.addedNodes[j].nodeType===1)strip(r.addedNodes[j])}}}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:A})})()`,
            }}
          />
        )}
      </body>
    </html>
  )
}
