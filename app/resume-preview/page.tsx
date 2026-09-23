"use client"

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Edit,
  Check,
  Plus,
  Copy,
  Mail,
  Loader2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AtsScoreCircle } from "@/components/ui/ats-score-circle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockProfile } from "@/lib/data"
import { GeneratedResume, atsScoreMessage, generateResumeFromJob } from "@/lib/resume-generator"
import {
  buildResumeDocument,
  documentToDocxBody,
  documentToText,
  type DocxStyle,
  type LabeledRow,
  type ResumeDocument,
} from "@/lib/resume-document"
import { addSkillsToMasterProfile, loadGeneratedResumes, loadLatestGeneratedResume } from "@/lib/profile-storage"
import { cn } from "@/lib/utils"
import { buildPrintHtml, openPrintWindow } from "@/lib/print-html"
import { createDocxBlob, downloadBlob, sanitizeFilename } from "@/lib/docx"
import { toast } from "sonner"

const fallbackResume = generateResumeFromJob({
  profile: mockProfile,
  jobDescription: "Judicial extern position requiring legal research, persuasive and objective legal writing, case analysis, Westlaw and Lexis proficiency, and strong attention to detail.",
  template: "university-law",
  tone: "professional",
  experienceLevel: "mid",
  length: "medium",
})

const UNIVERSITY_LAW_FONT_FAMILY = 'Calibri, "Carlito", Arial, sans-serif'
const ORIGINAL_CV_FONT_FAMILY = '"Times New Roman", Times, serif'

// Every template renders the official Loyola Law sample layout from
// lib/resume-document.ts (Bar Admission, Work Authorization, Education with
// Activities, Experience, Additional Information). Templates only change the
// typeface, header treatment, and heading style.
type TemplateStyle = {
  fontFamily?: string
  body: string
  fontSize: number
  lineHeight: number
  page: string
  header: string
  name: string
  nameSize: number
  contact: string
  section: string
  sectionGap: string
  docx: DocxStyle
}

const templateStyles = {
  "university-law": {
    fontFamily: UNIVERSITY_LAW_FONT_FAMILY,
    body: "",
    fontSize: 11.5,
    lineHeight: 1.2,
    page: "px-24 py-16",
    header: "text-center mb-5",
    name: "font-bold uppercase",
    nameSize: 15,
    contact: "text-gray-950",
    section: "font-bold uppercase underline underline-offset-2 text-gray-950",
    sectionGap: "mb-4",
    docx: { font: "Calibri", bodySize: 22, nameSize: 28, margin: 1440 },
  },
  "original-cv": {
    fontFamily: ORIGINAL_CV_FONT_FAMILY,
    body: "",
    fontSize: 11.5,
    lineHeight: 1.18,
    page: "px-20 py-14",
    header: "text-center mb-4",
    name: "font-bold uppercase tracking-wide",
    nameSize: 18,
    contact: "text-gray-800",
    section: "uppercase text-gray-700 border-b border-gray-600 pb-0.5",
    sectionGap: "mb-3.5",
    docx: { font: "Times New Roman", bodySize: 22, nameSize: 32, margin: 1260 },
  },
  harvard: {
    body: "font-serif",
    fontSize: 11.5,
    lineHeight: 1.2,
    page: "px-20 py-14",
    header: "text-center border-b-2 border-gray-900 pb-2 mb-4",
    name: "font-bold text-gray-950",
    nameSize: 20,
    contact: "text-gray-700",
    section: "font-bold uppercase tracking-wider text-gray-950 border-b border-gray-900 pb-0.5",
    sectionGap: "mb-3.5",
    docx: { font: "Times New Roman", bodySize: 22, nameSize: 32, margin: 1440 },
  },
  modern: {
    body: "font-sans",
    fontSize: 11,
    lineHeight: 1.22,
    page: "px-16 py-12",
    header: "text-left border-t-4 border-gray-900 pt-3 pb-2 mb-4",
    name: "font-bold text-gray-950",
    nameSize: 22,
    contact: "text-gray-600",
    section: "font-semibold uppercase tracking-wide text-gray-950 border-b border-gray-400 pb-0.5",
    sectionGap: "mb-3.5",
    docx: { font: "Arial", bodySize: 21, nameSize: 34, margin: 1080 },
  },
  executive: {
    body: "font-serif",
    fontSize: 11.5,
    lineHeight: 1.2,
    page: "px-20 py-14",
    header: "text-center border-y-2 border-gray-800 py-4 mb-4",
    name: "font-bold uppercase tracking-wide text-gray-950",
    nameSize: 20,
    contact: "text-gray-700",
    section: "font-bold uppercase tracking-[0.16em] text-gray-950 border-b border-gray-400 pb-0.5",
    sectionGap: "mb-3.5",
    docx: { font: "Georgia", bodySize: 21, nameSize: 32, margin: 1440 },
  },
  compact: {
    body: "font-sans",
    fontSize: 10.5,
    lineHeight: 1.15,
    page: "px-12 py-9",
    header: "text-left border-b border-gray-300 pb-1.5 mb-3",
    name: "font-bold text-gray-950",
    nameSize: 18,
    contact: "text-gray-600",
    section: "font-semibold uppercase tracking-wide text-gray-950 border-b border-gray-300 pb-0.5",
    sectionGap: "mb-2.5",
    docx: { font: "Arial", bodySize: 20, nameSize: 30, margin: 900 },
  },
} satisfies Record<string, TemplateStyle>

type TemplateId = keyof typeof templateStyles
type ResumeCertification = GeneratedResume["selectedCertifications"][number]

// The preview always opens in the university's official format; students can
// switch to another look with the template picker above the page.
const fallbackTemplateId: TemplateId = "university-law"

const templateLabels: Record<TemplateId, string> = {
  "university-law": "University (Loyola official)",
  "original-cv": "Original CV Dense",
  harvard: "Harvard Classic",
  modern: "Clean Professional",
  executive: "Executive Serif",
  compact: "Compact One-Page",
}
const RESUME_PAGE_WIDTH = 8.5 * 96
const RESUME_PAGE_HEIGHT = 11 * 96

function matchesCertification(left: ResumeCertification, right: ResumeCertification) {
  return Boolean(
    (left.id && right.id && left.id === right.id) ||
    normalizeCompareText(left.name) === normalizeCompareText(right.name)
  )
}

function getEnteredCertifications(resume: GeneratedResume, profile: GeneratedResume["profile"]) {
  const profileCertifications = Array.isArray(profile.certifications) ? profile.certifications : []
  if (!profileCertifications.length) return []

  const selectedCertifications = Array.isArray(resume.selectedCertifications) ? resume.selectedCertifications : []
  const sourceCertifications = selectedCertifications.length ? selectedCertifications : profileCertifications

  return sourceCertifications.filter((certification) =>
    profileCertifications.some((profileCertification) => matchesCertification(certification, profileCertification))
  )
}

function getEnteredAchievements(resume: GeneratedResume, profile: GeneratedResume["profile"]) {
  const profileAchievements = Array.isArray(profile.achievements) ? profile.achievements : []
  if (!profileAchievements.length) return []

  const selectedAchievements = Array.isArray(resume.selectedAchievements) ? resume.selectedAchievements : []
  const sourceAchievements = selectedAchievements.length ? selectedAchievements : profileAchievements
  const profileAchievementSet = new Set(profileAchievements.map(normalizeCompareText).filter(Boolean))

  return sourceAchievements.filter((achievement) => profileAchievementSet.has(normalizeCompareText(achievement)))
}

function normalizeGeneratedResume(resume: GeneratedResume): GeneratedResume {
  const profile = resume.profile || fallbackResume.profile
  const fallbackProfile = fallbackResume.profile
  const normalizedProfile = {
    ...fallbackProfile,
    ...profile,
    personalInfo: {
      ...fallbackProfile.personalInfo,
      ...profile.personalInfo,
    },
    skills: {
      ...fallbackProfile.skills,
      ...profile.skills,
    },
    education: Array.isArray(profile.education) ? profile.education : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    barAdmission: Array.isArray(profile.barAdmission) ? profile.barAdmission : [],
    barDetails: {
      admissions: profile.barDetails?.admissions || [],
      usBarExams: profile.barDetails?.usBarExams || [],
    },
    workAuthorization: typeof profile.workAuthorization === "string" ? profile.workAuthorization : "",
    workAuthorizationDetails: {
      status: profile.workAuthorizationDetails?.status || "",
      startDate: profile.workAuthorizationDetails?.startDate || "",
      endDate: profile.workAuthorizationDetails?.endDate || "",
      needsSponsorship: profile.workAuthorizationDetails?.needsSponsorship || "",
    },
    additionalInfo: {
      languages: profile.additionalInfo?.languages || [],
      volunteer: profile.additionalInfo?.volunteer || [],
      memberships: profile.additionalInfo?.memberships || [],
      interests: profile.additionalInfo?.interests || [],
    },
  }
  const normalizedResume = {
    ...fallbackResume,
    ...resume,
    profile: normalizedProfile,
    selectedExperience: Array.isArray(resume.selectedExperience) ? resume.selectedExperience : [],
    selectedProjects: Array.isArray(resume.selectedProjects) ? resume.selectedProjects : [],
    selectedCertifications: Array.isArray(resume.selectedCertifications) ? resume.selectedCertifications : [],
    selectedAchievements: Array.isArray(resume.selectedAchievements) ? resume.selectedAchievements : [],
    tailoredSkills: Array.isArray(resume.tailoredSkills) ? resume.tailoredSkills : [],
    matchedKeywords: Array.isArray(resume.matchedKeywords) ? resume.matchedKeywords : [],
    missingKeywords: Array.isArray(resume.missingKeywords) ? resume.missingKeywords : [],
    keywordsAdded: Array.isArray(resume.keywordsAdded) ? resume.keywordsAdded : [],
    changeHighlights: Array.isArray(resume.changeHighlights) ? resume.changeHighlights : [],
    strengths: Array.isArray(resume.strengths) ? resume.strengths : [],
    suggestions: Array.isArray(resume.suggestions) ? resume.suggestions : [],
  }

  return {
    ...normalizedResume,
    selectedCertifications: getEnteredCertifications(normalizedResume, normalizedProfile),
    selectedAchievements: getEnteredAchievements(normalizedResume, normalizedProfile),
  }
}



function createResumeDocxBlob(resumeDocument: ResumeDocument, templateId: TemplateId) {
  const docx = templateStyles[templateId].docx
  return createDocxBlob(documentToDocxBody(resumeDocument, docx), docx)
}

function normalizeCompareText(value: string | undefined) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function isGeneratedText(value: string | undefined, originalValues: string[]) {
  const normalizedValue = normalizeCompareText(value)
  if (!normalizedValue) return false

  return !originalValues.some((originalValue) => normalizeCompareText(originalValue) === normalizedValue)
}

function TwoColumn({ left, right }: { left: ReactNode; right?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-6">
      <span className="min-w-0">{left}</span>
      {right && <span className="whitespace-nowrap shrink-0">{right}</span>}
    </div>
  )
}

// "Activities:", "Languages:" etc. with a hanging value column, as in the sample.
function LabeledRows({ rows }: { rows: LabeledRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.label} className="grid" style={{ gridTemplateColumns: "7.6em minmax(0, 1fr)" }}>
          <span>{row.label}:</span>
          <span>{row.value}</span>
        </div>
      ))}
    </>
  )
}

function LoyolaResume({
  resumeDocument,
  style,
  isBulletGenerated,
}: {
  resumeDocument: ResumeDocument
  style: TemplateStyle
  isBulletGenerated: (experienceId: string, bullet: string) => boolean
}) {
  return (
    <div
      className="text-gray-950"
      style={{ fontFamily: style.fontFamily, fontSize: `${style.fontSize}px`, lineHeight: style.lineHeight }}
    >
      <header className={style.header} style={{ pageBreakInside: "avoid" }}>
        <h1 className={style.name} style={{ fontSize: `${style.nameSize}px`, lineHeight: 1.15, margin: 0 }}>
          {resumeDocument.name}
        </h1>
        {resumeDocument.contact && (
          <p className={style.contact} style={{ margin: "0.2em 0 0 0" }}>{resumeDocument.contact}</p>
        )}
      </header>

      {resumeDocument.sections.map((section) => (
        <section key={section.title} className={style.sectionGap}>
          <h2 className={style.section} style={{ fontSize: `${style.fontSize}px`, margin: "0 0 0.15em 0" }}>
            {section.title}
          </h2>

          {section.kind === "lines" && section.lines.map((line, index) => (
            <p key={index} style={{ margin: 0 }}>{line}</p>
          ))}

          {section.kind === "rows" && <LabeledRows rows={section.rows} />}

          {section.kind === "education" && section.entries.map((entry, index) => (
            <div key={entry.id || index} style={{ marginTop: index ? "0.9em" : 0, pageBreakInside: "avoid" }}>
              <TwoColumn left={<strong>{entry.institution}</strong>} right={entry.location} />
              <TwoColumn left={<em>{entry.degreeLine}</em>} right={entry.date} />
              <LabeledRows rows={entry.rows} />
            </div>
          ))}

          {section.kind === "experience" && section.entries.map((entry, index) => (
            <div key={entry.id || index} style={{ marginTop: index ? "0.9em" : 0, pageBreakInside: "avoid" }}>
              <TwoColumn left={<strong>{entry.company}</strong>} right={entry.location} />
              <TwoColumn left={<em>{entry.position}</em>} right={entry.dates} />
              <ul className="list-disc" style={{ margin: "0.05em 0 0 0", paddingLeft: "3em" }}>
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={bulletIndex}
                    className={cn(isBulletGenerated(entry.id, bullet) && "resume-preview-highlight")}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

export default function ResumePreviewPage() {
  const resumePrintRef = useRef<HTMLDivElement>(null)
  const resumePageRef = useRef<HTMLDivElement>(null)
  const resumeContentRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(100)
  const [fitScale, setFitScale] = useState(1)
  const [containerScale, setContainerScale] = useState(1)

  // Fit the letter-size page to the preview column so it never clips on
  // narrow screens (laptop, tablet, phone). Zoom multiplies on top of this.
  useEffect(() => {
    const node = previewContainerRef.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      setContainerScale(Math.min(1, node.clientWidth / RESUME_PAGE_WIDTH))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const [isEditMode, setIsEditMode] = useState(false)
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume>(fallbackResume)
  // Until the student generates a resume, the preview shows the demo student.
  const [isSampleResume, setIsSampleResume] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(fallbackTemplateId)

  useEffect(() => {
    const savedResume = loadLatestGeneratedResume()
    if (!savedResume) return

    const normalizedResume = normalizeGeneratedResume(savedResume)
    setGeneratedResume(normalizedResume)
    setIsSampleResume(false)
  }, [])

  const profile = generatedResume.profile
  const resumeTemplate = templateStyles[selectedTemplateId]
  const resumeDocument = buildResumeDocument(generatedResume)
  const downloadText = documentToText(resumeDocument)
  const fileBaseName = sanitizeFilename(`${profile.personalInfo.firstName}_${profile.personalInfo.lastName}_resume`) || "resume"
  const screenZoomScale = (zoom / 100) * containerScale
  const isExperienceBulletGenerated = (experienceId: string, bullet: string) => {
    const profileExperience = profile.experience.find((experience) => experience.id === experienceId)
    return isGeneratedText(bullet, profileExperience?.description || [])
  }
  const changeHighlights = generatedResume.changeHighlights?.length
    ? generatedResume.changeHighlights
    : [
        "Formatted in the Loyola Law resume layout.",
        "Reordered and tailored experience bullets for ATS relevance.",
        generatedResume.matchedKeywords.length
          ? `Added or emphasized keywords: ${generatedResume.matchedKeywords.slice(0, 5).join(", ")}.`
          : "",
      ].filter(Boolean)

  useLayoutEffect(() => {
    const updateFitScale = () => {
      const pageNode = resumePageRef.current
      const contentNode = resumeContentRef.current
      if (!pageNode || !contentNode) return

      const computedStyle = window.getComputedStyle(pageNode)
      const availableHeight =
        pageNode.clientHeight -
        Number.parseFloat(computedStyle.paddingTop) -
        Number.parseFloat(computedStyle.paddingBottom)

      if (availableHeight <= 0) {
        setFitScale(1)
        return
      }

      // Scale down when content overflows the page, and up (capped, so type
      // stays a normal size) when content runs short, so the page is filled.
      // Content is laid out at width 100/scale %, so a larger scale narrows the
      // column, text wraps more, and content grows taller. A fixed-point loop
      // can stop on a scale that overflows, so binary-search for the largest
      // scale whose scaled height still fits the page.
      const MAX_FILL_SCALE = 1.18
      const MIN_SCALE = 0.3
      const fits = (scale: number) => {
        contentNode.style.width = `${100 / scale}%`
        return contentNode.scrollHeight * scale <= availableHeight
      }

      let scale = MAX_FILL_SCALE
      if (!fits(MAX_FILL_SCALE)) {
        let low = MIN_SCALE
        let high = MAX_FILL_SCALE
        for (let iteration = 0; iteration < 14; iteration += 1) {
          const mid = (low + high) / 2
          if (fits(mid)) low = mid
          else high = mid
        }
        scale = low
      }

      contentNode.style.width = `${100 / scale}%`
      setFitScale(scale)
    }

    updateFitScale()
    const animationFrame = window.requestAnimationFrame(updateFitScale)
    // Web fonts change line widths; re-fit once they have loaded.
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) updateFitScale()
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
    }
  }, [generatedResume, selectedTemplateId])

  const handleDownloadPDF = async () => {
    const resumeNode = resumePrintRef.current
    if (!resumeNode) {
      toast.error("The preview is not ready yet. Please try again.")
      return
    }

    try {
      toast.loading("Generating PDF...", { id: "resume-pdf" })
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))

      // Preferred path: server renders the exact print HTML to a PDF file.
      const response = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: buildPrintHtml(resumeNode, fileBaseName, { forServer: true }),
          fileName: fileBaseName,
        }),
      })

      if (response.ok) {
        downloadBlob(await response.blob(), `${fileBaseName}.pdf`)
        toast.success("PDF downloaded", { id: "resume-pdf" })
        return
      }

      // Fallback: browser print dialog (works without a local Chrome/Edge).
      const didOpenPrintWindow = openPrintWindow(resumeNode, fileBaseName)
      if (didOpenPrintWindow) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "resume-pdf" })
      }
    } catch (error) {
      console.error("PDF generation failed", error)
      const didOpenPrintWindow = openPrintWindow(resumeNode, fileBaseName)
      if (didOpenPrintWindow) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "resume-pdf" })
      } else {
        toast.error("PDF generation failed. Please try again.", { id: "resume-pdf" })
      }
    }
  }

  const handleDownloadDOCX = () => {
    downloadBlob(createResumeDocxBlob(resumeDocument, selectedTemplateId), `${fileBaseName}.docx`)
    toast.success("DOCX downloaded")
  }

  const handleCopyResume = async () => {
    await navigator.clipboard.writeText(downloadText)
    toast.success("Resume copied to clipboard")
  }

  // Missing keywords the student has confirmed they genuinely have. They are
  // added to the master profile, never invented into the resume text.
  const [selectedMissing, setSelectedMissing] = useState<string[]>([])
  const [confirmSkillsOpen, setConfirmSkillsOpen] = useState(false)
  const toggleMissing = (keyword: string) =>
    setSelectedMissing((current) =>
      current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]
    )
  const handleAddSkills = () => {
    const { added } = addSkillsToMasterProfile(selectedMissing)
    setConfirmSkillsOpen(false)
    setSelectedMissing([])
    toast.success(
      added.length
        ? `Added ${added.length} to your profile. Generate again to include ${added.length === 1 ? "it" : "them"}.`
        : "Those are already in your profile."
    )
  }

  const [coverLetter, setCoverLetter] = useState("")
  const [coverLetterOpen, setCoverLetterOpen] = useState(false)
  const [isWritingCoverLetter, setIsWritingCoverLetter] = useState(false)

  const handleGenerateCoverLetter = async () => {
    setIsWritingCoverLetter(true)
    toast.loading("Writing cover letter...", { id: "cover-letter" })
    try {
      const storedEntries = loadGeneratedResumes()
      const matchingEntry = storedEntries.find((entry) => entry.resume.generatedAt === generatedResume.generatedAt)
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim(),
          candidateEmail: profile.personalInfo.email,
          candidatePhone: profile.personalInfo.phone,
          candidateLocation: profile.personalInfo.location,
          professionalSummary: generatedResume.improvedSummary || generatedResume.summary,
          resumeText: downloadText,
          jobTitle: generatedResume.jobTitle,
          company: generatedResume.company,
          jobDescription: matchingEntry?.jobDescription || storedEntries[0]?.jobDescription || "",
        }),
      })
      const data = (await response.json()) as { coverLetter?: string; error?: string }
      if (!response.ok || !data.coverLetter) {
        throw new Error(data.error || "Cover letter generation failed")
      }
      setCoverLetter(data.coverLetter)
      setCoverLetterOpen(true)
      toast.success("Cover letter ready", { id: "cover-letter" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover letter generation failed", { id: "cover-letter" })
    } finally {
      setIsWritingCoverLetter(false)
    }
  }

  const handleDownloadCoverLetter = () => {
    downloadBlob(new Blob([coverLetter], { type: "text/plain" }), `${fileBaseName}_cover_letter.txt`)
    toast.success("Cover letter downloaded")
  }

  return (
    <AppLayout title="Resume Preview" subtitle="Review and download your generated resume">
      <div className="max-w-7xl mx-auto">
        {isSampleResume && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            <span className="font-semibold">Sample resume:</span> a fictional Loyola J.D. student in the official Loyola Law
            format. Add your details in Profile Knowledge Base, then generate your own in Resume Builder.
          </div>
        )}
        {!isSampleResume && !generatedResume.modelUsed && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <span className="font-semibold">Basic mode:</span> this resume was built by the local generator because the AI
            providers were unavailable. Quality is reduced — go back to the builder and regenerate to retry with AI.
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resume Document Preview */}
          <div className="lg:col-span-2">
            <AnimatedCard hover={false} className="p-4">
              {/* Zoom Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-muted-foreground shrink-0">Template</span>
                  <Select value={selectedTemplateId} onValueChange={(value) => setSelectedTemplateId(value as TemplateId)}>
                    <SelectTrigger size="sm" className="w-56 max-w-full" aria-label="Resume template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(templateLabels) as TemplateId[]).map((templateId) => (
                        <SelectItem key={templateId} value={templateId}>{templateLabels[templateId]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleCopyResume}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.min(150, zoom + 10))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Document */}
              <div ref={previewContainerRef} className="overflow-auto">
              <motion.div
                ref={resumePrintRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="resume-print-root bg-white rounded-lg shadow-lg mx-auto overflow-hidden"
                style={{
                  width: `${RESUME_PAGE_WIDTH * screenZoomScale}px`,
                  height: `${RESUME_PAGE_HEIGHT * screenZoomScale}px`,
                  boxSizing: "border-box",
                  display: "block",
                }}
              >
                <div
                  ref={resumePageRef}
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  className={cn(
                    "resume-print-page",
                    resumeTemplate.body,
                    resumeTemplate.page,
                    isEditMode && "outline outline-2 outline-dashed outline-primary/50 cursor-text"
                  )}
                  style={{
                    width: `${RESUME_PAGE_WIDTH}px`,
                    height: `${RESUME_PAGE_HEIGHT}px`,
                    fontSize: "14px",
                    lineHeight: "1.5",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    transform: `scale(${screenZoomScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    ref={resumeContentRef}
                    className="resume-page-content"
                    style={{
                      width: `${100 / fitScale}%`,
                      transform: `scale(${fitScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                  <LoyolaResume
                    resumeDocument={resumeDocument}
                    style={resumeTemplate}
                    isBulletGenerated={isExperienceBulletGenerated}
                  />
                  </div>
                </div>
              </motion.div>
              </div>
            </AnimatedCard>
          </div>

          {/* Right Panel - ATS Insights */}
          <div className="space-y-4">
            {/* ATS Score */}
            <AnimatedCard delay={0.1}>
              <div className="flex flex-col items-center text-center">
                <AtsScoreCircle score={generatedResume.atsScore} size="lg" />
                <p className="text-sm text-muted-foreground mt-3">
                  {atsScoreMessage(generatedResume.atsScore)}
                </p>
              </div>
            </AnimatedCard>

            {/* Matched Keywords */}
            <AnimatedCard delay={0.2}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
                Matched Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {generatedResume.matchedKeywords.map((keyword, index) => (
                  <motion.div
                    key={keyword}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Badge className="bg-[#10b981]/10 text-[#10b981]">{keyword}</Badge>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>

            {/* Keywords Missing From Profile */}
            <AnimatedCard delay={0.3}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-[#f59e0b]" />
                Missing From Profile
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Keywords in the job description that your profile does not mention. Add only the ones that are genuinely true of you.
              </p>
              <div className="flex flex-wrap gap-2">
                {generatedResume.missingKeywords.map((keyword, index) => (
                  <motion.div
                    key={keyword}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <button type="button" onClick={() => toggleMissing(keyword)} aria-pressed={selectedMissing.includes(keyword)}>
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
                  </motion.div>
                ))}
              </div>
              {selectedMissing.length > 0 && (
                <Button size="sm" className="w-full mt-3 gap-2" onClick={() => setConfirmSkillsOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add {selectedMissing.length} to my profile
                </Button>
              )}
            </AnimatedCard>

            {/* What Changed */}
            <AnimatedCard delay={0.4}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Edit className="h-5 w-5 text-[#4f46e5]" />
                What Changed
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Yellow highlights show text generated or modified by the resume API for preview only.
              </p>
              <ul className="space-y-2">
                {changeHighlights.map((change, index) => (
                  <motion.li
                    key={`${change}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.08 }}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#4f46e5] mt-0.5 shrink-0" />
                    {change}
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>

            {/* Strengths */}
            <AnimatedCard delay={0.5}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-[#4f46e5]" />
                Match Summary
              </h3>
              <p className="text-sm text-foreground">{generatedResume.matchSummary}</p>
            </AnimatedCard>

            {/* Suggestions */}
            <AnimatedCard delay={0.6}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-[#f59e0b]" />
                Improvement Suggestions
              </h3>
              <ul className="space-y-2">
                {generatedResume.suggestions.map((suggestion, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <AlertCircle className="h-4 w-4 text-[#f59e0b] mt-0.5 shrink-0" />
                    {suggestion}
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full gap-2" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleDownloadDOCX}>
                <FileText className="h-4 w-4" />
                Export DOCX
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleCopyResume}>
                <Copy className="h-4 w-4" />
                Copy Resume
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGenerateCoverLetter}
                disabled={isWritingCoverLetter}
              >
                {isWritingCoverLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isWritingCoverLetter ? "Writing..." : "Generate Cover Letter"}
              </Button>
              <Button
                variant={isEditMode ? "default" : "outline"}
                className="w-full gap-2"
                onClick={() => {
                  const next = !isEditMode
                  setIsEditMode(next)
                  if (next) {
                    toast.info("Edit mode on — click any text in the preview to edit it. Edits are included in the PDF download.", { duration: 6000 })
                  } else {
                    toast.success("Edit mode off")
                  }
                }}
              >
                <Edit className="h-4 w-4" />
                {isEditMode ? "Done Editing" : "Edit Resume"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={confirmSkillsOpen} onOpenChange={setConfirmSkillsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Only add what is true</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            These go into your profile as your own skills, and future resumes may list them. Add them only if you genuinely
            have this experience — employers ask about anything on your resume.
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

      <Dialog open={coverLetterOpen} onOpenChange={setCoverLetterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cover Letter</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground">
            {coverLetter}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(coverLetter)
                toast.success("Cover letter copied")
              }}
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button className="gap-2" onClick={handleDownloadCoverLetter}>
              <Download className="h-4 w-4" />
              Download .txt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
