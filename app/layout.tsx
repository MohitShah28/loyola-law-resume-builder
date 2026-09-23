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
