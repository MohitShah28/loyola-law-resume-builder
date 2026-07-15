// Example profile for a Loyola Law School student
export const PROFILE_KNOWLEDGE_BASE_VERSION = "2026-07-loyola-law-student-example"

export const mockProfile = {
  personalInfo: {
    firstName: "Jordan",
    lastName: "Rivera",
    email: "jordan.rivera@lls.edu",
    phone: "+1 (213) 555-0164",
    location: "Los Angeles, CA",
    linkedin: "linkedin.com/in/jordanrivera-law",
    github: "",
    portfolio: "",
    summary: "J.D. candidate at LMU Loyola Law School with experience in legal research, persuasive and objective writing, and courtroom advocacy. Background spans judicial externship work, public interest litigation support, moot court competition, and law review editing. Skilled in Westlaw and Lexis research, motion drafting, Bluebook cite-checking, and client-centered lawyering. Seeking judicial clerkship, firm associate, or public interest opportunities."
  },
  education: [
    {
      id: "1",
      institution: "LMU Loyola Law School",
      degree: "Juris Doctor",
      field: "Law",
      startDate: "2024",
      endDate: "2027",
      gpa: "3.6/4.00"
    },
    {
      id: "2",
      institution: "University of California, Santa Barbara",
      degree: "Bachelor of Arts",
      field: "Political Science",
      startDate: "2020",
      endDate: "2024",
      gpa: "3.7/4.00"
    }
  ],
  experience: [
    {
      id: "1",
      company: "United States District Court, Central District of California",
      position: "Judicial Extern to the Honorable Maria T. Alvarez",
      location: "Los Angeles, CA",
      startDate: "May 2026",
      endDate: "Aug 2026",
      description: [
        "Drafted bench memoranda analyzing motions to dismiss, motions for summary judgment, and discovery disputes in civil matters",
        "Researched federal civil procedure, employment discrimination, and Section 1983 issues using Westlaw and Lexis",
        "Observed hearings, settlement conferences, and a three-day jury trial, and summarized proceedings for chambers",
        "Cite-checked draft orders and opinions for accuracy and Bluebook conformity before filing",
        "Prepared case summaries and docket status reports to assist law clerks in managing a 300+ case civil docket"
      ]
    },
    {
      id: "2",
      company: "Public Counsel",
      position: "Law Clerk, Consumer Rights Practice",
      location: "Los Angeles, CA",
      startDate: "Sep 2025",
      endDate: "Apr 2026",
      description: [
        "Conducted client intake interviews in English and Spanish for low-income consumers facing debt collection actions",
        "Drafted answers, discovery requests, and settlement demand letters in unlawful debt collection and auto fraud cases",
        "Researched California consumer protection statutes including the Rosenthal Act, CLRA, and UCL to support litigation strategy",
        "Prepared declarations and exhibits for opposition to summary judgment that contributed to a favorable settlement",
        "Presented know-your-rights workshops on debt collection defense to community organizations"
      ]
    },
    {
      id: "3",
      company: "Ramirez & Cole LLP",
      position: "Summer Law Clerk",
      location: "Los Angeles, CA",
      startDate: "Jun 2025",
      endDate: "Aug 2025",
      description: [
        "Drafted research memoranda on breach of contract, trade secret, and employment law questions for litigation partners",
        "Assisted in deposition preparation by summarizing transcripts and organizing exhibit binders",
        "Drafted sections of a demurrer and a motion to compel further discovery responses filed in California Superior Court",
        "Reviewed and coded documents for privilege and responsiveness in a commercial dispute using Relativity"
      ]
    }
  ],
  projects: [
    {
      id: "1",
      name: "Loyola of Los Angeles Law Review",
      description: "Staff Editor for Volume 60, responsible for cite-checking, source gathering, and editing scholarly articles for publication.",
      technologies: ["Bluebook", "Legal Research", "Westlaw", "HeinOnline", "Academic Editing"],
      link: "",
      highlights: [
        "Cite-checked 200+ footnotes across three scholarly articles for substantive accuracy and Bluebook conformity",
        "Drafted a case note examining the circuit split on standing in data breach class actions",
        "Collaborated with executive editors on line edits and source verification under publication deadlines"
      ]
    },
    {
      id: "2",
      name: "Scott Moot Court Honors Board",
      description: "Selected member of Loyola's moot court program; briefed and argued a simulated appellate case in intramural competition.",
      technologies: ["Appellate Advocacy", "Brief Writing", "Oral Argument", "Legal Analysis"],
      link: "",
      highlights: [
        "Authored a 35-page appellate brief on Fourth Amendment digital search issues",
        "Advanced to quarterfinals in intramural competition and received a best oral advocate ballot",
        "Fielded rapid-fire bench questioning while defending both petitioner and respondent positions"
      ]
    },
    {
      id: "3",
      name: "Loyola Project for the Innocent (Clinic)",
      description: "Clinical coursework investigating claims of wrongful conviction for incarcerated clients.",
      technologies: ["Post-Conviction Review", "Record Analysis", "Witness Interviews", "Habeas Corpus"],
      link: "",
      highlights: [
        "Reviewed trial transcripts, police reports, and forensic records to evaluate innocence claims",
        "Drafted an investigation plan and witness interview outlines approved by supervising attorneys",
        "Summarized findings in a case evaluation memorandum recommending further DNA testing"
      ]
    }
  ],
  skills: {
    programming: ["Westlaw", "LexisNexis", "Bloomberg Law", "HeinOnline", "PACER / CM/ECF"],
    dataAnalysis: [
      "Legal Research",
      "Legal Writing",
      "Bench Memoranda",
      "Motion Drafting",
      "Appellate Brief Writing",
      "Bluebook Citation",
      "Case Briefing",
      "Contract Review",
      "Discovery Drafting",
      "Deposition Summaries",
      "Client Interviewing",
      "Oral Advocacy",
      "Negotiation",
      "Statutory Interpretation",
      "Trial Preparation"
    ],
    visualization: ["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Adobe Acrobat"],
    databases: ["Relativity", "Everlaw", "Clio"],
    cloud: [] as string[],
    tools: ["Spanish (professional working proficiency)", "Notary Public (California)"]
  },
  certifications: [] as Array<{
    id: string
    name: string
    issuer: string
    date: string
    credentialId: string
  }>,
  achievements: [] as string[]
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
