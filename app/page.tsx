"use client"

import Link from "next/link"
import {
  Target,
  User,
  Plus,
  Sparkles,
  Eye,
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"

const actions = [
  {
    title: "Update Profile",
    description: "Keep your master resume data accurate before generating.",
    href: "/profile",
    icon: User,
  },
  {
    title: "Analyze a Job",
    description: "Check required skills and gaps before tailoring your resume.",
    href: "/job-analysis",
    icon: Target,
  },
  {
    title: "Resume Preview",
    description: "Review and download the latest generated resume.",
    href: "/resume-preview",
    icon: Eye,
  },
]

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard" subtitle="Welcome back, Mohit">
      <div className="max-w-5xl mx-auto space-y-6">
        <AnimatedCard hover={false}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">Create a tailored resume</h2>
                <p className="text-muted-foreground text-sm">
                  Paste a job description and generate an ATS-friendly resume.
                </p>
              </div>
            </div>
            <Link href="/resume-builder">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Resume
              </Button>
            </Link>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Link key={action.href} href={action.href}>
              <AnimatedCard delay={index * 0.08} className="h-full">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>
              </AnimatedCard>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
