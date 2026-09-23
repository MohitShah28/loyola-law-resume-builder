// Demo profile: a FICTIONAL Loyola J.D. student shown as an example for real
// students. The person is invented; the programs, credentials, and terminology
// are real and were verified in September 2026:
//   Loyola of Los Angeles Law Review (masthead calls non-board students "Staff")
//     https://www.lls.edu/academics/lawreviews/
//   Byrne Trial Advocacy Team (trial team; members chosen in the fall)
//     https://www.lls.edu/academics/experientiallearning/mootcourttrialadvocacyprograms/
//   Loyola Immigrant Justice Clinic (part of the Loyola Social Justice Law Clinic)
//     https://www.lls.edu/academics/experientiallearning/clinics/loyolaimmigrantjusticeclinic/
//   Latinx Law Students Association (LLSA)
//     https://studentaffairs.lls.edu/student-organizations/latinx-law-students-association
//   St. Thomas More Law Honor Society (top 15% of the class)
//     https://studentaffairs.lls.edu/student-organizations/st-thomas-more-law-honor-society
//   Certified Law Student Program (renamed from PTLS); Cal. Rules of Court 9.42
//     https://www.calbar.ca.gov/admissions/special-admissions/certified-law-student-program
//   CALI Excellence for the Future Award  https://www.cali.org/awards
// Clinic bullets follow rule 9.42(e): a certified law student appears in court
// only with the supervising attorney personally present, and the supervising
// attorney reads, approves, and signs the student's documents.
// Changing this replaces every saved profile with the demo profile and clears
// generated resumes (see lib/profile-storage.ts). Change only on purpose.
export const PROFILE_KNOWLEDGE_BASE_VERSION = "2026-09-loyola-jd-verified"

export const mockProfile = {
  personalInfo: {
    firstName: "Sofia",
    lastName: "Martinez",
    email: "sofia.martinez@lls.edu",
    phone: "(213) 555-0147",
    location: "Los Angeles, CA",
    linkedin: "linkedin.com/in/sofia-martinez-jd",
    github: "",
    portfolio: "",
    summary: "Third-year J.D. candidate at LMU Loyola Law School focused on litigation and public interest law. Certified law student in the Loyola Immigrant Justice Clinic, judicial extern in the Central District of California, and Loyola of Los Angeles Law Review staff member, with strengths in legal research and writing, motion practice, and bilingual (Spanish/English) client work."
  },
  // Bar Admission prints admissions, then U.S. bar exams, then any extra
  // free-text lines from barAdmission (see lib/resume-document.ts).
  barDetails: {
    admissions: [] as Array<{ id: string; jurisdiction: string; year: string }>,
    usBarExams: [
      { id: "1", jurisdiction: "California", examDate: "July 2027", status: "registered" }
    ] as Array<{ id: string; jurisdiction: string; examDate: string; status: string }>
  },
  barAdmission: [] as string[],
  // International students: status + dates build the Work Authorization line.
  // A typed-in workAuthorization line overrides it. needsSponsorship is never
  // printed; it only informs AI tailoring. Empty status = section omitted.
  workAuthorizationDetails: {
    status: "us-citizen",
    startDate: "",
    endDate: "",
    needsSponsorship: "no"
  },
  workAuthorization: "",
  education: [
    {
      id: "1",
      institution: "LMU Loyola Law School",
      location: "Los Angeles, CA",
      degree: "J.D. Candidate",
      field: "",
      startDate: "August 2024",
      endDate: "May 2027",
      gpa: "3.62",
      coursework: [
        "Evidence",
        "Federal Courts",
        "Immigration Law",
        "Trial Advocacy",
        "Advanced Legal Research & Writing"
      ] as string[],
      activities: [
        "Loyola of Los Angeles Law Review, Staff Member (Fall 2025 – Present)",
        "Byrne Trial Advocacy Team, Member (Fall 2025 – Present)",
        "Latinx Law Students Association (LLSA), Treasurer (Fall 2025 – Present)"
      ] as string[]
    },
    {
      id: "2",
      institution: "University of California, Los Angeles",
      location: "Los Angeles, CA",
      degree: "Bachelor of Arts",
      field: "Political Science",
      startDate: "September 2019",
      endDate: "June 2023",
      gpa: "cum laude",
      coursework: [] as string[],
      activities: [
        "Mock Trial Team, Captain (Fall 2021 – Spring 2023)"
      ] as string[]
    }
  ],
  experience: [
    {
      id: "1",
      company: "Loyola Immigrant Justice Clinic",
      position: "Certified Law Student",
      location: "Los Angeles, CA",
      startDate: "January 2026",
      endDate: "Present",
      description: [
        "Represent immigrant clients in removal defense and humanitarian relief matters under the supervision of a licensed attorney",
        "Conduct client intake interviews and factual investigations in Spanish and English at community clinics in East Los Angeles",
        "Draft declarations, legal memoranda, and asylum applications reviewed and signed by the supervising attorney",
        "Appear at immigration court hearings with the supervising attorney present, as permitted for certified law students"
      ]
    },
    {
      id: "2",
      company: "United States District Court, Central District of California",
      position: "Judicial Extern",
      location: "Los Angeles, CA",
      startDate: "May 2026",
      endDate: "August 2026",
      description: [
        "Drafted bench memoranda on motions to dismiss and motions for summary judgment",
        "Researched federal civil procedure and Section 1983 issues using Westlaw and Lexis",
        "Cite-checked draft orders for accuracy and Bluebook conformity",
        "Observed hearings, settlement conferences, and a three-day jury trial"
      ]
    },
    {
      id: "3",
      company: "Bet Tzedek Legal Services",
      position: "Summer Law Clerk",
      location: "Los Angeles, CA",
      startDate: "Summer 2025",
      endDate: "",
      description: [
        "Drafted research memoranda on wage-and-hour, housing, and elder law questions for staff attorneys",
        "Prepared client intake summaries and demand letters reviewed by supervising attorneys",
        "Organized case files and reviewed client documents for eligibility and deadlines"
      ]
    }
  ],
  // Kept for older saved profiles and resume imports. Activities now live on
  // each education entry, matching the Loyola template.
  projects: [] as Array<{
    id: string
    name: string
    description: string
    technologies: string[]
    link: string
    highlights: string[]
  }>,
  // Profile labels: programming = Research Platforms, dataAnalysis = Legal
  // Skills, visualization = Technology & Office Software, databases = Practice
  // & Litigation Tools, tools = Additional. cloud is unused.
  skills: {
    programming: ["Westlaw", "Lexis", "Bloomberg Law", "HeinOnline", "PACER/CM-ECF"] as string[],
    dataAnalysis: [
      "Legal Research & Writing",
      "Bench Memoranda",
      "Motion Drafting",
      "Bluebook Citation",
      "Client Interviewing",
      "Trial Advocacy"
    ] as string[],
    visualization: ["Microsoft Word", "Microsoft Excel", "Adobe Acrobat"] as string[],
    databases: ["Relativity", "Clio"] as string[],
    cloud: [] as string[],
    tools: ["Spanish–English legal interpretation"] as string[]
  },
  certifications: [
    {
      id: "1",
      name: "Certified Law Student",
      issuer: "State Bar of California, Certified Law Student Program",
      date: "January 2026",
      credentialId: ""
    }
  ] as Array<{
    id: string
    name: string
    issuer: string
    date: string
    credentialId: string
  }>,
  achievements: [
    "St. Thomas More Law Honor Society (top 15% of class)",
    "CALI Excellence for the Future Award, Legal Research and Writing (Spring 2025)"
  ] as string[],
  additionalInfo: {
    languages: ["Spanish (fluent)", "English (native)"] as string[],
    volunteer: ["Los Angeles Superior Court Self-Help Legal Access Center, Volunteer (Fall 2024 – Present)"] as string[],
    memberships: [
      "Mexican American Bar Association, Law Student Member (Fall 2024 – Present)",
      "Los Angeles County Bar Association, Law Student Member (Fall 2024 – Present)"
    ] as string[],
    interests: ["Distance running, Latin American history, and cooking"] as string[]
  }
}

export const mockResumes = [
  {
    id: "1",
    jobTitle: "Judicial Law Clerk",
    company: "U.S. District Court, C.D. Cal.",
    atsScore: 93,
    createdAt: "2026-06-15",
    template: "University Law",
    status: "completed"
  },
  {
    id: "2",
    jobTitle: "Summer Associate",
    company: "O'Melveny & Myers",
    atsScore: 89,
    createdAt: "2026-06-10",
    template: "University Law",
    status: "completed"
  },
  {
    id: "3",
    jobTitle: "Law Clerk",
    company: "Los Angeles County Public Defender",
    atsScore: 94,
    createdAt: "2026-06-05",
    template: "Harvard",
    status: "completed"
  },
  {
    id: "4",
    jobTitle: "Legal Intern",
    company: "ACLU of Southern California",
    atsScore: 87,
    createdAt: "2026-05-28",
    template: "University Law",
    status: "completed"
  },
  {
    id: "5",
    jobTitle: "Certified Law Clerk",
    company: "L.A. City Attorney's Office",
    atsScore: 91,
    createdAt: "2026-05-20",
    template: "Executive",
    status: "completed"
  }
]

export const dashboardStats = {
  totalResumes: 24,
  avgAtsScore: 89,
  applicationsPrepared: 18,
  profileCompletion: 85
}

export const recentActivity = [
  { id: "1", action: "Generated resume for judicial clerkship application", time: "2 hours ago" },
  { id: "2", action: "Updated externship experience", time: "5 hours ago" },
  { id: "3", action: "Added moot court honors", time: "1 day ago" },
  { id: "4", action: "Generated resume for summer associate role", time: "3 days ago" },
  { id: "5", action: "Updated legal skills section", time: "5 days ago" }
]
