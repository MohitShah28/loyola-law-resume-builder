import { PROFILE_KNOWLEDGE_BASE_VERSION, mockProfile } from "@/lib/data"
import type { GeneratedResume, ProfileData } from "@/lib/resume-generator"

const MASTER_PROFILE_KEY = "master_profile"
const MASTER_PROFILE_VERSION_KEY = "master_profile_version"
const LEGACY_PROFILE_KEY = "resumeProfile"
const LATEST_GENERATED_RESUME_KEY = "generatedResume"
const GENERATED_RESUMES_KEY = "generated_resumes"
const LATEST_COVER_LETTER_KEY = "generatedCoverLetter"
const COVER_LETTERS_KEY = "generated_cover_letters"

type ProfileSaveSource = "profile_management" | "resume_generation" | "resume_import"

export type StoredGeneratedResume = {
  id: string
  label: string
  resume: GeneratedResume
  createdAt: string
  jobDescription?: string
  generationWarning?: string
}

function cloneProfile(profile: ProfileData): ProfileData {
  return structuredClone(profile)
}

// Projects removed from the knowledge base; filtered out of previously saved
// profiles on load so removal doesn't require a full profile reset.
const REMOVED_PROJECT_NAMES = new Set(["portfolio website and analytics case studies"])

function stripRemovedProjects(profile: ProfileData): ProfileData {
  return {
    ...profile,
    projects: (profile.projects || []).filter(
      (project) => !REMOVED_PROJECT_NAMES.has((project.name || "").trim().toLowerCase())
    ),
  }
}

// Backfills fields added after a profile was first saved, so profiles saved
// under an older schema version don't crash on the new Bar Admission / Work
// Authorization / Additional Information sections or education location and
// activities. Bumping PROFILE_KNOWLEDGE_BASE_VERSION would instead replace the
// saved profile with the demo profile, so new fields are backfilled here.
function withNewFieldDefaults(profile: ProfileData): ProfileData {
  const education = profile.education || []
  // One-time move: profiles saved before education had "activities" kept them
  // in the old Activities & Leadership (projects) list. Carry their names over
  // to the first (law school) entry; once saved, activities is always an array.
  const isLegacyEducation = education.some((edu) => !Array.isArray(edu.activities))
  const legacyActivities = isLegacyEducation
    ? (profile.projects || []).map((project) => (project.name || "").trim()).filter(Boolean)
    : []

  return {
    ...profile,
    education: education.map((edu, index) => ({
      ...edu,
      location: edu.location || "",
      activities: Array.isArray(edu.activities) ? edu.activities : index === 0 ? legacyActivities : [],
      // Coursework was added after the demo profile shipped; seed the demo
      // entries from the demo profile so the example stays complete without
      // resetting a real student's saved profile.
      coursework: Array.isArray(edu.coursework)
        ? edu.coursework
        : mockProfile.education.find((demo) => demo.institution === edu.institution)?.coursework || [],
    })),
    barAdmission: profile.barAdmission || [],
    barDetails: {
      admissions: profile.barDetails?.admissions || [],
      usBarExams: profile.barDetails?.usBarExams || [],
    },
    workAuthorization: profile.workAuthorization || "",
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
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

// A new PROFILE_KNOWLEDGE_BASE_VERSION starts over: the saved profile is
// replaced by the demo profile and resumes generated from the old profile are
// cleared, so no earlier student's details remain in this browser.
function syncKnowledgeBaseVersion() {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(MASTER_PROFILE_VERSION_KEY) === PROFILE_KNOWLEDGE_BASE_VERSION) return false

  window.localStorage.setItem(MASTER_PROFILE_VERSION_KEY, PROFILE_KNOWLEDGE_BASE_VERSION)
  window.localStorage.setItem(MASTER_PROFILE_KEY, JSON.stringify(cloneProfile(mockProfile)))
  window.localStorage.removeItem(LEGACY_PROFILE_KEY)
  window.localStorage.removeItem(LATEST_GENERATED_RESUME_KEY)
  window.localStorage.removeItem(GENERATED_RESUMES_KEY)
  window.localStorage.removeItem(LATEST_COVER_LETTER_KEY)
  window.localStorage.removeItem(COVER_LETTERS_KEY)
  return true
}

export function loadMasterProfile(): ProfileData {
  if (syncKnowledgeBaseVersion()) return cloneProfile(mockProfile)

  const savedProfile = readJson<ProfileData>(MASTER_PROFILE_KEY) || readJson<ProfileData>(LEGACY_PROFILE_KEY)
  return withNewFieldDefaults(stripRemovedProjects(cloneProfile(savedProfile || mockProfile)))
}

export function createProfileWorkingCopy(): ProfileData {
  return cloneProfile(loadMasterProfile())
}

export function saveMasterProfile(profile: ProfileData, source: ProfileSaveSource) {
  if (source !== "profile_management") {
    throw new Error("Blocked profile update outside Profile Management.")
  }

  window.localStorage.setItem(MASTER_PROFILE_KEY, JSON.stringify(cloneProfile(profile)))
  window.localStorage.setItem(MASTER_PROFILE_VERSION_KEY, PROFILE_KNOWLEDGE_BASE_VERSION)
}

// Adds keywords the student confirmed they genuinely have to the master
// profile, so the next generated resume can include them. Called from the
// preview's "Missing From Profile" list.
export function addSkillsToMasterProfile(skills: string[]) {
  const profile = loadMasterProfile()
  const existing = new Set(
    Object.values(profile.skills).flat().map((skill) => skill.toLowerCase().trim())
  )
  const additions = skills
    .map((skill) => skill.trim())
    .filter((skill) => skill && !existing.has(skill.toLowerCase()))
  if (!additions.length) return { profile, added: [] as string[] }

  const updated: ProfileData = {
    ...profile,
    skills: { ...profile.skills, tools: [...profile.skills.tools, ...additions] },
  }
  window.localStorage.setItem(MASTER_PROFILE_KEY, JSON.stringify(cloneProfile(updated)))
  window.localStorage.setItem(MASTER_PROFILE_VERSION_KEY, PROFILE_KNOWLEDGE_BASE_VERSION)
  return { profile: updated, added: additions }
}

const MAX_STORED_RESUMES = 30

export function saveGeneratedResume(
  resume: GeneratedResume,
  options?: { jobDescription?: string; generationWarning?: string }
) {
  const storedResume: StoredGeneratedResume = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: [resume.jobTitle, resume.company !== "Target Company" ? resume.company : ""].filter(Boolean).join(" @ ") || "Resume",
    resume,
    createdAt: new Date().toISOString(),
    jobDescription: options?.jobDescription,
    generationWarning: options?.generationWarning,
  }
  const generatedResumes = readJson<StoredGeneratedResume[]>(GENERATED_RESUMES_KEY) || []

  window.localStorage.setItem(LATEST_GENERATED_RESUME_KEY, JSON.stringify(resume))
  window.localStorage.setItem(
    GENERATED_RESUMES_KEY,
    JSON.stringify([storedResume, ...generatedResumes].slice(0, MAX_STORED_RESUMES))
  )
}

export function loadGeneratedResumes(): StoredGeneratedResume[] {
  syncKnowledgeBaseVersion()
  return readJson<StoredGeneratedResume[]>(GENERATED_RESUMES_KEY) || []
}

export function deleteGeneratedResume(id: string) {
  const remaining = loadGeneratedResumes().filter((entry) => entry.id !== id)
  window.localStorage.setItem(GENERATED_RESUMES_KEY, JSON.stringify(remaining))
  return remaining
}

export function openGeneratedResume(resume: GeneratedResume) {
  window.localStorage.setItem(LATEST_GENERATED_RESUME_KEY, JSON.stringify(resume))
}

export function loadLatestGeneratedResume() {
  syncKnowledgeBaseVersion()
  return readJson<GeneratedResume>(LATEST_GENERATED_RESUME_KEY)
}

export type StoredCoverLetter = {
  id: string
  label: string
  createdAt: string
  jobTitle: string
  organization: string
  recipient: string
  jobDescription: string
  modelUsed?: string
  content: { subject: string; greeting: string; paragraphs: string[]; closing: string }
  // Job-match analysis captured at generation time. Optional so letters saved
  // before this feature still load.
  matchedKeywords?: string[]
  missingKeywords?: string[]
  atsScore?: number
}

const MAX_STORED_COVER_LETTERS = 30

export function saveCoverLetter(letter: Omit<StoredCoverLetter, "id" | "createdAt">) {
  const stored: StoredCoverLetter = {
    ...letter,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const existing = readJson<StoredCoverLetter[]>(COVER_LETTERS_KEY) || []
  window.localStorage.setItem(LATEST_COVER_LETTER_KEY, JSON.stringify(stored))
  window.localStorage.setItem(
    COVER_LETTERS_KEY,
    JSON.stringify([stored, ...existing].slice(0, MAX_STORED_COVER_LETTERS))
  )
  return stored
}

export function loadLatestCoverLetter() {
  syncKnowledgeBaseVersion()
  return readJson<StoredCoverLetter>(LATEST_COVER_LETTER_KEY)
}

export function loadCoverLetters(): StoredCoverLetter[] {
  syncKnowledgeBaseVersion()
  return readJson<StoredCoverLetter[]>(COVER_LETTERS_KEY) || []
}

export function deleteCoverLetter(id: string) {
  const remaining = loadCoverLetters().filter((entry) => entry.id !== id)
  window.localStorage.setItem(COVER_LETTERS_KEY, JSON.stringify(remaining))
  return remaining
}

export function clearLatestGeneratedResume() {
  window.localStorage.removeItem(LATEST_GENERATED_RESUME_KEY)
}
