"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Check, CheckCircle2, Copy, Download, Edit, FileText, Loader2, Mail, Plus, Sparkles, Trash2 } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AtsScoreCircle } from "@/components/ui/ats-score-circle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buildCoverLetterDocument,
  coverLetterToDocxBody,
  coverLetterToText,
  countWords,
  formatLetterDate,
  keywordCoverage,
} from "@/lib/cover-letter"
import { createDocxBlob, downloadBlob, sanitizeFilename } from "@/lib/docx"
import { buildPrintHtml, openPrintWindow } from "@/lib/print-html"
import {
  StoredCoverLetter,
  addSkillsToMasterProfile,
  createProfileWorkingCopy,
  deleteCoverLetter,
  loadCoverLetters,
  loadLatestCoverLetter,
  saveCoverLetter,
} from "@/lib/profile-storage"
import type { ProfileData } from "@/lib/resume-generator"
import { atsScoreMessage, generateResumeFromJob } from "@/lib/resume-generator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const PAGE_WIDTH = 8.5 * 96
const PAGE_HEIGHT = 11 * 96
const LETTER_FONT_FAMILY = 'Calibri, "Carlito", Arial, sans-serif'
const DOCX_STYLE = { font: "Calibri", bodySize: 22, nameSize: 28, margin: 1440 }

const generationSteps = [
  { id: 1, label: "Reading profile data" },
  { id: 2, label: "Analyzing job description" },
  { id: 3, label: "Matching your experience" },
  { id: 4, label: "Drafting the letter" },
  { id: 5, label: "Checking every claim against your profile" },
  { id: 6, label: "Formatting the letter" },
]

const TONES = [
  { value: "professional", label: "Professional (default)" },
  { value: "warm", label: "Warm and personable" },
  { value: "formal", label: "Formal (courts, government)" },
  { value: "enthusiastic", label: "Enthusiastic" },
]

export default function CoverLetterPage() {
  const letterRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerScale, setContainerScale] = useState(1)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [letters, setLetters] = useState<StoredCoverLetter[]>([])
  const [letter, setLetter] = useState<StoredCoverLetter | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [organization, setOrganization] = useState("")
  const [recipient, setRecipient] = useState("")
  const [tone, setTone] = useState("professional")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  // The page opens on the form, then switches to the finished letter, the same
  // way the resume builder hands off to the preview.
  const [showForm, setShowForm] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  // Missing requirements the student has confirmed are genuinely true of them.
  const [selectedMissing, setSelectedMissing] = useState<string[]>([])
  const [confirmSkillsOpen, setConfirmSkillsOpen] = useState(false)

  useEffect(() => {
    setProfile(createProfileWorkingCopy())
    const latest = loadLatestCoverLetter()
    setLetters(loadCoverLetters())
    if (!latest) return
    setLetter(latest)
    setShowForm(false)
    setJobDescription(latest.jobDescription)
    setJobTitle(latest.jobTitle)
    setOrganization(latest.organization)
    setRecipient(latest.recipient)
  }, [])

  // Fit the letter-size page to its column, as the resume preview does. The
  // preview only exists once a letter is shown, so this is a callback ref: it
  // measures whenever that element mounts, not only on first render.
  const observerRef = useRef<ResizeObserver | null>(null)
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    containerRef.current = node
    if (!node) return
    setContainerScale(Math.min(1, node.clientWidth / PAGE_WIDTH))
    const observer = new ResizeObserver(() => setContainerScale(Math.min(1, node.clientWidth / PAGE_WIDTH)))
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  const letterDocument =
    profile && letter
      ? buildCoverLetterDocument({
          profile,
          content: letter.content,
          job: { jobTitle: letter.jobTitle, organization: letter.organization, recipient: letter.recipient },
          date: formatLetterDate(new Date(letter.createdAt)),
        })
      : null

  // The job's requirements, and which of them this letter actually names. The
  // role and organization names are extracted as keywords too, but they are not
  // skills a student can add to their profile, so drop them from the gap list.
  const jobNameTerms = [letter?.jobTitle, letter?.organization]
    .map((value) => (value || "").toLowerCase())
    .filter(Boolean)
  const missingKeywords = (letter?.missingKeywords || []).filter(
    (keyword) => !jobNameTerms.some((term) => term.includes(keyword.toLowerCase()))
  )
  const coverage = letterDocument ? keywordCoverage(letterDocument, letter?.matchedKeywords || []) : null
  const hasAnalysis = Boolean(letter && (letter.matchedKeywords?.length || missingKeywords.length))

  const toggleMissing = (keyword: string) =>
    setSelectedMissing((current) =>
      current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]
    )

  const handleAddSkills = () => {
    const { added } = addSkillsToMasterProfile(selectedMissing)
    setConfirmSkillsOpen(false)
    setSelectedMissing([])
    setProfile(createProfileWorkingCopy())
    toast.success(
      added.length
        ? `Added ${added.length} to your profile. Generate again so the letter can use ${added.length === 1 ? "it" : "them"}.`
        : "Those are already in your profile."
    )
  }

  const fileBaseName =
    sanitizeFilename(
      `${profile?.personalInfo.firstName || ""}_${profile?.personalInfo.lastName || ""}_cover_letter`
    ) || "cover_letter"

  const handleGenerate = async () => {
    if (!jobDescription.trim() || !profile) return
    setIsGenerating(true)
    setCurrentStep(0)
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    try {
      for (let step = 1; step <= 3; step += 1) {
        setCurrentStep(step)
        await pause(350)
      }
      // The resume text is the only factual ground the letter may draw on.
      const resume = generateResumeFromJob({
        profile,
        jobDescription,
        template: "university-law",
        tone,
        experienceLevel: "entry",
        length: "medium",
      })
      // The local generator uses "Target Role"/"Target Company" when a posting
      // names neither; never let those placeholders reach the letter.
      const resolvedTitle = jobTitle.trim() || (resume.jobTitle === "Target Role" ? "" : resume.jobTitle)
      const resolvedOrganization =
        organization.trim() || (resume.company === "Target Company" ? "" : resume.company)

      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim(),
          candidateEmail: profile.personalInfo.email,
          candidatePhone: profile.personalInfo.phone,
          candidateLocation: profile.personalInfo.location,
          professionalSummary: profile.personalInfo.summary,
          resumeText: resume.resume,
          jobTitle: resolvedTitle,
          company: resolvedOrganization,
          recipient,
          tone,
          jobDescription,
        }),
      })
      const data = (await response.json()) as {
        letter?: StoredCoverLetter["content"]
        modelUsed?: string
        error?: string
      }
      if (!response.ok || !data.letter) throw new Error(data.error || "Cover letter generation failed")

      const stored = saveCoverLetter({
        label: [resolvedTitle, resolvedOrganization].filter(Boolean).join(" @ ") || "Cover letter",
        jobTitle: resolvedTitle,
        organization: resolvedOrganization,
        recipient: recipient || "Hiring Committee",
        jobDescription,
        modelUsed: data.modelUsed,
        content: data.letter,
        matchedKeywords: resume.matchedKeywords,
        missingKeywords: resume.missingKeywords,
        atsScore: resume.atsScore,
      })
      for (let step = 4; step <= generationSteps.length; step += 1) {
        setCurrentStep(step)
        await pause(300)
      }

      setLetter(stored)
      setSelectedMissing([])
      setLetters(loadCoverLetters())
      setIsEditMode(false)
      setShowForm(false)
      toast.success("Cover letter ready", { id: "cover-letter" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover letter generation failed", { id: "cover-letter" })
    } finally {
      setIsGenerating(false)
      setCurrentStep(0)
    }
  }

  const handleDownloadPdf = async () => {
    const node = letterRef.current
    if (!node) return
    try {
      toast.loading("Generating PDF...", { id: "cover-letter-pdf" })
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))
      const response = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: buildPrintHtml(node, fileBaseName, { forServer: true }), fileName: fileBaseName }),
      })
      if (response.ok) {
        downloadBlob(await response.blob(), `${fileBaseName}.pdf`)
        toast.success("PDF downloaded", { id: "cover-letter-pdf" })
        return
      }
      if (openPrintWindow(node, fileBaseName)) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "cover-letter-pdf" })
      }
    } catch {
      if (openPrintWindow(node, fileBaseName)) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "cover-letter-pdf" })
      } else {
        toast.error("PDF generation failed.", { id: "cover-letter-pdf" })
      }
    }
  }

  const handleDownloadDocx = () => {
    if (!letterDocument) return
    downloadBlob(createDocxBlob(coverLetterToDocxBody(letterDocument, DOCX_STYLE), DOCX_STYLE), `${fileBaseName}.docx`)
    toast.success("DOCX downloaded")
  }

  const handleCopy = async () => {
    if (!letterDocument) return
    await navigator.clipboard.writeText(coverLetterToText(letterDocument))
    toast.success("Cover letter copied")
  }

  const handleOpen = (entry: StoredCoverLetter) => {
    setLetter(entry)
    setJobDescription(entry.jobDescription)
    setJobTitle(entry.jobTitle)
    setOrganization(entry.organization)
    setRecipient(entry.recipient)
    setIsEditMode(false)
    setSelectedMissing([])
    setShowForm(false)
  }

  const handleDelete = (entry: StoredCoverLetter) => {
    setLetters(deleteCoverLetter(entry.id))
    if (letter?.id === entry.id) setLetter(null)
    toast.success("Cover letter deleted")
  }

  return (
    <AppLayout title="Cover Letter" subtitle="Paste a job description and get a letter written for that job">
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <AnimatedCard hover={false} className="max-w-md w-full">
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
                <h2 className="text-xl font-semibold text-foreground">Writing Your Cover Letter</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Using only what is in your Profile Knowledge Base
                </p>
              </div>

              <div className="space-y-3">
                {generationSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      currentStep > index ? "bg-[#10b981]/10" : currentStep === index ? "bg-primary/10" : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0",
                        currentStep > index
                          ? "bg-[#10b981] text-white"
                          : currentStep === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > index ? (
                        <Check className="h-4 w-4" />
                      ) : currentStep === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        currentStep > index
                          ? "text-[#10b981]"
                          : currentStep === index
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </motion.div>
        ) : showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto space-y-6"
          >
            <AnimatedCard hover={false}>
              <Label className="text-lg font-semibold text-foreground">Job Description</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Paste the job posting to tailor your cover letter
              </p>
              <Textarea
                value={jobDescription}
                placeholder="Paste the full job description here..."
                onChange={(event) => setJobDescription(event.target.value)}
                className="min-h-[200px] resize-none"
              />
            </AnimatedCard>

            <AnimatedCard delay={0.1} hover={false}>
              <Label className="text-lg font-semibold text-foreground">Letter Details</Label>
              <p className="text-sm text-muted-foreground mb-4">
                All optional. Left blank, the role and organization are read from the posting.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Role</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    placeholder="e.g. Judicial Law Clerk"
                    onChange={(event) => setJobTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={organization}
                    placeholder="e.g. U.S. District Court, C.D. Cal."
                    onChange={(event) => setOrganization(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipient">Addressed to</Label>
                  <Input
                    id="recipient"
                    value={recipient}
                    placeholder="e.g. Judge Alvarez, or Hiring Committee"
                    onChange={(event) => setRecipient(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AnimatedCard>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 gap-2 h-12"
                onClick={handleGenerate}
                disabled={!jobDescription.trim() || isGenerating}
              >
                <Sparkles className="h-4 w-4" />
                Generate Cover Letter
              </Button>
              {letter && (
                <Button variant="outline" className="h-12 gap-2" onClick={() => setShowForm(false)}>
                  <Mail className="h-4 w-4" />
                  Back to your letter
                </Button>
              )}
            </div>

            {letters.length > 0 && (
              <AnimatedCard hover={false} delay={0.2}>
                <h3 className="font-semibold text-foreground mb-3">Recent letters</h3>
                <div className="space-y-2">
                  {letters.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <button className="flex-1 text-left min-w-0" onClick={() => handleOpen(entry)}>
                        <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(entry)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Letter preview */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <AnimatedCard hover={false} className="p-4">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="text-sm text-muted-foreground">
                    {letterDocument ? `${countWords(letterDocument)} words` : "Preview"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
                      <Sparkles className="h-4 w-4" />
                      New Letter
                    </Button>
                    {letterDocument && (
                      <Button
                        variant={isEditMode ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const next = !isEditMode
                          setIsEditMode(next)
                          toast[next ? "info" : "success"](
                            next ? "Edit mode on — click any text to change it. Edits are included in downloads." : "Edit mode off"
                          )
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        {isEditMode ? "Done Editing" : "Edit Letter"}
                      </Button>
                    )}
                  </div>
                </div>

                <div ref={setContainerNode} className="overflow-auto">
                  {letterDocument ? (
                    <motion.div
                      ref={letterRef}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="resume-print-root bg-white rounded-lg shadow-lg mx-auto overflow-hidden"
                      style={{
                        width: `${PAGE_WIDTH * containerScale}px`,
                        height: `${PAGE_HEIGHT * containerScale}px`,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        contentEditable={isEditMode}
                        suppressContentEditableWarning
                        className={cn(
                          "resume-print-page px-24 py-16 text-gray-950",
                          isEditMode && "outline outline-2 outline-dashed outline-primary/50 cursor-text"
                        )}
                        style={{
                          width: `${PAGE_WIDTH}px`,
                          height: `${PAGE_HEIGHT}px`,
                          fontFamily: LETTER_FONT_FAMILY,
                          fontSize: "12px",
                          lineHeight: 1.45,
                          overflow: "hidden",
                          boxSizing: "border-box",
                          transform: `scale(${containerScale})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <header className="text-center mb-8">
                          <h1 className="font-bold uppercase" style={{ fontSize: "15px", margin: 0 }}>
                            {letterDocument.name}
                          </h1>
                          <p style={{ margin: "0.2em 0 0 0" }}>{letterDocument.contact}</p>
                        </header>

                        <p style={{ margin: "0 0 1.4em 0" }}>{letterDocument.date}</p>

                        <div style={{ margin: "0 0 1.4em 0" }}>
                          {letterDocument.recipientLines.map((line, index) => (
                            <p key={index} style={{ margin: 0 }}>{line}</p>
                          ))}
                        </div>

                        {letterDocument.subject && (
                          <p className="font-bold" style={{ margin: "0 0 1.4em 0" }}>{letterDocument.subject}</p>
                        )}

                        <p style={{ margin: "0 0 1.2em 0" }}>{letterDocument.greeting}</p>

                        {letterDocument.paragraphs.map((paragraph, index) => (
                          <p key={index} style={{ margin: "0 0 1.2em 0", textAlign: "justify" }}>{paragraph}</p>
                        ))}

                        <p style={{ margin: "1.6em 0 2.4em 0" }}>{letterDocument.closing}</p>
                        <p style={{ margin: 0 }}>{letterDocument.signature}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-24 text-muted-foreground">
                      <Mail className="h-10 w-10 mb-3 opacity-40" />
                      <p className="font-medium text-foreground">No cover letter yet</p>
                      <p className="text-sm mt-1 max-w-sm">
                        Paste the job description on the right and generate. The letter uses only what is in your Profile
                        Knowledge Base.
                      </p>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            {/* Side panels */}
            <div className="space-y-4 order-1 lg:order-2">
            {letterDocument && (
              <AnimatedCard hover={false} delay={0.1}>
                <h3 className="font-semibold text-foreground mb-3">Download</h3>
                <div className="space-y-2">
                  <Button className="w-full gap-2" onClick={handleDownloadPdf}>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={handleDownloadDocx}>
                    <FileText className="h-4 w-4" />
                    Export DOCX
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                    Copy Letter
                  </Button>
                </div>
                {letter?.modelUsed && (
                  <p className="text-xs text-muted-foreground mt-3">Written by {letter.modelUsed}</p>
                )}
              </AnimatedCard>
            )}
            {hasAnalysis && (
              <AnimatedCard hover={false} delay={0.15}>
                <h3 className="font-semibold text-foreground mb-3">What this job asks for</h3>

                {typeof letter?.atsScore === "number" && (
                  <div className="flex flex-col items-center text-center mb-4">
                    <AtsScoreCircle score={letter.atsScore} size="lg" />
                    <p className="text-sm text-muted-foreground mt-3">{atsScoreMessage(letter.atsScore)}</p>
                  </div>
                )}

                {coverage && coverage.mentioned.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                      Named in this letter
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {coverage.mentioned.map((keyword) => (
                        <Badge key={keyword} className="bg-[#10b981]/10 text-[#10b981]">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {coverage && coverage.unmentioned.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">In your profile, not in this letter</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      A letter is short, so it cannot name everything. Generate again or edit the letter if one of these
                      matters for this job.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {coverage.unmentioned.map((keyword) => (
                        <Badge key={keyword} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {missingKeywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-[#f59e0b]" />
                      Not in your profile
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      The posting asks for these and your profile does not mention them, so the letter does not claim them.
                      Select only the ones that are genuinely true of you.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingKeywords.map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          onClick={() => toggleMissing(keyword)}
                          aria-pressed={selectedMissing.includes(keyword)}
                        >
                          <Badge
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedMissing.includes(keyword)
                                ? "bg-[#10b981]/15 text-[#10b981] ring-1 ring-[#10b981]/40"
                                : "bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20"
                            )}
                          >
                            {selectedMissing.includes(keyword) && <Check className="h-3 w-3 mr-1" />}
                            {keyword}
                          </Badge>
                        </button>
                      ))}
                    </div>
                    {selectedMissing.length > 0 && (
                      <Button size="sm" className="w-full mt-3 gap-2" onClick={() => setConfirmSkillsOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add {selectedMissing.length} to my profile
                      </Button>
                    )}
                  </div>
                )}
              </AnimatedCard>
            )}
            {letters.length > 0 && (
              <AnimatedCard hover={false} delay={0.2}>
                <h3 className="font-semibold text-foreground mb-3">Recent letters</h3>
                <div className="space-y-2">
                  {letters.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <button className="flex-1 text-left min-w-0" onClick={() => handleOpen(entry)}>
                        <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(entry)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirmSkillsOpen} onOpenChange={setConfirmSkillsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Only add what is true</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            These go into your profile as your own skills, and future resumes and letters may use them. Add them only if
            you genuinely have this experience — employers ask about anything you send them.
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedMissing.map((keyword) => (
              <Badge key={keyword} variant="secondary">{keyword}</Badge>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmSkillsOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSkills}>Yes, I have these</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
