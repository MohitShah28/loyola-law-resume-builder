import { PROFILE_KNOWLEDGE_BASE_VERSION, mockProfile } from "@/lib/data"
import type { GeneratedResume, ProfileData } from "@/lib/resume-generator"

const MASTER_PROFILE_KEY = "master_profile"
const MASTER_PROFILE_VERSION_KEY = "master_profile_version"
const LEGACY_PROFILE_KEY = "resumeProfile"
const LATEST_GENERATED_RESUME_KEY = "generatedResume"
const GENERATED_RESUMES_KEY = "generated_resumes"

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

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

export function loadMasterProfile(): ProfileData {
  const savedProfileVersion = typeof window !== "undefined" ? window.localStorage.getItem(MASTER_PROFILE_VERSION_KEY) : null
  if (savedProfileVersion !== PROFILE_KNOWLEDGE_BASE_VERSION) {
    window.localStorage.setItem(MASTER_PROFILE_VERSION_KEY, PROFILE_KNOWLEDGE_BASE_VERSION)
    window.localStorage.setItem(MASTER_PROFILE_KEY, JSON.stringify(cloneProfile(mockProfile)))
    return cloneProfile(mockProfile)
  }

  const savedProfile = readJson<ProfileData>(MASTER_PROFILE_KEY) || readJson<ProfileData>(LEGACY_PROFILE_KEY)
  return stripRemovedProjects(cloneProfile(savedProfile || mockProfile))
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
  return readJson<GeneratedResume>(LATEST_GENERATED_RESUME_KEY)
}

export function clearLatestGeneratedResume() {
  window.localStorage.removeItem(LATEST_GENERATED_RESUME_KEY)
}
