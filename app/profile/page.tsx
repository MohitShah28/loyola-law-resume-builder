"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  GraduationCap,
  Briefcase,
  FolderGit2,
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
  Loader2
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

const sections = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "experience", label: "Work Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Technical Skills", icon: Code2 },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "files", label: "Uploaded Files", icon: FileUp },
]

type Profile = ProfileData
type SetProfile = React.Dispatch<React.SetStateAction<Profile>>

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
                {activeSection === "education" && (
                  <EducationSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "experience" && (
                  <ExperienceSection profile={profile} setProfile={setProfile} />
                )}
                {activeSection === "projects" && (
                  <ProjectsSection profile={profile} setProfile={setProfile} />
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
            value={profile.personalInfo.firstName}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, firstName: e.target.value }
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={profile.personalInfo.lastName}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, lastName: e.target.value }
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profile.personalInfo.email}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, email: e.target.value }
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={profile.personalInfo.phone}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, phone: e.target.value }
            }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={profile.personalInfo.location}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, location: e.target.value }
            }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            rows={4}
            value={profile.personalInfo.summary}
            onChange={(e) => setProfile(p => ({
              ...p,
              personalInfo: { ...p.personalInfo, summary: e.target.value }
            }))}
          />
        </div>
      </div>
    </AnimatedCard>
  )
}

function EducationSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [expanded, setExpanded] = useState<string | null>(profile.education[0]?.id || null)
  const updateEducation = (id: string, field: keyof Profile["education"][number], value: string) => {
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
        { id, institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" },
      ],
    }))
    setExpanded(id)
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
                <p className="text-sm text-muted-foreground">{edu.degree} in {edu.field}</p>
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
                        <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input value={edu.field} onChange={(e) => updateEducation(edu.id, "field", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>GPA</Label>
                        <Input value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input value={edu.startDate} onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input value={edu.endDate} onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)} />
                      </div>
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
                        <Label>Company</Label>
                        <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Input value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bullet Points</Label>
                      {exp.description.map((bullet, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input value={bullet} className="flex-1" onChange={(e) => updateBullet(exp.id, idx, e.target.value)} />
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

function ProjectsSection({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [expanded, setExpanded] = useState<string | null>(profile.projects[0]?.id || null)
  const [technologyInputs, setTechnologyInputs] = useState<Record<string, string>>({})

  const updateProject = (id: string, field: keyof Profile["projects"][number], value: string) => {
    setProfile((p) => ({
      ...p,
      projects: p.projects.map((project) =>
        project.id === id ? { ...project, [field]: value } : project
      ),
    }))
  }
  const addProject = () => {
    const id = createId()
    setProfile((p) => ({
      ...p,
      projects: [
        ...p.projects,
        { id, name: "", description: "", technologies: [], link: "", highlights: [] },
      ],
    }))
    setExpanded(id)
  }
  const removeProject = (id: string) => {
    setProfile((p) => ({ ...p, projects: p.projects.filter((project) => project.id !== id) }))
    setExpanded((current) => (current === id ? null : current))
  }
  const removeTechnology = (id: string, technology: string) => {
    setProfile((p) => ({
      ...p,
      projects: p.projects.map((project) =>
        project.id === id
          ? { ...project, technologies: project.technologies.filter((tech) => tech !== technology) }
          : project
      ),
    }))
  }
  const addTechnology = (id: string) => {
    const technology = technologyInputs[id]?.trim()
    if (!technology) return

    setProfile((p) => ({
      ...p,
      projects: p.projects.map((project) =>
        project.id === id && !project.technologies.some((tech) => tech.toLowerCase() === technology.toLowerCase())
          ? { ...project, technologies: [...project.technologies, technology] }
          : project
      ),
    }))
    setTechnologyInputs((inputs) => ({ ...inputs, [id]: "" }))
  }

  return (
    <AnimatedCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={addProject}>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>
      <div className="space-y-4">
        {profile.projects.map((project) => (
          <motion.div
            key={project.id}
            layout
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === project.id ? null : project.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-foreground">{project.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.technologies.slice(0, 3).map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                  ))}
                  {project.technologies.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{project.technologies.length - 3}</Badge>
                  )}
                </div>
              </div>
              <motion.div animate={{ rotate: expanded === project.id ? 180 : 0 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === project.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-border space-y-4">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input value={project.name} onChange={(e) => updateProject(project.id, "name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={project.description} rows={3} onChange={(e) => updateProject(project.id, "description", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Link</Label>
                      <Input value={project.link} onChange={(e) => updateProject(project.id, "link", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Technologies</Label>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="gap-1">
                            {tech}
                            <button className="ml-1 hover:text-destructive" onClick={() => removeTechnology(project.id, tech)}>x</button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={technologyInputs[project.id] || ""}
                          onChange={(e) => setTechnologyInputs((inputs) => ({ ...inputs, [project.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addTechnology(project.id)
                            }
                          }}
                          placeholder="Add technology or skill"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => addTechnology(project.id)}>
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => removeProject(project.id)}>
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
    { key: "programming", label: "Programming Languages" },
    { key: "dataAnalysis", label: "Data Analysis & Machine Learning" },
    { key: "visualization", label: "Visualization & Business Intelligence" },
    { key: "databases", label: "Databases" },
    { key: "tools", label: "Tools & Frameworks" },
  ] as const

  const addSkill = (category: keyof Profile["skills"]) => {
    const skill = window.prompt("Enter a skill")
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
      <h2 className="text-lg font-semibold mb-6 text-foreground">Technical Skills</h2>
      <div className="space-y-6">
        {skillCategories.map((category) => (
          <div key={category.key} className="space-y-2">
            <Label>{category.label}</Label>
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
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => addSkill(category.key)}>
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
              <Input value={cert.name} placeholder="Certification name" onChange={(e) => updateCertification(cert.id, "name", e.target.value)} />
              <Input value={cert.issuer} placeholder="Issuer" onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)} />
              <Input value={cert.date} placeholder="Date" onChange={(e) => updateCertification(cert.id, "date", e.target.value)} />
              <Input value={cert.credentialId} placeholder="Credential ID" onChange={(e) => updateCertification(cert.id, "credentialId", e.target.value)} />
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
            <Input value={achievement} className="flex-1" onChange={(e) => updateAchievement(index, e.target.value)} />
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAchievement(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
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
            placeholder="linkedin.com/in/username"
            onChange={(e) => updateLink("linkedin", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github">GitHub</Label>
          <Input
            id="github"
            value={profile.personalInfo.github}
            placeholder="github.com/username"
            onChange={(e) => updateLink("github", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolio">Portfolio</Label>
          <Input
            id="portfolio"
            value={profile.personalInfo.portfolio}
            placeholder="yourportfolio.com"
            onChange={(e) => updateLink("portfolio", e.target.value)}
          />
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
