"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Clipboard,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AtsScoreCircle } from "@/components/ui/ats-score-circle"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createProfileWorkingCopy } from "@/lib/profile-storage"
import { atsScoreMessage, generateResumeFromJob, rankExperienceForJob } from "@/lib/resume-generator"
import { toast } from "sonner"

const sampleJobDescription = `Judicial Law Clerk, U.S. District Court for the Central District of California

About the Role:
Chambers seeks a term law clerk to assist the Judge with civil and criminal matters.

Requirements:
- J.D. or LL.M. from an accredited law school; bar admission or bar exam registration preferred
- Excellent legal research and writing skills (Westlaw, Lexis)
- Law review or journal experience preferred
- Strong command of the Bluebook and federal civil procedure
- Attention to detail and discretion with confidential matters

Responsibilities:
- Draft bench memoranda, orders, and opinions
- Research legal issues and summarize the record
- Cite-check and proofread draft opinions
- Attend hearings, conferences, and trials`

export default function JobAnalysisPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysis, setAnalysis] = useState<{
    requiredSkills: string[]
    matchingSkills: string[]
    missingSkills: string[]
    recommendedExperience: string[]
    atsScore: number
  } | null>(null)

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJobDescription(text)
    } catch {
      // Clipboard access was blocked; load an example so the page is usable.
      setJobDescription(sampleJobDescription)
      toast.info("Clipboard access was blocked, so a sample job description was loaded. Paste yours into the box instead.")
    }
  }

  const handleClear = () => {
    setJobDescription("")
    setAnalysisComplete(false)
    setAnalysis(null)
  }

  // Runs the same local matching engine the resume and cover letter use, so
  // the score and keyword lists here agree with what those pages show.
  const handleAnalyze = () => {
    if (!jobDescription.trim()) return

    setIsAnalyzing(true)
    setAnalysisComplete(false)

    // Yield a frame so the loading state renders before the synchronous work.
    window.requestAnimationFrame(() => {
      const profile = createProfileWorkingCopy()
      const resume = generateResumeFromJob({
        profile,
        jobDescription,
        template: "university-law",
        tone: "professional",
        experienceLevel: "entry",
        length: "medium",
      })
      const ranked = rankExperienceForJob(profile, jobDescription)
      setAnalysis({
        requiredSkills: [...resume.matchedKeywords, ...resume.missingKeywords],
        matchingSkills: resume.matchedKeywords,
        missingSkills: resume.missingKeywords,
        recommendedExperience: ranked.slice(0, 4).map(
          ({ experience, matchedKeywords }) =>
            `${experience.position}, ${experience.company} — covers ${matchedKeywords.slice(0, 4).join(", ")}`
        ),
        atsScore: resume.atsScore,
      })
      setIsAnalyzing(false)
      setAnalysisComplete(true)
    })
  }

  return (
    <AppLayout title="Job Analysis" subtitle="Analyze job descriptions and find skill matches">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Job Description Input */}
          <AnimatedCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Job Description</h2>
              <span className="text-sm text-muted-foreground">
                {jobDescription.length} characters
              </span>
            </div>
            
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="min-h-[400px] resize-none"
            />

            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handlePaste}
              >
                <Clipboard className="h-4 w-4" />
                Paste
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button
                className="gap-2 ml-auto"
                onClick={handleAnalyze}
                disabled={!jobDescription.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Search className="h-4 w-4" />
                    </motion.div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Job
                  </>
                )}
              </Button>
            </div>
          </AnimatedCard>

          {/* Right Column - Analysis Results */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </motion.div>
              )}

              {analysisComplete && analysis && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* ATS Score */}
                  <AnimatedCard delay={0}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <Target className="h-5 w-5 text-[#4f46e5]" />
                          ATS Match Score
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {atsScoreMessage(analysis.atsScore)}
                        </p>
                      </div>
                      <AtsScoreCircle score={analysis.atsScore} size="md" />
                    </div>
                  </AnimatedCard>

                  {/* Required Skills */}
                  <AnimatedCard delay={0.1}>
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                      <Search className="h-5 w-5 text-[#4f46e5]" />
                      Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.requiredSkills.map((skill, index) => (
                        <motion.div
                          key={skill}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                        >
                          <Badge variant="secondary">{skill}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatedCard>

                  {/* Matching Skills */}
                  <AnimatedCard delay={0.2}>
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
                      Matching Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.matchingSkills.map((skill, index) => (
                        <motion.div
                          key={skill}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          <Badge className="bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20">
                            {skill}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatedCard>

                  {/* Missing Skills */}
                  <AnimatedCard delay={0.3}>
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-[#f59e0b]" />
                      Missing Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingSkills.map((skill, index) => (
                        <motion.div
                          key={skill}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                        >
                          <Badge className="bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20">
                            {skill}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      {analysis.missingSkills.length
                        ? "The posting asks for these and your profile does not mention them. Add any that are genuinely true of you on the Profile page; the rest are gaps to address in a cover letter or interview."
                        : "Your profile mentions every keyword this posting asks for."}
                    </p>
                  </AnimatedCard>

                  {/* Experience to Highlight */}
                  <AnimatedCard delay={0.4}>
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-[#4f46e5]" />
                      Experience to Highlight
                    </h3>
                    {!analysis.recommendedExperience.length && (
                      <p className="text-sm text-muted-foreground">
                        None of your experience entries mention this posting&apos;s keywords yet.
                      </p>
                    )}
                    <div className="space-y-2">
                      {analysis.recommendedExperience.map((project, index) => (
                        <motion.div
                          key={project}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{project}</span>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatedCard>
                </motion.div>
              )}

              {!isAnalyzing && !analysisComplete && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No Analysis Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Paste a job description and click &quot;Analyze Job&quot; to see skill matches and recommendations
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
