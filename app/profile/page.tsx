"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Award,
  Trophy,
  Link as LinkIcon,
  FileUp,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Loader2,
  Scale,
  Globe2,
  ListChecks
} from "lucide-react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileUploadZone } from "@/components/ui/file-upload-zone"
import { mockProfile } from "@/lib/data"
import { ProfileData, profileToGeneratePayload, requestGeneratedResume } from "@/lib/resume-generator"
import { clearLatestGeneratedResume, loadMasterProfile, saveGeneratedResume, saveMasterProfile } from "@/lib/profile-storage"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BAR_EXAM_STATUSES,
  WORK_AUTHORIZATION_STATUSES,
  barAdmissionLines,
  formatWorkAuthorization,
  workAuthorizationLine,
} from "@/lib/resume-document"

const sections = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "barAdmission", label: "Bar Admission", icon: Scale },
  { id: "workAuthorization", label: "Work Authorization", icon: Globe2 },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "experience", label: "Work Experience", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "additionalInfo", label: "Additional Information", icon: ListChecks },
  { id: "files", label: "Uploaded Files", icon: FileUp },
]

type Profile = ProfileData
type SetProfile = React.Dispatch<React.SetStateAction<Profile>>

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Always-visible example text under a field. Placeholders alone are not enough
// here: they disappear as soon as the field has a value, so students editing an
// existing profile would never see the expected format.
function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground/80 leading-snug">
      <span className="font-medium text-muted-foreground">Example: </span>
      {children}
    </p>
  )
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function withIds<T extends { id: string }>(items: T[]) {
  return items.map((item) => ({ ...item, id: item.id || createId() }))
}

function mergeUniqueStrings(current: string[], imported: string[]) {
  const seen = new Set(current.map(normalizeText))
  const merged = [...current]

  for (const item of imported) {
    const trimmedItem = item.trim()
    if (!trimmedItem || seen.has(normalizeText(trimmedItem))) continue
    seen.add(normalizeText(trimmedItem))
    merged.push(trimmedItem)
  }

  return merged
}

function mergeProfileFromResume(currentProfile: Profile, importedProfile: Profile): Profile {
  return {
    ...currentProfile,
    personalInfo: {
      ...currentProfile.personalInfo,
      ...Object.fromEntries(
        Object.entries(importedProfile.personalInfo).filter(([, value]) => typeof value === "string" && value.trim())
      ),
    },
    education: importedProfile.education.length ? withIds(importedProfile.education) : currentProfile.education,
    experience: importedProfile.experience.length ? withIds(importedProfile.experience) : currentProfile.experience,
    projects: importedProfile.projects.length ? withIds(importedProfile.projects) : currentProfile.projects,
    skills: {
      programming: mergeUniqueStrings(currentProfile.skills.programming, importedProfile.skills.programming),
      dataAnalysis: mergeUniqueStrings(currentProfile.skills.dataAnalysis, importedProfile.skills.dataAnalysis),
      visualization: mergeUniqueStrings(currentProfile.skills.visualization, importedProfile.skills.visualization),
      databases: mergeUniqueStrings(currentProfile.skills.databases, importedProfile.skills.databases),
      cloud: mergeUniqueStrings(currentProfile.skills.cloud, importedProfile.skills.cloud),
      tools: mergeUniqueStrings(currentProfile.skills.tools, importedProfile.skills.tools),
    },
    certifications: importedProfile.certifications.length ? withIds(importedProfile.certifications) : currentProfile.certifications,
    achievements: mergeUniqueStrings(currentProfile.achievements, importedProfile.achievements),
    barAdmission: mergeUniqueStrings(currentProfile.barAdmission, importedProfile.barAdmission),
    barDetails: {
      admissions: importedProfile.barDetails.admissions.length
        ? withIds(importedProfile.barDetails.admissions)
        : currentProfile.barDetails.admissions,
      usBarExams: importedProfile.barDetails.usBarExams.length
        ? withIds(importedProfile.barDetails.usBarExams)
        : currentProfile.barDetails.usBarExams,
    },
    workAuthorizationDetails: importedProfile.workAuthorizationDetails.status
      ? importedProfile.workAuthorizationDetails
      : currentProfile.workAuthorizationDetails,
    workAuthorization: importedProfile.workAuthorization?.trim() || currentProfile.workAuthorization,
    additionalInfo: {
      languages: mergeUniqueStrings(currentProfile.additionalInfo.languages, importedProfile.additionalInfo.languages),
      volunteer: mergeUniqueStrings(currentProfile.additionalInfo.volunteer, importedProfile.additionalInfo.volunteer),
      memberships: mergeUniqueStrings(currentProfile.additionalInfo.memberships, importedProfile.additionalInfo.memberships),
      interests: mergeUniqueStrings(currentProfile.additionalInfo.interests, importedProfile.additionalInfo.interests),
    },
  }
}

function getImportCounts(profile: Profile) {
  return {
    education: profile.education.length,
    experience: profile.experience.length,
    projects: profile.projects.length,
    skills: Object.values(profile.skills).flat().length,
    certifications: profile.certifications.length,
    achievements: profile.achievements.length,
    barAdmission: profile.barAdmission.length,
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("personal")
  const [profile, setProfile] = useState(mockProfile)
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)

  useEffect(() => {
    setProfile(loadMasterProfile())
  }, [])

  const handleSave = () => {
    saveMasterProfile(profile, "profile_management")
    toast.success("Profile saved successfully!")
  }

  const handleGenerateResume = async () => {
    setIsGeneratingResume(true)
    clearLatestGeneratedResume()

    try {
      const workingProfile = structuredClone(profile)
      const result = await requestGeneratedResume(
        profileToGeneratePayload({
          profile: workingProfile,
          targetRole: "General Resume",
          jobDescription:
            "PROFILE_ONLY_RESUME_REQUEST: Create a general ATS-friendly resume using only the candidate profile data. Do not tailor to a specific external job description. Prioritize the candidate's strongest profile summary, education, work experience, projects, technical skills, achievements, and certifications. Select the best projects from the profile and write truthful professional bullets based only on the provided details.",
          template: "modern",
          tone: "professional",
          experienceLevel: "mid",
          length: "medium",
        })
      )

      saveGeneratedResume(result.resume)

      if (result.source === "local") {
        toast.warning(result.warning || "Using local generator because Groq is not configured.")
      } else {
        toast.success("Resume generated successfully!")
      }

      router.push("/resume-preview")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume generation failed")
    } finally {
      setIsGeneratingResume(false)
    }
  }

  return (
    <AppLayout title="Profile Knowledge Base" subtitle="Manage your master profile data">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Navigation */}
          <AnimatedCard className="lg:col-span-1 h-fit" hover={false}>
            <nav className="space-y-1">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{section.label}</span>
                </motion.button>
              ))}
            </nav>
          </AnimatedCard>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeSection === "personal" && (
                  <PersonalInfoSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "barAdmission" && (
                  <BarAdmissionSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "workAuthorization" && (
                  <WorkAuthorizationSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "education" && (
                  <EducationSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "experience" && (
                  <ExperienceSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "skills" && (
                  <SkillsSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "certifications" && (
                  <CertificationsSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "achievements" && (
                  <AchievementsSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "links" && (
                  <LinksSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "additionalInfo" && (
                  <AdditionalInfoSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "files" && <FilesSection profile={profile} setProfile={setProfile} />}
              </motion.div>
            </AnimatePresence>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex flex-col sm:flex-row justify-end gap-3"
            >
              <Button
                variant="outline"
                onClick={handleGenerateResume}
                disabled={isGeneratingResume}
                className="gap-2"
              >
                {isGeneratingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Resume
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function PersonalInfoSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Personal Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="e.g. Timothy"
            value={profile.personalInfo.firstName}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, firstName: e.target.value }
            }))}
          />
          <FieldHint>Timothy</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="e.g. Lyon"
            value={profile.personalInfo.lastName}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, lastName: e.target.value }
            }))}
          />
          <FieldHint>Lyon</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. timothy.lyon@lls.edu"
            value={profile.personalInfo.email}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, email: e.target.value }
            }))}
          />
          <FieldHint>timothy.lyon@lls.edu</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="e.g. (310) 555-1234"
            value={profile.personalInfo.phone}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, phone: e.target.value }
            }))}
          />
          <FieldHint>(310) 555-1234</FieldHint>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Los Angeles, CA"
            value={profile.personalInfo.location}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, location: e.target.value }
            }))}
          />
          <FieldHint>Los Angeles, CA</FieldHint>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <p className="text-xs text-muted-foreground">Used to tailor experience bullets and cover letters. Not printed on the Loyola resume.</p>
          <Textarea
            id="summary"
            rows={4}
            placeholder="e.g. LL.M. candidate at LMU Loyola Law School focusing on Entertainment Law, with four years of practice as a licensed associate in British Columbia advising clients on regulatory compliance and corporate transactions."
            value={profile.personalInfo.summary}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, summary: e.target.value }
            }))}
          />
          <FieldHint>
            LL.M. candidate at LMU Loyola Law School focusing on Entertainment Law, with four years of practice as a
            licensed associate in British Columbia advising clients on regulatory compliance and corporate transactions.
          </FieldHint>
        </div>
      </div>
    </AnimatedCard>
  )
}

// Shows exactly what a section will print, so students can check the wording.
function PrintedPreview({ lines }: { lines: string[] }) {
  if (!lines.length) return null
  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">Prints on your resume as</p>
      {lines.map((line, index) => (
        <p key={index} className="text-sm text-foreground">{line}</p>
      ))}
    </div>
  )
}

function BarAdmissionSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  type BarDetails = Profile["barDetails"]
  const setBar = (update: (bar: BarDetails) => BarDetails) => {
    setProfile((p) => ({ ...p, barDetails: update(p.barDetails) }))
  }
  const updateAdmission = (id: string, field: "jurisdiction" | "year", value: string) => {
    setBar((bar) => ({ ...bar, admissions: bar.admissions.map((item) => (item.id === id ? { ...item, [field]: value } : item)) }))
  }
  const updateExam = (id: string, field: "jurisdiction" | "examDate" | "status", value: string) => {
    setBar((bar) => ({ ...bar, usBarExams: bar.usBarExams.map((item) => (item.id === id ? { ...item, [field]: value } : item)) }))
  }
  const updateLine = (index: number, value: string) => {
    setProfile((p) => ({ ...p, barAdmission: p.barAdmission.map((entry, idx) => (idx === index ? value : entry)) }))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center gap-2 mb-2">
        <Scale className="h-5 w-5 text-[#6366f1]" />
        <h2 className="text-lg font-semibold text-foreground">Bar Admission</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Printed under BAR ADMISSION in the order below. Leave everything empty if it does not apply to you yet.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base">Admitted jurisdictions</Label>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setBar((bar) => ({ ...bar, admissions: [...bar.admissions, { id: createId(), jurisdiction: "", year: "" }] }))}
          >
            <Plus className="h-4 w-4" />
            Add Admission
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Any bar you are admitted to, in the U.S. or abroad. Foreign-trained lawyers: list your home-country admission here.
        </p>
        {profile.barDetails.admissions.map((item) => (
          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_auto] gap-2 items-center">
            <Input placeholder="e.g. British Columbia" value={item.jurisdiction} onChange={(e) => updateAdmission(item.id, "jurisdiction", e.target.value)} />
            <Input placeholder="Year, e.g. 2017" value={item.year} onChange={(e) => updateAdmission(item.id, "year", e.target.value)} />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setBar((bar) => ({ ...bar, admissions: bar.admissions.filter((entry) => entry.id !== item.id) }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <FieldHint>British Columbia, 2017 prints as &ldquo;British Columbia Bar (2017)&rdquo;</FieldHint>
      </div>

      <div className="space-y-3 mt-8">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base">U.S. bar exam</Label>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              setBar((bar) => ({
                ...bar,
                usBarExams: [...bar.usBarExams, { id: createId(), jurisdiction: "", examDate: "", status: "registered" }],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add Exam
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          LL.M. and foreign-trained students: whether you may sit for a U.S. bar exam depends on the state and on your prior
          legal education. Confirm eligibility with that state&rsquo;s board of bar examiners before listing it.
        </p>
        {profile.barDetails.usBarExams.map((item) => (
          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_13rem_auto] gap-2 items-center">
            <Input placeholder="e.g. California" value={item.jurisdiction} onChange={(e) => updateExam(item.id, "jurisdiction", e.target.value)} />
            <Input placeholder="e.g. July 2027" value={item.examDate} onChange={(e) => updateExam(item.id, "examDate", e.target.value)} />
            <Select value={item.status || "registered"} onValueChange={(value) => updateExam(item.id, "status", value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAR_EXAM_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setBar((bar) => ({ ...bar, usBarExams: bar.usBarExams.filter((entry) => entry.id !== item.id) }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <FieldHint>California, July 2027, Registered prints as &ldquo;Registered for the July 2027 California Bar exam&rdquo;</FieldHint>
      </div>

      <div className="space-y-3 mt-8">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base">Other lines (optional)</Label>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setProfile((p) => ({ ...p, barAdmission: [...p.barAdmission, ""] }))}>
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
        </div>
        {profile.barAdmission.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input placeholder="e.g. U.S. District Court, Central District of California (2026)" value={entry} onChange={(e) => updateLine(index, e.target.value)} />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              onClick={() => setProfile((p) => ({ ...p, barAdmission: p.barAdmission.filter((_, idx) => idx !== index) }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <PrintedPreview lines={barAdmissionLines(profile)} />
    </AnimatedCard>
  )
}

const DATED_WORK_AUTHORIZATION = ["f1-opt", "f1-cpt", "j1-academic-training", "h1b", "ead"]

function WorkAuthorizationSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const details = profile.workAuthorizationDetails
  const setDetail = (field: keyof Profile["workAuthorizationDetails"], value: string) => {
    setProfile((p) => ({ ...p, workAuthorizationDetails: { ...p.workAuthorizationDetails, [field]: value } }))
  }
  const generatedLine = formatWorkAuthorization(details)
  const printedLine = workAuthorizationLine(profile)

  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-2 text-foreground">Work Authorization</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Mainly for international students. Choose your status and the dates your authorization covers, and the resume
        line is written for you. Choose &ldquo;Not listed&rdquo; to leave this section off your resume.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Status</Label>
          <Select value={details.status || "none"} onValueChange={(value) => setDetail("status", value === "none" ? "" : value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not listed on my resume</SelectItem>
              {WORK_AUTHORIZATION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {DATED_WORK_AUTHORIZATION.includes(details.status) && (
          <>
            <div className="space-y-2">
              <Label>{details.status === "f1-opt" ? "Anticipated OPT start date" : "Start date"}</Label>
              <Input placeholder="e.g. August 2027" value={details.startDate} onChange={(e) => setDetail("startDate", e.target.value)} />
              <FieldHint>August 2027</FieldHint>
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input placeholder="e.g. August 2028" value={details.endDate} onChange={(e) => setDetail("endDate", e.target.value)} />
              <FieldHint>August 2028</FieldHint>
            </div>
          </>
        )}
        <div className="space-y-2 md:col-span-2">
          <Label>Will you need employer visa sponsorship (e.g. H-1B)?</Label>
          <Select value={details.needsSponsorship || "unspecified"} onValueChange={(value) => setDetail("needsSponsorship", value === "unspecified" ? "" : value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Prefer not to say</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Never printed on your resume. Used only so tailored content never suggests otherwise.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="workAuthorization">Custom line (optional)</Label>
          <Input
            id="workAuthorization"
            value={profile.workAuthorization}
            placeholder={generatedLine ? `e.g. ${generatedLine}` : "e.g. Anticipated OPT start date: August 2027"}
            onChange={(e) => setProfile((p) => ({ ...p, workAuthorization: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Replaces the generated line. Leave empty to use the generated line.</p>
        </div>
      </div>
      <PrintedPreview lines={printedLine ? [printedLine] : []} />
      <p className="text-xs text-muted-foreground mt-4">
        General information, not legal advice. Confirm your OPT, CPT, or Academic Training dates with your school&rsquo;s
        international student office (your DSO for F-1, or RO for J-1) before listing them.
      </p>
    </AnimatedCard>
  )
}

function EducationSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [expanded, setExpanded] = useState<string | null>(profile.education[0]?.id || null)
  const updateEducation = (id: string, field: Exclude<keyof Profile["education"][number], "activities" | "coursework">, value: string) => {
    setProfile((p) => ({
      ...p,
      education: p.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }))
  }
  const addEducation = () => {
    const id = createId()
    setProfile((p) => ({
      ...p,
      education: [
        ...p.education,
        { id, institution: "", location: "", degree: "", field: "", startDate: "", endDate: "", gpa: "", coursework: [], activities: [] },
      ],
    }))
    setExpanded(id)
  }
  const setCoursework = (id: string, update: (coursework: string[]) => string[]) => {
    setProfile((p) => ({
      ...p,
      education: p.education.map((edu) =>
        edu.id === id ? { ...edu, coursework: update(edu.coursework || []) } : edu
      ),
    }))
  }
  const setActivities = (id: string, update: (activities: string[]) => string[]) => {
    setProfile((p) => ({
      ...p,
      education: p.education.map((edu) =>
        edu.id === id ? { ...edu, activities: update(edu.activities || []) } : edu
      ),
    }))
  }
  const removeEducation = (id: string) => {
    setProfile((p) => ({ ...p, education: p.education.filter((edu) => edu.id !== id) }))
    setExpanded((current) => (current === id ? null : current))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Education</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={addEducation}>
          <Plus className="h-4 w-4" />
          Add Education
        </Button>
      </div>
      <div className="space-y-4">
        {profile.education.map((edu) => (
          <motion.div
            key={edu.id}
            layout
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === edu.id ? null : edu.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-foreground">{edu.institution}</p>
                <p className="text-sm text-muted-foreground">{[edu.degree, edu.field].filter(Boolean).join(", ")}</p>
              </div>
              <motion.div animate={{ rotate: expanded === edu.id ? 180 : 0 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === edu.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-border space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Input placeholder="e.g. LMU Loyola Law School" value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} />
                        <FieldHint>LMU Loyola Law School</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input placeholder="e.g. Los Angeles, CA" value={edu.location || ""} onChange={(e) => updateEducation(edu.id, "location", e.target.value)} />
                        <FieldHint>Los Angeles, CA</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input placeholder="e.g. J.D. Candidate" value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} />
                        <FieldHint>J.D. Candidate, LL.M. Candidate, or Bachelor of Arts</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input placeholder="e.g. Entertainment Law" value={edu.field} onChange={(e) => updateEducation(edu.id, "field", e.target.value)} />
                        <FieldHint>Entertainment Law</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>GPA / Honors (optional)</Label>
                        <Input placeholder="e.g. With Distinction" value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} />
                        <FieldHint>3.7 or With Distinction</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input placeholder="e.g. August 2021" value={edu.startDate} onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)} />
                        <FieldHint>August 2021</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input placeholder="e.g. May 2027" value={edu.endDate} onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)} />
                        <FieldHint>May 2027 (or Expected May 2027)</FieldHint>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Relevant Coursework</Label>
                        <Button variant="outline" size="sm" className="gap-1 h-7" onClick={() => setCoursework(edu.id, (items) => [...items, ""])}>
                          <Plus className="h-3.5 w-3.5" />
                          Add Course
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Courses that match the jobs you are applying for. This is often what makes a resume match a posting
                        (for example Federal Income Tax for a tax role). Printed on the &ldquo;Coursework:&rdquo; line under this school.
                      </p>
                      {(edu.coursework || []).map((course, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. Federal Income Tax"
                            value={course}
                            onChange={(e) => setCoursework(edu.id, (items) => items.map((item, idx) => (idx === index ? e.target.value : item)))}
                          />
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setCoursework(edu.id, (items) => items.filter((_, idx) => idx !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <FieldHint>Evidence, Federal Courts, Immigration Law, Trial Advocacy</FieldHint>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Activities</Label>
                        <Button variant="outline" size="sm" className="gap-1 h-7" onClick={() => setActivities(edu.id, (items) => [...items, ""])}>
                          <Plus className="h-3.5 w-3.5" />
                          Add Activity
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Student organizations, journals, moot court, and clinics at this school. Printed on the &ldquo;Activities:&rdquo; line under this school.
                      </p>
                      {(edu.activities || []).map((activity, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. Intellectual Property Law Society, Secretary (Fall 2021 – Present)"
                            value={activity}
                            onChange={(e) => setActivities(edu.id, (items) => items.map((item, idx) => (idx === index ? e.target.value : item)))}
                          />
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setActivities(edu.id, (items) => items.filter((_, idx) => idx !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <FieldHint>Intellectual Property Law Society, Secretary (Fall 2021 – Present)</FieldHint>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => removeEducation(edu.id)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function ExperienceSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [expanded, setExpanded] = useState<string | null>(profile.experience[0]?.id || null)

  const updateExperience = (id: string, field: keyof Profile["experience"][number], value: string) => {
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }))
  }

  const updateBullet = (id: string, index: number, value: string) => {
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((exp) =>
        exp.id === id
          ? { ...exp, description: exp.description.map((bullet, idx) => (idx === index ? value : bullet)) }
          : exp
      ),
    }))
  }

  const addExperience = () => {
    const id = createId()
    setProfile((p) => ({
      ...p,
      experience: [
        ...p.experience,
        { id, company: "", position: "", location: "", startDate: "", endDate: "", description: [""] },
      ],
    }))
    setExpanded(id)
  }

  const removeExperience = (id: string) => {
    setProfile((p) => ({ ...p, experience: p.experience.filter((exp) => exp.id !== id) }))
    setExpanded((current) => (current === id ? null : current))
  }

  const addBullet = (id: string) => {
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((exp) =>
        exp.id === id ? { ...exp, description: [...exp.description, ""] } : exp
      ),
    }))
  }

  const removeBullet = (id: string, index: number) => {
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((exp) =>
        exp.id === id
          ? { ...exp, description: exp.description.filter((_, idx) => idx !== index) }
          : exp
      ),
    }))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Work Experience</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={addExperience}>
          <Plus className="h-4 w-4" />
          Add Experience
        </Button>
      </div>
      <div className="space-y-4">
        {profile.experience.map((exp) => (
          <motion.div
            key={exp.id}
            layout
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === exp.id ? null : exp.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-foreground">{exp.position}</p>
                <p className="text-sm text-muted-foreground">{exp.company} • {exp.startDate} - {exp.endDate}</p>
              </div>
              <motion.div animate={{ rotate: expanded === exp.id ? 180 : 0 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === exp.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-border space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Employer / Organization</Label>
                        <Input placeholder="e.g. Blake, Cassels & Graydon LLP" value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} />
                        <FieldHint>Blake, Cassels &amp; Graydon LLP</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Input placeholder="e.g. Associate" value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} />
                        <FieldHint>Associate, Law Clerk, or Judicial Extern</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input placeholder="e.g. Vancouver, B.C." value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} />
                        <FieldHint>Vancouver, B.C.</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input placeholder="e.g. August 2017" value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} />
                        <FieldHint>August 2017 (or Summer 2016)</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input placeholder="e.g. June 2021" value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} />
                        <FieldHint>June 2021 (or Present)</FieldHint>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bullet Points</Label>
                      <p className="text-xs text-muted-foreground">
                        Start each bullet with a past-tense action verb and describe the legal work you did.
                      </p>
                      <FieldHint>Drafted research memoranda and discovery requests for active litigation matters</FieldHint>
                      {exp.description.map((bullet, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input placeholder="e.g. Performed complex legal research" value={bullet} className="flex-1" onChange={(e) => updateBullet(exp.id, idx, e.target.value)} />
                          <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeBullet(exp.id, idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={() => addBullet(exp.id)}>
                        <Plus className="h-4 w-4" />
                        Add Bullet Point
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => removeExperience(exp.id)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function SkillsSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const skillCategories = [
    { key: "programming", label: "Research Platforms (Westlaw, Lexis, ...)", example: "Westlaw" },
    { key: "dataAnalysis", label: "Legal Skills (Research, Writing, Advocacy)", example: "Legal Research & Writing" },
    { key: "visualization", label: "Technology & Office Software", example: "Microsoft Word" },
    { key: "databases", label: "Practice & Litigation Tools", example: "Relativity" },
    { key: "tools", label: "Additional (Languages, Licenses)", example: "Notary Public" },
  ] as const

  const addSkill = (category: keyof Profile["skills"], example: string) => {
    const skill = window.prompt(`Enter a skill (e.g. ${example})`)
    if (!skill?.trim()) return
    setProfile((p) => ({
      ...p,
      skills: {
        ...p.skills,
        [category]: [...p.skills[category], skill.trim()],
      },
    }))
  }

  const removeSkill = (category: keyof Profile["skills"], skill: string) => {
    setProfile((p) => ({
      ...p,
      skills: {
        ...p.skills,
        [category]: p.skills[category].filter((item) => item !== skill),
      },
    }))
  }

  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Skills</h2>
      <div className="space-y-6">
        {skillCategories.map((category) => (
          <div key={category.key} className="space-y-2">
            <Label>{category.label}</Label>
            <FieldHint>{category.example}</FieldHint>
            <div className="flex flex-wrap gap-2">
              {profile.skills[category.key].map((skill) => (
                <motion.div
                  key={skill}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    {skill}
                    <button className="ml-1 hover:text-destructive transition-colors" onClick={() => removeSkill(category.key, skill)}>x</button>
                  </Badge>
                </motion.div>
              ))}
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => addSkill(category.key, category.example)}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function CertificationsSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const updateCertification = (id: string, field: keyof Profile["certifications"][number], value: string) => {
    setProfile((p) => ({
      ...p,
      certifications: p.certifications.map((cert) =>
        cert.id === id ? { ...cert, [field]: value } : cert
      ),
    }))
  }
  const addCertification = () => {
    setProfile((p) => ({
      ...p,
      certifications: [
        ...p.certifications,
        { id: createId(), name: "", issuer: "", date: "", credentialId: "" },
      ],
    }))
  }
  const removeCertification = (id: string) => {
    setProfile((p) => ({ ...p, certifications: p.certifications.filter((cert) => cert.id !== id) }))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Certifications</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={addCertification}>
          <Plus className="h-4 w-4" />
          Add Certification
        </Button>
      </div>
      <div className="space-y-4">
        {profile.certifications.map((cert, index) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 border border-border rounded-lg"
          >
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input value={cert.name} placeholder="e.g. Certificate in Entertainment Law" onChange={(e) => updateCertification(cert.id, "name", e.target.value)} />
                <FieldHint>Certificate in Entertainment &amp; Media Law</FieldHint>
              </div>
              <div className="space-y-1">
                <Input value={cert.issuer} placeholder="e.g. LMU Loyola Law School" onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)} />
                <FieldHint>LMU Loyola Law School</FieldHint>
              </div>
              <div className="space-y-1">
                <Input value={cert.date} placeholder="e.g. May 2027" onChange={(e) => updateCertification(cert.id, "date", e.target.value)} />
                <FieldHint>May 2027</FieldHint>
              </div>
              <div className="space-y-1">
                <Input value={cert.credentialId} placeholder="e.g. ABC-12345" onChange={(e) => updateCertification(cert.id, "credentialId", e.target.value)} />
                <FieldHint>ABC-12345 (optional)</FieldHint>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeCertification(cert.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function AchievementsSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const updateAchievement = (index: number, value: string) => {
    setProfile((p) => ({
      ...p,
      achievements: p.achievements.map((achievement, idx) => (idx === index ? value : achievement)),
    }))
  }
  const addAchievement = () => {
    setProfile((p) => ({ ...p, achievements: [...p.achievements, ""] }))
  }
  const removeAchievement = (index: number) => {
    setProfile((p) => ({ ...p, achievements: p.achievements.filter((_, idx) => idx !== index) }))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Achievements</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={addAchievement}>
          <Plus className="h-4 w-4" />
          Add Achievement
        </Button>
      </div>
      <div className="space-y-3">
        {profile.achievements.map((achievement, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-[#10b981]" />
            </div>
            <div className="flex-1 space-y-1">
              <Input placeholder="e.g. Dean's List, Fall 2026" value={achievement} onChange={(e) => updateAchievement(index, e.target.value)} />
              <FieldHint>Dean&rsquo;s List, Fall 2026; or CALI Award for Highest Grade in Contracts</FieldHint>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAchievement(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function AdditionalInfoSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const categories = [
    { key: "languages", label: "Languages", placeholder: "French (fluent); Spanish (basic)" },
    { key: "volunteer", label: "Volunteer", placeholder: "Legal Name & Gender Marker Change Pro Bono Project (Spring 2027)" },
    { key: "memberships", label: "Memberships", placeholder: "International Bar Association (Fall 2026 - Present)" },
    { key: "interests", label: "Interests", placeholder: "Indoor cycling, golf, and visiting National Parks" },
  ] as const

  const addEntry = (category: keyof Profile["additionalInfo"], example: string) => {
    const entry = window.prompt(`Add a ${category} entry\n\nExample: ${example}`)
    if (!entry?.trim()) return
    // Entries are keyed and removed by their text, so an exact duplicate would
    // collide; it is never wanted on a resume anyway.
    const existing = profile.additionalInfo[category].map((item) => item.trim().toLowerCase())
    if (existing.includes(entry.trim().toLowerCase())) {
      toast.info("That entry is already listed.")
      return
    }
    setProfile((p) => ({
      ...p,
      additionalInfo: {
        ...p.additionalInfo,
        [category]: [...p.additionalInfo[category], entry.trim()],
      },
    }))
  }

  const removeEntry = (category: keyof Profile["additionalInfo"], entry: string) => {
    setProfile((p) => ({
      ...p,
      additionalInfo: {
        ...p.additionalInfo,
        [category]: p.additionalInfo[category].filter((item) => item !== entry),
      },
    }))
  }

  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Additional Information</h2>
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.key} className="space-y-2">
            <Label>{category.label}</Label>
            <FieldHint>{category.placeholder}</FieldHint>
            <div className="flex flex-wrap gap-2">
              {profile.additionalInfo[category.key].map((entry) => (
                <Badge key={entry} variant="secondary" className="gap-1 cursor-default">
                  {entry}
                  <button
                    type="button"
                    aria-label={`Remove ${entry}`}
                    className="ml-1 hover:text-destructive transition-colors"
                    onClick={() => removeEntry(category.key, entry)}
                  >
                    x
                  </button>
                </Badge>
              ))}
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => addEntry(category.key, category.placeholder)}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AnimatedCard>
  )
}

function LinksSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const updateLink = (field: "linkedin" | "github" | "portfolio", value: string) => {
    setProfile((p) => ({
      ...p,
      personalInfo: { ...p.personalInfo, [field]: value },
    }))
  }

  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Links</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            value={profile.personalInfo.linkedin}
            placeholder="e.g. linkedin.com/in/timothy-lyon"
            onChange={(e) => updateLink("linkedin", e.target.value)}
          />
          <FieldHint>linkedin.com/in/timothy-lyon</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="github">Bar Profile / Directory (optional)</Label>
          <Input
            id="github"
            value={profile.personalInfo.github}
            placeholder="e.g. calbar.ca.gov/attorneys/12345"
            onChange={(e) => updateLink("github", e.target.value)}
          />
          <FieldHint>calbar.ca.gov/attorneys/12345</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolio">Personal Website / Writing Samples (optional)</Label>
          <Input
            id="portfolio"
            value={profile.personalInfo.portfolio}
            placeholder="e.g. timothylyon.com"
            onChange={(e) => updateLink("portfolio", e.target.value)}
          />
          <FieldHint>timothylyon.com</FieldHint>
        </div>
      </div>
    </AnimatedCard>
  )
}

function FilesSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [isImporting, setIsImporting] = useState(false)

  const handleFilesUploaded = async (files: File[]) => {
    const resumeFile = files[0]
    if (!resumeFile) return

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append("resume", resumeFile)

      const response = await fetch("/api/import-profile-from-resume", {
        method: "POST",
        body: formData,
      })
      const contentType = response.headers.get("content-type") || ""
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: (await response.text()).slice(0, 200) }

      if (!response.ok) {
        throw new Error(data.error || "Resume import failed")
      }

      if (!data.profile) {
        throw new Error("Resume import did not return profile data")
      }

      const importedProfile = data.profile as Profile
      const nextProfile = mergeProfileFromResume(profile, importedProfile)
      const counts = getImportCounts(importedProfile)

      setProfile(nextProfile)
      saveMasterProfile(nextProfile, "resume_import")
      toast.success(
        `Resume imported: ${counts.experience} experience, ${counts.projects} projects, ${counts.skills} skills.`
      )

      if (data.tokenUsage) {
        console.info("Resume import token usage", data.tokenUsage)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume import failed")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <AnimatedCard hover={false}>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Uploaded Files</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Upload a resume to update your profile knowledge base automatically.
      </p>
      <FileUploadZone
        onFilesUploaded={handleFilesUploaded}
        accept=".pdf,.doc,.docx,.txt,.md,.text"
        maxFiles={1}
      />
      {isImporting && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading resume and updating your profile...
        </div>
      )}
    </AnimatedCard>
  )
}
