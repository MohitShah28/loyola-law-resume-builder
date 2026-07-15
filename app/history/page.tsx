"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Clock, ExternalLink, FileText, Trash2 } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  StoredGeneratedResume,
  deleteGeneratedResume,
  loadGeneratedResumes,
  openGeneratedResume,
} from "@/lib/profile-storage"

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return value
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<StoredGeneratedResume[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setEntries(loadGeneratedResumes())
    setLoaded(true)
  }, [])

  const handleOpen = (entry: StoredGeneratedResume) => {
    openGeneratedResume(entry.resume)
    router.push("/resume-preview")
  }

  const handleDelete = (entry: StoredGeneratedResume) => {
    setEntries(deleteGeneratedResume(entry.id))
    toast.success("Resume deleted from history")
  }

  return (
    <AppLayout title="History" subtitle="Every resume you've generated, newest first">
      <div className="max-w-4xl mx-auto space-y-4">
        {loaded && entries.length === 0 && (
          <AnimatedCard hover={false}>
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No generated resumes yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a resume from a job description and it will show up here.
              </p>
              <Button onClick={() => router.push("/resume-builder")}>Open Resume Builder</Button>
            </div>
          </AnimatedCard>
        )}

        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.4) }}
          >
            <AnimatedCard hover={false}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{entry.label}</h3>
                    <Badge variant="secondary">{entry.resume.template}</Badge>
                    <Badge variant="outline">ATS {entry.resume.atsScore}</Badge>
                    {entry.resume.modelUsed ? (
                      <Badge variant="outline">{entry.resume.modelUsed}</Badge>
                    ) : (
                      <Badge variant="destructive">basic mode</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(entry.createdAt)}
                  </p>
                  {entry.jobDescription && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {entry.jobDescription}
                    </p>
                  )}
                  {entry.generationWarning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{entry.generationWarning}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" className="gap-1" onClick={() => handleOpen(entry)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDelete(entry)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  )
}
