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
  ExternalLink,
  Copy,
  Mail,
  Loader2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AtsScoreCircle } from "@/components/ui/ats-score-circle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockProfile } from "@/lib/data"
import { GeneratedResume, generateResumeFromJob } from "@/lib/resume-generator"
import { loadGeneratedResumes, loadLatestGeneratedResume } from "@/lib/profile-storage"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const fallbackResume = generateResumeFromJob({
  profile: mockProfile,
  jobDescription: "Data Analyst role requiring Python, SQL, dashboards, data visualization, stakeholder management, and business intelligence.",
  template: "modern",
  tone: "professional",
  experienceLevel: "mid",
  length: "medium",
})

const UNIVERSITY_LAW_FONT_FAMILY = 'Calibri, "Carlito", Arial, sans-serif'
const ORIGINAL_CV_FONT_FAMILY = '"Times New Roman", Times, serif'

const templateStyles = {
  "original-cv": {
    body: "",
    header: "text-center mb-2",
    name: "font-bold text-gray-950 tracking-wide",
    contact: "text-gray-800",
    section: "text-gray-700 uppercase border-b border-gray-600",
    itemTitle: "font-bold text-gray-950",
  },
  "university-law": {
    body: "",
    header: "text-center mb-4",
    name: "font-bold text-gray-950 uppercase",
    contact: "text-gray-700",
    section: "text-gray-950 uppercase underline underline-offset-2",
    itemTitle: "font-bold text-gray-950",
  },
  harvard: {
    body: "font-serif",
    header: "text-center border-b-2 border-gray-900 pb-3 mb-3",
    name: "font-bold text-gray-950",
    contact: "text-gray-700",
    section: "text-gray-950 uppercase tracking-wider border-b border-gray-900",
    itemTitle: "font-bold text-gray-950",
  },
  modern: {
    body: "font-sans",
    header: "text-left border-t-4 border-gray-900 pt-4 pb-3 mb-3",
    name: "font-bold text-gray-950",
    contact: "text-gray-600",
    section: "text-gray-950 uppercase tracking-wide border-b border-gray-400",
    itemTitle: "font-semibold text-gray-950",
  },
  executive: {
    body: "font-serif",
    header: "text-center border-y-2 border-gray-800 py-5 mb-4",
    name: "font-bold text-gray-950 tracking-wide",
    contact: "text-gray-700",
    section: "text-gray-950 uppercase tracking-[0.16em] border-b border-gray-400",
    itemTitle: "font-bold text-gray-950",
  },
  compact: {
    body: "font-sans",
    header: "text-left border-b border-gray-300 pb-2 mb-2",
    name: "font-bold text-gray-950",
    contact: "text-gray-600",
    section: "text-gray-950 uppercase tracking-wide border-b border-gray-300",
    itemTitle: "font-semibold text-gray-950",
  },
} as const

type TemplateId = keyof typeof templateStyles
type ResumeProject = GeneratedResume["selectedProjects"][number]
type ResumeCertification = GeneratedResume["selectedCertifications"][number]

const fallbackTemplateId: TemplateId = "modern"
const RESUME_PAGE_WIDTH = 8.5 * 96
const RESUME_PAGE_HEIGHT = 11 * 96

function getTemplateId(value: string | undefined): TemplateId {
  return value && value in templateStyles ? (value as TemplateId) : fallbackTemplateId
}

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

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildResumePrintHtml(resumeNode: HTMLElement, fileBaseName: string, options?: { forServer?: boolean }) {
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n")
  const clonedResume = resumeNode.cloneNode(true) as HTMLElement

  clonedResume.classList.remove("shadow-lg", "rounded-lg")
  clonedResume.style.width = "8.5in"
  clonedResume.style.height = "11in"
  clonedResume.style.maxWidth = "none"
  clonedResume.style.margin = "0 auto"
  clonedResume.style.boxShadow = "none"
  clonedResume.style.borderRadius = "0"
  clonedResume.style.overflow = "hidden"

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
    ${clonedResume.outerHTML}
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

function openResumePrintWindow(resumeNode: HTMLElement, fileBaseName: string) {
  const printWindow = window.open("", "_blank", "width=980,height=1200")

  if (!printWindow) {
    toast.error("Please allow popups to export the PDF.")
    return false
  }

  printWindow.document.open()
  printWindow.document.write(buildResumePrintHtml(resumeNode, fileBaseName))
  printWindow.document.close()
  return true
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let crc = index
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[index] = crc >>> 0
  }
  return table
}

const crcTable = makeCrcTable()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff)
}

function writeUint32(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff)
}

function createZipBlob(files: { name: string; content: string }[]) {
  const encoder = new TextEncoder()
  const output: number[] = []
  const centralDirectory: number[] = []

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const contentBytes = encoder.encode(file.content)
    const checksum = crc32(contentBytes)
    const localHeaderOffset = output.length

    writeUint32(output, 0x04034b50)
    writeUint16(output, 20)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint32(output, checksum)
    writeUint32(output, contentBytes.length)
    writeUint32(output, contentBytes.length)
    writeUint16(output, nameBytes.length)
    writeUint16(output, 0)
    output.push(...nameBytes, ...contentBytes)

    writeUint32(centralDirectory, 0x02014b50)
    writeUint16(centralDirectory, 20)
    writeUint16(centralDirectory, 20)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint32(centralDirectory, checksum)
    writeUint32(centralDirectory, contentBytes.length)
    writeUint32(centralDirectory, contentBytes.length)
    writeUint16(centralDirectory, nameBytes.length)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint32(centralDirectory, 0)
    writeUint32(centralDirectory, localHeaderOffset)
    centralDirectory.push(...nameBytes)
  }

  const centralDirectoryOffset = output.length
  output.push(...centralDirectory)
  writeUint32(output, 0x06054b50)
  writeUint16(output, 0)
  writeUint16(output, 0)
  writeUint16(output, files.length)
  writeUint16(output, files.length)
  writeUint32(output, centralDirectory.length)
  writeUint32(output, centralDirectoryOffset)
  writeUint16(output, 0)

  return new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
}

function getDocxConfig(templateId: TemplateId) {
  if (templateId === "university-law") {
    return {
      font: "Calibri",
      bodySize: 18,
      nameSize: 26,
      headingSize: 20,
      line: 188,
      margin: 540,
      tabPosition: 10100,
    }
  }

  if (templateId === "original-cv") {
    return {
      font: "Times New Roman",
      bodySize: 20,
      nameSize: 40,
      headingSize: 23,
      line: 205,
      margin: 540,
      tabPosition: 9720,
    }
  }

  return {
    font: "Arial",
    bodySize: 20,
    nameSize: 32,
    headingSize: 22,
    line: 220,
    margin: 720,
    tabPosition: 9360,
  }
}

function getDocxParagraph(line: string, templateId: TemplateId, lineIndex: number) {
  const trimmed = line.trim()
  const isUniversityLaw = templateId === "university-law"
  const isOriginalCv = templateId === "original-cv"
  const docxConfig = getDocxConfig(templateId)
  const isName = (
    isUniversityLaw && lineIndex === 0 && /^[A-Z][A-Z\s.'-]+$/.test(trimmed) && trimmed.length > 2
  ) || (
    isOriginalCv && lineIndex === 0 && trimmed.includes(", M.SC.")
  )
  const isContactLine = !isName && lineIndex <= 2 && (
    trimmed.includes("@") ||
    trimmed.startsWith("http") ||
    trimmed.includes("linkedin.com") ||
    trimmed.includes("github.com") ||
    trimmed.includes(" | ")
  )
  const isHeading = /^[A-Z][A-Z\s&]+$/.test(trimmed) && trimmed.length > 2
  const isBullet = trimmed.startsWith("- ")
  const isProjectToolLine = trimmed.startsWith("Tools:")
  const paragraphSpacingAfter = isHeading ? 18 : isName ? 10 : 4
  const paragraphSpacingBefore = isHeading ? 45 : 0
  const paragraphProps = [
    `<w:spacing w:before="${paragraphSpacingBefore}" w:after="${paragraphSpacingAfter}" w:line="${docxConfig.line}" w:lineRule="auto"/>`,
    isName ? '<w:jc w:val="center"/>' : "",
    isContactLine && (isUniversityLaw || isOriginalCv) ? '<w:jc w:val="center"/>' : "",
    isUniversityLaw && line.includes("\t") ? `<w:tabs><w:tab w:val="right" w:pos="${docxConfig.tabPosition}"/></w:tabs>` : "",
    isOriginalCv && line.includes("\t") ? `<w:tabs><w:tab w:val="right" w:pos="${docxConfig.tabPosition}"/></w:tabs>` : "",
    isBullet ? '<w:ind w:left="360" w:hanging="240"/>' : "",
  ].join("")
  const runProps = [
    `<w:sz w:val="${isName ? docxConfig.nameSize : isHeading ? docxConfig.headingSize : isContactLine || isProjectToolLine ? docxConfig.bodySize - 1 : docxConfig.bodySize}"/><w:szCs w:val="${isName ? docxConfig.nameSize : isHeading ? docxConfig.headingSize : isContactLine || isProjectToolLine ? docxConfig.bodySize - 1 : docxConfig.bodySize}"/>`,
    isName ? "<w:b/>" : "",
    isHeading ? "<w:b/><w:u w:val=\"single\"/>" : "",
    isProjectToolLine ? "<w:i/>" : "",
  ].join("")
  const bulletText = isBullet ? `• ${trimmed.slice(2)}` : line
  const textRuns = bulletText.split("\t").map((part, index) => (
    `${index > 0 ? "<w:tab/>" : ""}<w:t xml:space="preserve">${escapeXml(part)}</w:t>`
  )).join("")

  return `<w:p><w:pPr>${paragraphProps}</w:pPr><w:r><w:rPr>${runProps}</w:rPr>${textRuns}</w:r></w:p>`
}

function createDocxBlob(text: string, templateId: TemplateId) {
  const paragraphs = text.split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
    return getDocxParagraph(line, templateId, index)
  }).join("")
  const docxConfig = getDocxConfig(templateId)
  const margins = `<w:pgMar w:top="${docxConfig.margin}" w:right="${docxConfig.margin}" w:bottom="${docxConfig.margin}" w:left="${docxConfig.margin}" w:header="0" w:footer="0" w:gutter="0"/>`

  return createZipBlob([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>${margins}<w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`,
    },
    {
      name: "word/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${docxConfig.font}" w:hAnsi="${docxConfig.font}" w:cs="${docxConfig.font}"/><w:sz w:val="${docxConfig.bodySize}"/><w:szCs w:val="${docxConfig.bodySize}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${docxConfig.line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`,
    },
  ])
}

function mergeProjectsForFullPage(projects: ResumeProject[], profileProjects: ResumeProject[], hasSupplementalSections: boolean) {
  const merged = [...projects]
  const projectLimit = hasSupplementalSections ? 3 : 4
  const highlightLimit = hasSupplementalSections ? 4 : 5

  for (const project of profileProjects) {
    const alreadyAdded = merged.some((item) => item.id === project.id || item.name === project.name)
    if (!alreadyAdded) merged.push(project)
    if (merged.length >= projectLimit) break
  }

  return merged.slice(0, projectLimit).map((project) => {
    const profileProject = profileProjects.find((item) => item.id === project.id || item.name === project.name)
    const highlights = project.highlights?.length ? project.highlights : profileProject?.highlights || []
    const fallbackHighlights = [
      project.description,
      profileProject?.description,
      "Organized project outputs into clear workflows, dashboards, or reports for practical review",
      "Tested results for consistency, readability, and alignment with user or business requirements",
    ].filter((item): item is string => Boolean(item?.trim()))

    return {
      ...profileProject,
      ...project,
      technologies: project.technologies?.length ? project.technologies : profileProject?.technologies || [],
      highlights: Array.from(new Set([...highlights, ...fallbackHighlights])).slice(0, highlightLimit),
    }
  })
}

function normalizeCompareText(value: string | undefined) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function isGeneratedText(value: string | undefined, originalValues: string[]) {
  const normalizedValue = normalizeCompareText(value)
  if (!normalizedValue) return false

  return !originalValues.some((originalValue) => normalizeCompareText(originalValue) === normalizedValue)
}

function getProfileSkills(profile: GeneratedResume["profile"]) {
  return new Set(
    Object.values(profile.skills)
      .flat()
      .map((skill) => normalizeCompareText(skill))
      .filter(Boolean)
  )
}

function buildDownloadText({
  generatedResume,
  tailoredSkills,
  displayProjects,
}: {
  generatedResume: GeneratedResume
  tailoredSkills: string[]
  displayProjects: ResumeProject[]
}) {
  const profile = generatedResume.profile
  const certificationLines = generatedResume.selectedCertifications.map(formatCertification)
  const achievementLines = generatedResume.selectedAchievements.map((achievement) => `- ${achievement}`)

  return [
    `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`,
    `${profile.personalInfo.email} | ${profile.personalInfo.phone} | ${profile.personalInfo.location}`,
    [profile.personalInfo.linkedin, profile.personalInfo.github].filter(Boolean).join(" | "),
    "",
    "PROFESSIONAL SUMMARY",
    generatedResume.improvedSummary || generatedResume.summary,
    "",
    "TECHNICAL SKILLS",
    `Relevant Skills: ${tailoredSkills.join(", ")}`,
    "",
    "PROFESSIONAL EXPERIENCE",
    ...generatedResume.selectedExperience.flatMap((exp) => [
      `${exp.position} | ${exp.company}, ${exp.location} | ${exp.startDate} - ${exp.endDate}`,
      ...exp.description.map((bullet) => `- ${bullet}`),
      "",
    ]),
    "PROJECTS",
    ...displayProjects.flatMap((project) => [
      `${project.name} | ${project.technologies.slice(0, 8).join(", ")}`,
      ...project.highlights.map((highlight) => `- ${highlight}`),
      "",
    ]),
    "EDUCATION",
    ...profile.education.flatMap((edu) => [
      `${edu.degree} in ${edu.field} | ${edu.institution} | ${edu.endDate}`,
      edu.gpa ? `GPA: ${edu.gpa}` : "",
    ]),
    certificationLines.length ? "" : undefined,
    certificationLines.length ? "CERTIFICATIONS" : undefined,
    ...certificationLines,
    achievementLines.length ? "" : undefined,
    achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
    ...achievementLines,
  ].filter((line) => line !== undefined).join("\n").trim()
}

function buildUniversityLawDownloadText({
  generatedResume,
  tailoredSkills,
  displayProjects,
}: {
  generatedResume: GeneratedResume
  tailoredSkills: string[]
  displayProjects: ResumeProject[]
}) {
  const profile = generatedResume.profile
  const contact = [
    profile.personalInfo.location,
    profile.personalInfo.phone,
    profile.personalInfo.email,
  ].filter(Boolean).join(" | ")
  const links = [
    profile.personalInfo.linkedin,
    profile.personalInfo.github,
  ].filter(Boolean).join(" | ")
  const certificationLines = generatedResume.selectedCertifications.map(formatCertification)
  const achievementLines = generatedResume.selectedAchievements.map((achievement) => `- ${achievement}`)
  const hasSupplementalSections = certificationLines.length > 0 || achievementLines.length > 0
  const primaryExperience = generatedResume.selectedExperience.slice(0, 2)
  const primaryProjects = displayProjects.slice(0, hasSupplementalSections ? 2 : 3)
  const docxSkills = tailoredSkills.slice(0, hasSupplementalSections ? 22 : 28)
  const compactSummary = compactDocxSummary(generatedResume.improvedSummary || generatedResume.summary)

  return [
    `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.toUpperCase(),
    contact,
    links,
    "",
    "PROFILE",
    compactSummary,
    "",
    "EDUCATION",
    ...profile.education.flatMap((edu) => [
      `${edu.institution}\t${edu.endDate}`,
      `${edu.degree} in ${edu.field}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`,
    ]),
    "EXPERIENCE",
    ...primaryExperience.flatMap((exp) => [
      `${exp.company}\t${exp.location}`,
      `${exp.position}\t${exp.startDate} - ${exp.endDate}`,
      ...exp.description.slice(0, 6).map((bullet) => `- ${bullet}`),
    ]),
    primaryProjects.length ? "PROJECTS" : "",
    ...primaryProjects.flatMap((project) => [
      `${project.name}\t${project.technologies.slice(0, 8).join(", ")}`,
      ...project.highlights.slice(0, hasSupplementalSections ? 3 : 5).map((highlight) => `- ${highlight}`),
    ]),
    "TECHNICAL SKILLS",
    docxSkills.join(", "),
    certificationLines.length ? "" : undefined,
    certificationLines.length ? "CERTIFICATIONS" : undefined,
    ...certificationLines,
    achievementLines.length ? "" : undefined,
    achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
    ...achievementLines,
  ].filter((line) => line !== undefined).join("\n").trim()
}

function compactDocxSummary(value: string) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const compact = sentences.slice(0, 2).join(" ")
  if (compact.length <= 420) return compact
  return `${compact.slice(0, 417).trim()}...`
}

function buildOriginalCvDownloadText({
  generatedResume,
  tailoredSkills,
  displayProjects,
}: {
  generatedResume: GeneratedResume
  tailoredSkills: string[]
  displayProjects: ResumeProject[]
}) {
  const profile = generatedResume.profile
  const expertiseOptions = [
    "Business Systems Analysis",
    "Python & SQL Programming",
    "Project Management",
    "Data Analysis & Reporting",
    "Database Management",
    "Technical Documentation",
    "Data Visualization",
    "Cross-Functional Collaboration",
    "Process Improvement",
    "Stakeholder Communication",
    "Requirements Gathering",
    ...tailoredSkills.slice(0, 8),
  ]
  const certificationLines = generatedResume.selectedCertifications.map(formatCertification)
  const achievementLines = generatedResume.selectedAchievements.map((achievement) => `- ${achievement}`)
  const hasSupplementalSections = certificationLines.length > 0 || achievementLines.length > 0
  const expertise = expertiseOptions
    .filter((item, index, values) => values.findIndex((value) => normalizeCompareText(value) === normalizeCompareText(item)) === index)
    .slice(0, hasSupplementalSections ? 15 : 18)
  const projects = displayProjects.slice(0, hasSupplementalSections ? 3 : 4)

  return [
    `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}, M.SC.`,
    `${generatedResume.jobTitle !== "Target Role" ? generatedResume.jobTitle : "Business Analyst"} | Data Specialist | Data Analyst`,
    `${profile.personalInfo.phone} | ${profile.personalInfo.location} | ${profile.personalInfo.email} | ${profile.personalInfo.linkedin}`,
    "",
    "PROFESSIONAL SUMMARY",
    generatedResume.improvedSummary || generatedResume.summary,
    "",
    "AREAS OF EXPERTISE",
    ...expertise.map((skill) => `- ${skill}`),
    "",
    "PROFESSIONAL EXPERIENCE",
    ...generatedResume.selectedExperience.flatMap((exp) => [
      `${exp.position}\t${exp.company}, ${exp.location}\t${exp.startDate} - ${exp.endDate}`,
      ...exp.description.slice(0, 8).map((bullet) => `- ${bullet}`),
      "",
    ]),
    "PROJECTS",
    ...projects.flatMap((project) => [
      project.name,
      `Tools: ${project.technologies.slice(0, 10).join(", ")}.`,
      ...project.highlights.slice(0, hasSupplementalSections && projects.length > 1 ? 3 : 5).map((highlight) => `- ${highlight}`),
      "",
    ]),
    "EDUCATION",
    ...profile.education.map((edu) => `${edu.degree} in ${edu.field}, ${edu.institution}${edu.gpa ? ` [${edu.gpa} GPA]` : ""}`),
    "",
    "TECHNICAL SKILLS",
    `Programming Languages: ${profile.skills.programming.join(", ")}`,
    `Business Intelligence: ${[...profile.skills.visualization, "MS Excel"].join(", ")}`,
    `Data & Machine Learning: ${profile.skills.dataAnalysis.join(", ")}`,
    `Databases & Tools: ${[...profile.skills.databases, ...profile.skills.tools].join(", ")}`,
    certificationLines.length ? "" : undefined,
    certificationLines.length ? "CERTIFICATIONS" : undefined,
    ...certificationLines,
    achievementLines.length ? "" : undefined,
    achievementLines.length ? "HONORS & ACHIEVEMENTS" : undefined,
    ...achievementLines,
  ].filter((line) => line !== undefined).join("\n").trim()
}

function formatCertification(cert: ResumeCertification) {
  return [
    cert.name,
    cert.issuer,
    cert.date,
    cert.credentialId ? `Credential ID: ${cert.credentialId}` : "",
  ].filter(Boolean).join(" | ")
}

function UniversitySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-2.5" style={{ pageBreakInside: "avoid" }}>
      <h2
        className="font-bold uppercase underline underline-offset-2 text-gray-950"
        style={{ fontSize: "11.2px", margin: "0 0 0.24em 0" }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function UniversityLawResume({
  generatedResume,
  tailoredSkills,
  displayProjects,
  isSummaryGenerated,
  isSkillGenerated,
  isExperienceBulletGenerated,
  isProjectHighlightGenerated,
}: {
  generatedResume: GeneratedResume
  tailoredSkills: string[]
  displayProjects: ResumeProject[]
  isSummaryGenerated: boolean
  isSkillGenerated: (skill: string) => boolean
  isExperienceBulletGenerated: (experienceId: string, bullet: string) => boolean
  isProjectHighlightGenerated: (projectId: string, projectName: string, highlight: string) => boolean
}) {
  const profile = generatedResume.profile
  const hasSupplementalSections = generatedResume.selectedCertifications.length > 0 || generatedResume.selectedAchievements.length > 0
  const contact = [
    profile.personalInfo.location,
    profile.personalInfo.phone,
    profile.personalInfo.email,
  ].filter(Boolean).join(" | ")
  const links = [
    profile.personalInfo.linkedin,
    profile.personalInfo.github,
  ].filter(Boolean).join(" | ")

  return (
    <div
      className="text-gray-950"
      style={{ fontFamily: UNIVERSITY_LAW_FONT_FAMILY, fontSize: "10.95px", lineHeight: 1.24 }}
    >
      <header className="text-center mb-3.5" style={{ pageBreakInside: "avoid" }}>
        <h1 className="font-bold uppercase" style={{ fontSize: "14px", margin: 0 }}>
          {profile.personalInfo.firstName} {profile.personalInfo.lastName}
        </h1>
        <p className="text-gray-700" style={{ margin: "0.2em 0 0 0" }}>{contact}</p>
        {links && <p className="text-gray-700" style={{ margin: "0.1em 0 0 0" }}>{links}</p>}
      </header>

      <UniversitySection title="Profile">
        <p
          className={cn("text-gray-800", isSummaryGenerated && "resume-preview-highlight")}
          style={{ margin: 0 }}
        >
          {generatedResume.improvedSummary || generatedResume.summary}
        </p>
      </UniversitySection>

      <UniversitySection title="Education">
        {profile.education.map((edu) => (
          <div key={edu.id} className="mb-2" style={{ pageBreakInside: "avoid" }}>
            <div className="flex justify-between gap-4 font-bold">
              <span>{edu.institution}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="italic">{edu.degree} in {edu.field}</span>
              <span className="whitespace-nowrap">{edu.endDate}</span>
            </div>
            {edu.gpa && <p style={{ margin: "0.1em 0 0 0" }}>GPA: {edu.gpa}</p>}
          </div>
        ))}
      </UniversitySection>

      <UniversitySection title="Experience">
        {generatedResume.selectedExperience.map((exp) => (
          <div key={exp.id} className="mb-2" style={{ pageBreakInside: "avoid" }}>
            <div className="flex justify-between gap-4 font-bold">
              <span>{exp.company}</span>
              <span className="whitespace-nowrap font-normal">{exp.location}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="italic">{exp.position}</span>
              <span className="whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
            </div>
            <ul className="list-disc pl-5 text-gray-800" style={{ margin: "0.15em 0 0 0" }}>
              {exp.description.slice(0, 8).map((bullet, index) => (
                <li
                  key={index}
                  className={cn(isExperienceBulletGenerated(exp.id, bullet) && "resume-preview-highlight")}
                  style={{ margin: "0.075em 0" }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </UniversitySection>

      {displayProjects.length > 0 && (
        <UniversitySection title="Projects">
          {displayProjects.slice(0, 4).map((project) => (
            <div key={project.id || project.name} className="mb-2" style={{ pageBreakInside: "avoid" }}>
              <div className="flex justify-between gap-4 font-bold">
                <span>{project.name}</span>
                <span className="text-right font-normal">{project.technologies.slice(0, 8).join(", ")}</span>
              </div>
              {project.description && (
                <p className="text-gray-800" style={{ margin: "0.08em 0 0 0" }}>
                  {project.description}
                </p>
              )}
              <ul className="list-disc pl-5 text-gray-800" style={{ margin: "0.15em 0 0 0" }}>
                {project.highlights.slice(0, hasSupplementalSections && displayProjects.length > 2 ? 3 : 5).map((highlight, index) => (
                  <li
                    key={index}
                    className={cn(isProjectHighlightGenerated(project.id, project.name, highlight) && "resume-preview-highlight")}
                    style={{ margin: "0.07em 0" }}
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </UniversitySection>
      )}

      <UniversitySection title="Technical Skills">
        <p style={{ margin: 0 }}>
          {tailoredSkills.map((skill, index) => (
            <span key={`${skill}-${index}`}>
              <span className={cn(isSkillGenerated(skill) && "resume-preview-highlight")}>{skill}</span>
              {index < tailoredSkills.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </UniversitySection>

      {generatedResume.selectedCertifications.length > 0 && (
        <UniversitySection title="Certifications">
          {generatedResume.selectedCertifications.map((cert) => (
            <p key={cert.id || cert.name} style={{ margin: "0.05em 0" }}>
              {formatCertification(cert)}
            </p>
          ))}
        </UniversitySection>
      )}

      {generatedResume.selectedAchievements.length > 0 && (
        <UniversitySection title="Honors & Achievements">
          <ul className="list-disc pl-5 text-gray-800" style={{ margin: "0.12em 0 0 0" }}>
            {generatedResume.selectedAchievements.map((achievement) => (
              <li key={achievement} style={{ margin: "0.06em 0" }}>{achievement}</li>
            ))}
          </ul>
        </UniversitySection>
      )}
    </div>
  )
}

function DenseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-1.5" style={{ pageBreakInside: "avoid" }}>
      <h2
        className="uppercase text-gray-700 border-b border-gray-600"
        style={{ fontSize: "12px", lineHeight: 1.1, margin: "0 0 0.18em 0" }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function OriginalCvResume({
  generatedResume,
  tailoredSkills,
  displayProjects,
  isSummaryGenerated,
  isSkillGenerated,
  isExperienceBulletGenerated,
  isProjectHighlightGenerated,
}: {
  generatedResume: GeneratedResume
  tailoredSkills: string[]
  displayProjects: ResumeProject[]
  isSummaryGenerated: boolean
  isSkillGenerated: (skill: string) => boolean
  isExperienceBulletGenerated: (experienceId: string, bullet: string) => boolean
  isProjectHighlightGenerated: (projectId: string, projectName: string, highlight: string) => boolean
}) {
  const profile = generatedResume.profile
  const hasSupplementalSections = generatedResume.selectedCertifications.length > 0 || generatedResume.selectedAchievements.length > 0
  const expertise = [
    "Business Systems Analysis",
    "Python & SQL Programming",
    "Project Management",
    "Data Analysis & Reporting",
    "Database Management",
    "Technical Documentation",
    "Data Visualization",
    "Cross-Functional Collaboration",
    "Process Improvement",
    "Stakeholder Communication",
    "Requirements Gathering",
    ...tailoredSkills.slice(0, 8),
  ].filter((item, index, values) => values.findIndex((value) => normalizeCompareText(value) === normalizeCompareText(item)) === index).slice(0, hasSupplementalSections ? 15 : 18)
  const projects = displayProjects.slice(0, hasSupplementalSections ? 3 : 4)

  return (
    <div
      className="text-gray-950"
      style={{ fontFamily: ORIGINAL_CV_FONT_FAMILY, fontSize: "10.9px", lineHeight: 1.16 }}
    >
      <header className="text-center mb-2" style={{ pageBreakInside: "avoid" }}>
        <h1 className="font-bold tracking-wide" style={{ fontSize: "20px", lineHeight: 1, margin: 0 }}>
          {profile.personalInfo.firstName} {profile.personalInfo.lastName}, M.SC.
        </h1>
        <p className="text-gray-600" style={{ fontSize: "13px", margin: "0.15em 0 0 0" }}>
          {generatedResume.jobTitle !== "Target Role" ? generatedResume.jobTitle : "Business Analyst"} | Data Specialist | Data Analyst
        </p>
        <p className="text-gray-900" style={{ fontSize: "10.5px", margin: "0.2em 0 0 0" }}>
          {profile.personalInfo.phone} | {profile.personalInfo.location} | {profile.personalInfo.email} | {profile.personalInfo.linkedin}
        </p>
      </header>

      <DenseSection title="Professional Summary">
        <p
          className={cn("text-gray-900", isSummaryGenerated && "resume-preview-highlight")}
          style={{ margin: 0 }}
        >
          {generatedResume.improvedSummary || generatedResume.summary}
        </p>
      </DenseSection>

      <DenseSection title="Areas of Expertise">
        <ul
          className="grid grid-cols-3 gap-x-5 list-disc text-gray-950"
          style={{ margin: "0 0 0 1.4em", padding: 0 }}
        >
          {expertise.map((skill) => (
            <li key={skill} className={cn(isSkillGenerated(skill) && "resume-preview-highlight")} style={{ margin: "0.04em 0" }}>
              {skill}
            </li>
          ))}
        </ul>
      </DenseSection>

      <DenseSection title="Professional Experience">
        {generatedResume.selectedExperience.map((exp) => (
          <div key={exp.id} className="mb-1.5" style={{ pageBreakInside: "avoid" }}>
            <div style={{ fontSize: "12.2px", lineHeight: 1.1 }}>
              <span className="font-bold">{exp.position}</span>
              <span>|{exp.company}, {exp.location} </span>
              <span className="text-gray-600">{exp.startDate} - {exp.endDate}</span>
            </div>
            <ul className="list-disc pl-6 text-gray-900" style={{ margin: "0.16em 0 0 0" }}>
              {exp.description.slice(0, 8).map((bullet, index) => (
                <li
                  key={index}
                  className={cn(isExperienceBulletGenerated(exp.id, bullet) && "resume-preview-highlight")}
                  style={{ margin: "0.06em 0" }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DenseSection>

      {projects.length > 0 && (
        <DenseSection title="Projects">
          {projects.map((project) => (
            <div key={project.id || project.name} className="mb-1" style={{ pageBreakInside: "avoid" }}>
              <p className="font-bold" style={{ fontSize: "11.8px", margin: 0 }}>{project.name}</p>
              <p style={{ margin: "0.04em 0 0 0" }}>
                Tools: {project.technologies.slice(0, 10).join(", ")}.
              </p>
              <ul className="list-disc pl-6 text-gray-900" style={{ margin: "0.1em 0 0 0" }}>
                {project.highlights.slice(0, hasSupplementalSections && projects.length > 1 ? 3 : 5).map((highlight, index) => (
                  <li
                    key={index}
                    className={cn(isProjectHighlightGenerated(project.id, project.name, highlight) && "resume-preview-highlight")}
                    style={{ margin: "0.04em 0" }}
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </DenseSection>
      )}

      <DenseSection title="Education">
        {profile.education.map((edu) => (
          <p key={edu.id} style={{ margin: "0.05em 0" }}>
            <strong>{edu.degree} in {edu.field}</strong>, {edu.institution}{edu.gpa ? ` [${edu.gpa} GPA]` : ""}
          </p>
        ))}
      </DenseSection>

      <DenseSection title="Technical Skills">
        <p style={{ margin: "0.04em 0" }}>
          <strong>Programming Languages:</strong> {profile.skills.programming.join(", ")}
        </p>
        <p style={{ margin: "0.04em 0" }}>
          <strong>Business Intelligence:</strong> {[...profile.skills.visualization, "MS Excel"].join(", ")}
        </p>
        <p style={{ margin: "0.04em 0" }}>
          <strong>Data & Machine Learning:</strong> {profile.skills.dataAnalysis.join(", ")}
        </p>
        <p style={{ margin: "0.04em 0" }}>
          <strong>Databases & Tools:</strong> {[...profile.skills.databases, ...profile.skills.tools].join(", ")}
        </p>
      </DenseSection>

      {generatedResume.selectedCertifications.length > 0 && (
        <DenseSection title="Certifications">
          {generatedResume.selectedCertifications.map((cert) => (
            <p key={cert.id || cert.name} style={{ margin: "0.04em 0" }}>
              {formatCertification(cert)}
            </p>
          ))}
        </DenseSection>
      )}

      {generatedResume.selectedAchievements.length > 0 && (
        <DenseSection title="Honors & Achievements">
          <ul className="list-disc pl-6 text-gray-900" style={{ margin: "0.08em 0 0 0" }}>
            {generatedResume.selectedAchievements.map((achievement) => (
              <li key={achievement} style={{ margin: "0.04em 0" }}>{achievement}</li>
            ))}
          </ul>
        </DenseSection>
      )}
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(getTemplateId(fallbackResume.template))

  useEffect(() => {
    const savedResume = loadLatestGeneratedResume()
    if (!savedResume) return

    const normalizedResume = normalizeGeneratedResume(savedResume)
    setGeneratedResume(normalizedResume)
    setSelectedTemplateId(getTemplateId(normalizedResume.template))
  }, [])

  const profile = generatedResume.profile
  const tailoredSkills = generatedResume.tailoredSkills?.length
    ? generatedResume.tailoredSkills
    : [
        ...profile.skills.programming,
        ...profile.skills.dataAnalysis,
        ...profile.skills.visualization,
        ...profile.skills.cloud,
        ...profile.skills.tools,
      ]
  const resumeTemplate = templateStyles[selectedTemplateId]
  const isCompact = selectedTemplateId === "compact"
  const isUniversityLaw = selectedTemplateId === "university-law"
  const isOriginalCv = selectedTemplateId === "original-cv"
  const hasSupplementalSections = generatedResume.selectedCertifications.length > 0 || generatedResume.selectedAchievements.length > 0
  const displayProjects = mergeProjectsForFullPage(generatedResume.selectedProjects, profile.projects, hasSupplementalSections)
  const downloadText = isOriginalCv
    ? buildOriginalCvDownloadText({ generatedResume, tailoredSkills, displayProjects })
    : isUniversityLaw
    ? buildUniversityLawDownloadText({ generatedResume, tailoredSkills, displayProjects })
    : buildDownloadText({ generatedResume, tailoredSkills, displayProjects })
  const fileBaseName = sanitizeFilename(`${profile.personalInfo.firstName}_${profile.personalInfo.lastName}_resume`) || "resume"
  const screenZoomScale = (zoom / 100) * containerScale
  const profileSkillSet = getProfileSkills(profile)
  const isSummaryGenerated = isGeneratedText(generatedResume.improvedSummary || generatedResume.summary, [
    profile.personalInfo.summary,
  ])
  const isSkillGenerated = (skill: string) => !profileSkillSet.has(normalizeCompareText(skill))
  const isExperienceBulletGenerated = (experienceId: string, bullet: string) => {
    const profileExperience = profile.experience.find((experience) => experience.id === experienceId)
    return isGeneratedText(bullet, profileExperience?.description || [])
  }
  const isProjectHighlightGenerated = (projectId: string, projectName: string, highlight: string) => {
    const profileProject = profile.projects.find((project) => project.id === projectId || project.name === projectName)
    return isGeneratedText(
      highlight,
      [profileProject?.description, ...(profileProject?.highlights || [])].filter(Boolean) as string[]
    )
  }
  const changeHighlights = generatedResume.changeHighlights?.length
    ? generatedResume.changeHighlights
    : [
        isSummaryGenerated ? "Rewrote the professional summary for the target job." : "",
        "Reordered and tailored resume content for ATS relevance.",
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

      // Iterate width compensation + height measurement to a fixed point here,
      // synchronously, instead of looping through React state updates.
      // Scale down when content overflows the page, and up (capped, so type
      // stays a normal size) when content runs short, so the page is filled.
      const MAX_FILL_SCALE = 1.18
      let scale = 1
      for (let iteration = 0; iteration < 5; iteration += 1) {
        contentNode.style.width = `${100 / scale}%`
        const contentHeight = contentNode.scrollHeight
        if (contentHeight <= 0) break
        const nextScale = Math.min(MAX_FILL_SCALE, availableHeight / contentHeight)
        if (Math.abs(nextScale - scale) <= 0.005) {
          scale = nextScale
          break
        }
        scale = nextScale
      }

      contentNode.style.width = `${100 / scale}%`
      setFitScale(scale)
    }

    updateFitScale()
    const animationFrame = window.requestAnimationFrame(updateFitScale)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [displayProjects, generatedResume, selectedTemplateId])

  const handleDownloadPDF = async () => {
    const resumeNode = resumePrintRef.current
    const resumeTemplateId = getTemplateId(generatedResume.template)

    if (!resumeNode || selectedTemplateId !== resumeTemplateId) {
      toast.error("Template mismatch detected. Please reopen the resume preview and try again.")
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
          html: buildResumePrintHtml(resumeNode, fileBaseName, { forServer: true }),
          fileName: fileBaseName,
        }),
      })

      if (response.ok) {
        downloadBlob(await response.blob(), `${fileBaseName}.pdf`)
        toast.success("PDF downloaded", { id: "resume-pdf" })
        return
      }

      // Fallback: browser print dialog (works without a local Chrome/Edge).
      const didOpenPrintWindow = openResumePrintWindow(resumeNode, fileBaseName)
      if (didOpenPrintWindow) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "resume-pdf" })
      }
    } catch (error) {
      console.error("PDF generation failed", error)
      const didOpenPrintWindow = openResumePrintWindow(resumeNode, fileBaseName)
      if (didOpenPrintWindow) {
        toast.success("Print dialog opened. Choose Save as PDF.", { id: "resume-pdf" })
      } else {
        toast.error("PDF generation failed. Please try again.", { id: "resume-pdf" })
      }
    }
  }

  const handleDownloadDOCX = () => {
    downloadBlob(createDocxBlob(downloadText, selectedTemplateId), `${fileBaseName}.docx`)
    toast.success("DOCX downloaded")
  }

  const handleCopyResume = async () => {
    await navigator.clipboard.writeText(downloadText)
    toast.success("Resume copied to clipboard")
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
        {!generatedResume.modelUsed && (
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
                  <span className="text-sm text-muted-foreground">Preview</span>
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
                    isCompact ? "px-6 py-5" : isUniversityLaw ? "px-9 py-7" : isOriginalCv ? "px-10 py-5" : "px-7 py-6",
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
                  {isOriginalCv ? (
                    <OriginalCvResume
                      generatedResume={generatedResume}
                      tailoredSkills={tailoredSkills}
                      displayProjects={displayProjects}
                      isSummaryGenerated={isSummaryGenerated}
                      isSkillGenerated={isSkillGenerated}
                      isExperienceBulletGenerated={isExperienceBulletGenerated}
                      isProjectHighlightGenerated={isProjectHighlightGenerated}
                    />
                  ) : isUniversityLaw ? (
                    <UniversityLawResume
                      generatedResume={generatedResume}
                      tailoredSkills={tailoredSkills}
                      displayProjects={displayProjects}
                      isSummaryGenerated={isSummaryGenerated}
                      isSkillGenerated={isSkillGenerated}
                      isExperienceBulletGenerated={isExperienceBulletGenerated}
                      isProjectHighlightGenerated={isProjectHighlightGenerated}
                    />
                  ) : (
                    <>
                  {/* Header */}
                  <div className={resumeTemplate.header} style={{ pageBreakInside: "avoid" }}>
                    <h1 className={cn("text-2xl", resumeTemplate.name, selectedTemplateId === "executive" && "uppercase")} style={{ fontSize: "24px", margin: "0 0 0.3em 0" }}>
                      {profile.personalInfo.firstName} {profile.personalInfo.lastName}
                    </h1>
                    {selectedTemplateId === "executive" && <div className="w-20 h-px bg-gray-800 mx-auto my-1" style={{ margin: "0.2em auto" }} />}
                    <p className={cn("mt-1", resumeTemplate.contact)} style={{ fontSize: "11px", margin: "0.2em 0 0 0" }}>
                      {profile.personalInfo.email} | {profile.personalInfo.phone} | {profile.personalInfo.location}
                    </p>
                    <p className={resumeTemplate.contact} style={{ fontSize: "11px", margin: "0.1em 0 0 0" }}>
                      {[profile.personalInfo.linkedin, profile.personalInfo.github].filter(Boolean).join(" | ")}
                    </p>
                  </div>

                  {/* Professional Summary */}
                  <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                    <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                      Professional Summary
                    </h2>
                    <p
                      className={cn("text-gray-700 leading-relaxed", isSummaryGenerated && "resume-preview-highlight")}
                      style={{ fontSize: "11px", margin: 0 }}
                    >
                      {generatedResume.improvedSummary || generatedResume.summary}
                    </p>
                  </div>

                  {/* Technical Skills */}
                  <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                    <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                      Technical Skills
                    </h2>
                    <div className="text-gray-700" style={{ fontSize: "11px", margin: 0 }}>
                      <p style={{ margin: 0 }}>
                        <strong>Relevant Skills:</strong>{" "}
                        {tailoredSkills.map((skill, index) => (
                          <span key={`${skill}-${index}`}>
                            <span className={cn(isSkillGenerated(skill) && "resume-preview-highlight")}>{skill}</span>
                            {index < tailoredSkills.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                    <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                      Professional Experience
                    </h2>
                    {generatedResume.selectedExperience.map((exp) => (
                      <div key={exp.id} className={isCompact ? "mb-1.5" : "mb-2"} style={{ pageBreakInside: "avoid" }}>
                        <div className="flex justify-between items-baseline gap-4">
                          <h3 className={resumeTemplate.itemTitle} style={{ fontSize: "12px", margin: 0 }}>{exp.position}</h3>
                          <span className="text-gray-600 whitespace-nowrap" style={{ fontSize: "10px", margin: 0 }}>
                            {exp.startDate} - {exp.endDate}
                          </span>
                        </div>
                        <p className="text-gray-700 italic" style={{ fontSize: "11px", margin: "0.2em 0 0 0" }}>
                          {exp.company}, {exp.location}
                        </p>
                        <ul className={cn("list-disc pl-5 text-gray-700", isCompact ? "mt-0.5" : "mt-0.5")} style={{ fontSize: "11px", margin: "0.3em 0 0 0" }}>
                          {exp.description.map((bullet, idx) => (
                            <li
                              key={idx}
                              className={cn(isExperienceBulletGenerated(exp.id, bullet) && "resume-preview-highlight")}
                              style={{ margin: "0.15em 0", pageBreakInside: "avoid" }}
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                    <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                      Projects
                    </h2>
                    {displayProjects.map((project) => (
                      <div key={project.id} className={isCompact ? "mb-1.5" : "mb-2"} style={{ pageBreakInside: "avoid" }}>
                        <div className="flex justify-between items-baseline gap-4">
                          <h3 className={resumeTemplate.itemTitle} style={{ fontSize: "12px", margin: 0 }}>{project.name}</h3>
                          <span className="text-gray-600 text-right" style={{ fontSize: "10px", margin: 0 }}>
                            {project.technologies.slice(0, 5).join(", ")}
                          </span>
                        </div>
                        <ul className="list-disc pl-5 text-gray-700" style={{ fontSize: "11px", margin: "0.3em 0 0 0" }}>
                          {project.highlights.map((highlight, idx) => (
                            <li
                              key={idx}
                              className={cn(isProjectHighlightGenerated(project.id, project.name, highlight) && "resume-preview-highlight")}
                              style={{ margin: "0.15em 0", pageBreakInside: "avoid" }}
                            >
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Education */}
                  <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                    <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                      Education
                    </h2>
                    {profile.education.map((edu) => (
                      <div key={edu.id} className="mb-1" style={{ pageBreakInside: "avoid" }}>
                        <div className="flex justify-between items-baseline gap-4">
                          <h3 className={resumeTemplate.itemTitle} style={{ fontSize: "12px", margin: 0 }}>{edu.degree} in {edu.field}</h3>
                          <span className="text-gray-600 whitespace-nowrap" style={{ fontSize: "10px", margin: 0 }}>
                            {edu.endDate}
                          </span>
                        </div>
                        <p className="text-gray-700" style={{ fontSize: "11px", margin: "0.15em 0 0 0" }}>
                          {edu.institution} | GPA: {edu.gpa}
                        </p>
                      </div>
                    ))}
                  </div>

                  {generatedResume.selectedCertifications.length > 0 && (
                    <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                      <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                        Certifications
                      </h2>
                      {generatedResume.selectedCertifications.map((cert) => (
                        <p key={cert.id || cert.name} className="text-gray-700" style={{ fontSize: "11px", margin: "0.15em 0" }}>
                          {formatCertification(cert)}
                        </p>
                      ))}
                    </div>
                  )}

                  {generatedResume.selectedAchievements.length > 0 && (
                    <div className={isCompact ? "mb-1.5" : "mb-2.5"}>
                      <h2 className={cn("text-sm font-bold pb-1 mb-1.5", resumeTemplate.section)}>
                        Honors & Achievements
                      </h2>
                      <ul className="list-disc pl-5 text-gray-700" style={{ fontSize: "11px", margin: "0.2em 0 0 0" }}>
                        {generatedResume.selectedAchievements.map((achievement) => (
                          <li key={achievement} style={{ margin: "0.12em 0" }}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                    </>
                  )}
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
                  Your resume is highly optimized for ATS systems
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
              <div className="flex flex-wrap gap-2">
                {generatedResume.missingKeywords.map((keyword, index) => (
                  <motion.div
                    key={keyword}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Badge className="bg-[#f59e0b]/10 text-[#f59e0b]">{keyword}</Badge>
                  </motion.div>
                ))}
              </div>
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
              <Button variant="ghost" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                Share Link
              </Button>
            </div>
          </div>
        </div>
      </div>

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
