"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  Sparkles,
  FileCheck,
  Loader2
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { profileToGeneratePayload, requestGeneratedResume } from "@/lib/resume-generator"
import { clearLatestGeneratedResume, createProfileWorkingCopy, saveGeneratedResume } from "@/lib/profile-storage"
import { toast } from "sonner"

const UNIVERSITY_LAW_FONT_FAMILY = 'Calibri, "Carlito", Arial, sans-serif'
const ORIGINAL_CV_FONT_FAMILY = '"Times New Roman", Times, serif'

const templates = [
  {
    id: "original-cv",
    name: "Original CV Dense",
    description: "Dense one-page format based on your resume",
    preview: {
      header: "center",
      accent: "bg-gray-700",
      section: "border-gray-600 text-gray-700",
      body: ""
    }
  },
  {
    id: "university-law",
    name: "University LLM",
    description: "University-provided legal resume format",
    preview: {
      header: "center",
      accent: "bg-gray-900",
      section: "text-gray-950 underline underline-offset-2",
      body: ""
    }
  },
  {
    id: "harvard",
    name: "Harvard Classic",
    description: "Academic, traditional, highly ATS-friendly",
    preview: {
      header: "center",
      accent: "bg-gray-900",
      section: "border-gray-900 text-gray-950 tracking-wider",
      body: "font-serif"
    }
  },
  {
    id: "modern",
    name: "Clean Professional",
    description: "Polished single-column format with strong headings",
    preview: {
      header: "top-rule",
      accent: "bg-gray-800",
      section: "border-gray-400 text-gray-950 tracking-wide",
      body: "font-sans"
    }
  },
  {
    id: "executive",
    name: "Executive Serif",
    description: "Premium serif style with strong section hierarchy",
    preview: {
      header: "boxed",
      accent: "bg-gray-800",
      section: "border-gray-400 text-gray-950 tracking-[0.16em]",
      body: "font-serif"
    }
  },
  {
    id: "compact",
    name: "Compact One-Page",
    description: "Dense format for internships and early-career roles",
    preview: {
      header: "compact",
      accent: "bg-gray-300",
      section: "border-gray-300 text-gray-950 tracking-wide",
      body: "font-sans"
    }
  }
]

const generationSteps = [
  { id: 1, label: "Reading profile data" },
  { id: 2, label: "Analyzing job description" },
  { id: 3, label: "Matching keywords" },
  { id: 4, label: "Selecting best projects" },
  { id: 5, label: "Writing bullet points" },
  { id: 6, label: "Formatting resume" },
  { id: 7, label: "Final ATS check" }
]

export default function ResumeBuilderPage() {
  const router = useRouter()
  const [jobDescription, setJobDescription] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("original-cv")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const selectedTemplateDetails = templates.find((template) => template.id === selectedTemplate) || templates[0]

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return
    
    setIsGenerating(true)
    setCurrentStep(0)
    clearLatestGeneratedResume()
    const profile = createProfileWorkingCopy()

    try {
      for (let step = 1; step <= 3; step += 1) {
        setCurrentStep(step)
        await delay(350)
      }

      const result = await requestGeneratedResume(
        profileToGeneratePayload({
          profile,
          jobDescription,
          template: selectedTemplate,
          tone: "professional",
          experienceLevel: "mid",
          length: "short",
        })
      )

      saveGeneratedResume(result.resume, {
        jobDescription,
        generationWarning: result.source === "local" ? result.warning || "AI providers unavailable — used basic local generator." : undefined,
      })

      if (result.source === "local") {
        toast.error(
          "AI was unavailable, so this resume used the basic local generator. Quality is reduced — regenerate in a minute to retry AI.",
          { duration: 10000 }
        )
      }

      for (let step = 4; step <= generationSteps.length; step += 1) {
        setCurrentStep(step)
        await delay(350)
      }

      router.push("/resume-preview")
    } catch (error) {
      setIsGenerating(false)
      setCurrentStep(0)
      toast.error(error instanceof Error ? error.message : "Resume generation failed")
    }
  }

  return (
    <AppLayout title="Resume Builder" subtitle="Generate ATS-optimized resumes">
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {!isGenerating ? (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Job Description */}
              <AnimatedCard hover={false}>
                <Label className="text-lg font-semibold text-foreground">Job Description</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Paste the job posting to tailor your resume
                </p>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[200px] resize-none"
                />
              </AnimatedCard>

              {/* Template Selection */}
              <AnimatedCard delay={0.1} hover={false}>
                <Label className="text-lg font-semibold text-foreground">Resume Template</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose an ATS-friendly template
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {templates.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-colors text-left",
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      {selectedTemplate === template.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                      
                      {/* Mini Preview */}
                      <div className="w-full aspect-[8.5/11] bg-white border border-border rounded-md mb-3 p-2">
                        <div className={cn("space-y-1", (template.id === "harvard" || template.id === "university-law" || template.id === "original-cv") && "text-center")}>
                          <div className={cn(
                            "h-2 bg-foreground/80 rounded",
                            template.id === "compact" ? "w-24" : template.id === "executive" ? "w-20" : "w-16",
                            (template.id === "harvard" || template.id === "university-law" || template.id === "original-cv") && "mx-auto"
                          )} />
                          <div className={cn("h-1 w-24 bg-muted rounded", (template.id === "harvard" || template.id === "university-law" || template.id === "original-cv") && "mx-auto")} />
                          <div className={cn(
                            "h-px w-full mt-2",
                            template.id === "modern" ? "bg-gray-800" : "bg-border"
                          )} />
                          <div className="space-y-0.5 mt-1">
                            <div className="h-1 w-10 bg-foreground/60 rounded" />
                            <div className="h-0.5 w-full bg-muted rounded" />
                            <div className="h-0.5 w-3/4 bg-muted rounded" />
                          </div>
                          {template.id === "executive" && <div className="h-px w-2/3 bg-foreground/30 mt-1" />}
                          <div className="space-y-0.5 mt-1">
                            <div className="h-1 w-8 bg-foreground/60 rounded" />
                            <div className="h-0.5 w-full bg-muted rounded" />
                            <div className="h-0.5 w-2/3 bg-muted rounded" />
                          </div>
                        </div>
                      </div>

                      <p className="font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </motion.button>
                  ))}
                </div>
              </AnimatedCard>

              {/* Selected Template Preview */}
              <AnimatedCard delay={0.2} hover={false}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <Label className="text-lg font-semibold text-foreground">Template Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Previewing {selectedTemplateDetails.name}
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {selectedTemplateDetails.name}
                  </span>
                </div>

                <div className="bg-muted/40 border border-border rounded-lg p-4 overflow-auto">
                  <div className={cn(
                    "bg-white text-gray-900 mx-auto shadow-sm border border-gray-200 min-h-[520px] max-w-[560px] p-8",
                    selectedTemplateDetails.preview.body,
                    selectedTemplate === "compact" && "p-6"
                  )}
                  style={
                    selectedTemplate === "university-law"
                      ? { fontFamily: UNIVERSITY_LAW_FONT_FAMILY }
                      : selectedTemplate === "original-cv"
                      ? { fontFamily: ORIGINAL_CV_FONT_FAMILY }
                      : undefined
                  }
                  >
                    {selectedTemplate === "original-cv" && (
                      <>
                        <div className="text-center mb-3">
                          <div className="text-2xl font-bold tracking-wide">MOHIT SHAH, M.SC.</div>
                          <div className="text-sm text-gray-600">Business Analyst | Data Specialist | Data Analyst</div>
                          <div className="text-xs text-gray-800 mt-1">+1 214-566-0084 | Ontario, CA | email@example.com | linkedin.com/in/mohitshah</div>
                        </div>
                        <TemplateRows
                          sectionClass="border-gray-600 text-gray-700"
                          sections={["Professional Summary", "Areas of Expertise", "Professional Experience", "Project", "Education", "Technical Skills"]}
                          compact
                        />
                      </>
                    )}

                    {selectedTemplate === "university-law" && (
                      <>
                        <div className="text-center mb-5">
                          <div className="text-2xl font-bold">MOHIT SHAH</div>
                          <div className="text-xs text-gray-700 mt-1">Ontario, CA | (555) 123-4567 | email@example.com</div>
                        </div>
                        <TemplateRows
                          sectionClass="text-gray-950 underline underline-offset-2"
                          sections={["Education", "Experience", "Projects", "Technical Skills"]}
                          university
                        />
                      </>
                    )}

                    {selectedTemplate === "harvard" && (
                      <>
                        <div className="text-center border-b-2 border-gray-900 pb-4 mb-4">
                          <div className="text-2xl font-bold">Mohit Shah</div>
                          <div className="text-xs text-gray-600 mt-1">email@example.com | (555) 123-4567 | Ontario, CA</div>
                          <div className="text-xs text-gray-600">linkedin.com/in/mohitshah | github.com/mohitshah</div>
                        </div>
                        <TemplateRows sectionClass="border-gray-900 text-gray-950 tracking-wider" />
                      </>
                    )}

                    {selectedTemplate === "modern" && (
                      <>
                        <div className="border-t-4 border-gray-900 pt-4 pb-4 mb-4">
                          <div className="flex items-start justify-between gap-6">
                            <div>
                              <div className="text-3xl font-bold text-gray-950">Mohit Shah</div>
                              <div className="text-xs font-medium uppercase tracking-wide text-gray-600 mt-1">
                                Software Developer | Data-Focused Builder
                              </div>
                            </div>
                            <div className="text-[11px] text-gray-600 text-right leading-relaxed">
                              email@example.com<br />
                              github.com/mohitshah<br />
                              Ontario, CA
                            </div>
                          </div>
                        </div>
                        <TemplateRows sectionClass="border-gray-400 text-gray-950 tracking-wide" />
                      </>
                    )}

                    {selectedTemplate === "executive" && (
                      <>
                        <div className="border-y-2 border-gray-800 py-5 mb-5 text-center">
                          <div className="text-3xl font-bold tracking-wide">MOHIT SHAH</div>
                          <div className="w-20 h-px bg-gray-800 mx-auto my-2" />
                          <div className="text-xs text-gray-600">Ontario, CA | email@example.com | linkedin.com/in/mohitshah</div>
                        </div>
                        <TemplateRows sectionClass="border-gray-400 text-gray-950 tracking-[0.16em]" titleClass="font-serif" />
                      </>
                    )}

                    {selectedTemplate === "compact" && (
                      <>
                        <div className="flex justify-between items-start border-b border-gray-300 pb-3 mb-3">
                          <div>
                            <div className="text-2xl font-bold">Mohit Shah</div>
                            <div className="text-xs text-gray-600">Software Developer | Data Analyst</div>
                          </div>
                          <div className="text-[10px] text-gray-500 text-right leading-tight">
                            email@example.com<br />Ontario, CA<br />github.com/mohitshah
                          </div>
                        </div>
                        <TemplateRows sectionClass="border-gray-300 text-gray-950 tracking-wide" compact />
                      </>
                    )}
                  </div>
                </div>
              </AnimatedCard>

              {/* Generate Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  size="lg"
                  className="w-full gap-2 h-14 text-base"
                  onClick={handleGenerate}
                  disabled={!jobDescription.trim()}
                >
                  <Sparkles className="h-5 w-5" />
                  Generate ATS Resume
                </Button>
              </motion.div>
            </motion.div>
          ) : (
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
                  <h2 className="text-xl font-semibold text-foreground">Generating Your Resume</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    AI is crafting your perfect ATS-optimized resume
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
                        currentStep > index
                          ? "bg-[#10b981]/10"
                          : currentStep === index
                          ? "bg-primary/10"
                          : "bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                        currentStep > index
                          ? "bg-[#10b981] text-white"
                          : currentStep === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {currentStep > index ? (
                          <Check className="h-4 w-4" />
                        ) : currentStep === index ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileCheck className="h-3 w-3" />
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        currentStep > index
                          ? "text-[#10b981]"
                          : currentStep === index
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </AnimatedCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}

function TemplateRows({
  sectionClass,
  titleClass,
  compact = false,
  sections: sectionsOverride,
  university = false,
}: {
  sectionClass: string
  titleClass?: string
  compact?: boolean
  sections?: string[]
  university?: boolean
}) {
  const sections = sectionsOverride || (compact
    ? ["Summary", "Skills", "Experience", "Projects", "Education"]
    : ["Professional Summary", "Technical Skills", "Professional Experience", "Projects", "Education"])

  return (
    <>
      {sections.map((section, index) => (
        <div key={section} className={compact || university ? "mb-3" : "mb-4"}>
          <div className={cn("text-xs font-bold uppercase pb-1 mb-2", !university && "border-b", sectionClass, titleClass)}>
            {section}
          </div>
          <div className={compact || university ? "space-y-1" : "space-y-1.5"}>
            {university ? (
              <>
                <div className="flex justify-between gap-4">
                  <div className="h-2.5 bg-gray-700 rounded w-5/12" />
                  <div className="h-2 bg-gray-300 rounded w-3/12" />
                </div>
                {index > 0 && (
                  <>
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-10/12" />
                  </>
                )}
              </>
            ) : index === 0 ? (
              <>
                <div className="h-2 bg-gray-300 rounded w-full" />
                <div className="h-2 bg-gray-300 rounded w-11/12" />
                {!compact && <div className="h-2 bg-gray-300 rounded w-4/5" />}
              </>
            ) : index === 1 ? (
              <>
                <div className="h-2 bg-gray-300 rounded w-10/12" />
                <div className="h-2 bg-gray-300 rounded w-8/12" />
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <div className="h-2.5 bg-gray-700 rounded w-1/3" />
                  <div className="h-2 bg-gray-300 rounded w-1/5" />
                </div>
                <div className="h-2 bg-gray-300 rounded w-full" />
                <div className="h-2 bg-gray-300 rounded w-11/12" />
                {!compact && <div className="h-2 bg-gray-300 rounded w-9/12" />}
              </>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
