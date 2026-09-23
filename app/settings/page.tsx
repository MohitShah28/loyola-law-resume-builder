"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Download, Upload, Palette, DatabaseBackup } from "lucide-react"
import { loadMasterProfile, saveMasterProfile } from "@/lib/profile-storage"
import type { ProfileData } from "@/lib/resume-generator"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const importInputRef = useRef<HTMLInputElement>(null)

  const handleExportProfile = () => {
    const profile = loadMasterProfile()
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `loyola-law-resume-profile-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success("Profile exported")
  }

  const handleImportProfile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as ProfileData
      if (!parsed || typeof parsed !== "object" || !parsed.personalInfo || !Array.isArray(parsed.experience)) {
        toast.error("Not a valid profile backup file.")
        return
      }
      saveMasterProfile(parsed, "profile_management")
      toast.success("Profile imported. Reloading...")
      setTimeout(() => window.location.reload(), 800)
    } catch {
      toast.error("Could not read that file as JSON.")
    }
  }

  const activeTheme = mounted ? theme || "light" : "light"

  return (
    <AppLayout title="Settings" subtitle="Manage your preferences">
      <div className="max-w-3xl mx-auto space-y-6">
        <AnimatedCard delay={0} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#0ea5e9]/10">
              <DatabaseBackup className="h-5 w-5 text-[#0ea5e9]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Data Backup</h2>
              <p className="text-sm text-muted-foreground">
                Your profile lives in this browser only. Export a backup so clearing browser data never loses it.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="gap-2" onClick={handleExportProfile}>
              <Download className="h-4 w-4" />
              Export Profile (JSON)
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => importInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import Profile Backup
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleImportProfile(file)
                event.target.value = ""
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Importing replaces your current profile with the backup.
          </p>
        </AnimatedCard>

        {/* Appearance */}
        <AnimatedCard delay={0.1} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize the look and feel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-3">
                {[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                  { label: "System", value: "system" },
                ].map((themeOption) => (
                  <motion.button
                    key={themeOption.value}
                    type="button"
                    onClick={() => setTheme(themeOption.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      activeTheme === themeOption.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    {themeOption.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </AnimatedCard>

      </div>
    </AppLayout>
  )
}
