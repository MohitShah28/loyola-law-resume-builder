"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  FileText,
  Download,
  Upload,
  Bell,
  Palette,
  Shield,
  Save,
  DatabaseBackup
} from "lucide-react"
import { loadMasterProfile, saveMasterProfile } from "@/lib/profile-storage"
import type { ProfileData } from "@/lib/resume-generator"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState({
    defaultTemplate: "modern",
    defaultLength: "medium",
    exportFormat: "pdf",
    emailNotifications: true,
    autoSave: true,
    showTips: true
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = () => {
    toast.success("Settings saved successfully!")
  }

  const importInputRef = useRef<HTMLInputElement>(null)

  const handleExportProfile = () => {
    const profile = loadMasterProfile()
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resume-ai-profile-backup-${new Date().toISOString().slice(0, 10)}.json`
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
        {/* Profile Preferences */}
        <AnimatedCard hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profile Preferences</h2>
              <p className="text-sm text-muted-foreground">Manage your account details</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Mohit Shah" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="mohit.shah@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input id="title" defaultValue="Senior Data Analyst" />
            </div>
          </div>
        </AnimatedCard>

        {/* Resume Defaults */}
        <AnimatedCard delay={0.1} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#4f46e5]/10">
              <FileText className="h-5 w-5 text-[#4f46e5]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Resume Defaults</h2>
              <p className="text-sm text-muted-foreground">Set your default resume preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Template</Label>
                <Select 
                  value={settings.defaultTemplate}
                  onValueChange={(value) => setSettings(s => ({ ...s, defaultTemplate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university-law">University LLM</SelectItem>
                    <SelectItem value="harvard">Harvard Classic</SelectItem>
                    <SelectItem value="modern">Clean Professional</SelectItem>
                    <SelectItem value="executive">Executive Serif</SelectItem>
                    <SelectItem value="compact">Compact One-Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Length</Label>
                <Select 
                  value={settings.defaultLength}
                  onValueChange={(value) => setSettings(s => ({ ...s, defaultLength: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">1 Page</SelectItem>
                    <SelectItem value="medium">1.5 Pages</SelectItem>
                    <SelectItem value="long">2 Pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Export Preferences */}
        <AnimatedCard delay={0.2} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#10b981]/10">
              <Download className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Export Preferences</h2>
              <p className="text-sm text-muted-foreground">Configure download settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default Export Format</Label>
              <Select 
                value={settings.exportFormat}
                onValueChange={(value) => setSettings(s => ({ ...s, exportFormat: value }))}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="txt">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AnimatedCard>

        {/* Data Backup */}
        <AnimatedCard delay={0.25} hover={false}>
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

        {/* Notifications */}
        <AnimatedCard delay={0.3} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#f59e0b]/10">
              <Bell className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Manage notification preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your resumes</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Auto-Save Drafts</p>
                <p className="text-sm text-muted-foreground">Automatically save your work</p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, autoSave: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Tips</p>
                <p className="text-sm text-muted-foreground">Display helpful tips and suggestions</p>
              </div>
              <Switch
                checked={settings.showTips}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, showTips: checked }))}
              />
            </div>
          </div>
        </AnimatedCard>

        {/* Appearance */}
        <AnimatedCard delay={0.4} hover={false}>
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

        {/* Account Security */}
        <AnimatedCard delay={0.5} hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#ef4444]/10">
              <Shield className="h-5 w-5 text-[#ef4444]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Account Security</h2>
              <p className="text-sm text-muted-foreground">Manage your security settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button variant="outline">Change Password</Button>
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" className="gap-2">
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This action is irreversible. All your data will be permanently deleted.
              </p>
            </div>
          </div>
        </AnimatedCard>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button onClick={handleSave} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  )
}
