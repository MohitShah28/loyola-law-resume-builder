import type { ProfileData } from "@/lib/resume-generator"

// The official Loyola Law sample resume (Timothy Lyon, LL.M.) as profile data.
// Tests render it and compare against the sample line by line.
export const loyolaSampleProfile: ProfileData = {
  personalInfo: {
    firstName: "Timothy",
    lastName: "Lyon",
    email: "timothy.lyon@lls.edu",
    phone: "(310) 555-1234",
    location: "Los Angeles, CA",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "LL.M. candidate at LMU Loyola Law School focusing on Entertainment Law, with four years of practice as a licensed associate in British Columbia advising clients on regulatory compliance and corporate transactions."
  },
  // Bar Admission prints admissions, then U.S. bar exams, then any extra
  // free-text lines from barAdmission (see lib/resume-document.ts).
  barDetails: {
    admissions: [
      { id: "1", jurisdiction: "British Columbia", year: "2017" }
    ] as Array<{ id: string; jurisdiction: string; year: string }>,
    usBarExams: [
      { id: "1", jurisdiction: "California", examDate: "July 2022", status: "registered" }
    ] as Array<{ id: string; jurisdiction: string; examDate: string; status: string }>
  },
  barAdmission: [] as string[],
  // International students: status + dates build the Work Authorization line.
  // A typed-in workAuthorization line overrides it. needsSponsorship is never
  // printed; it only informs AI tailoring.
  workAuthorizationDetails: {
    status: "f1-opt",
    startDate: "",
    endDate: "",
    needsSponsorship: ""
  },
  workAuthorization: "Anticipated OPT start date [insert date]",
  education: [
    {
      id: "1",
      institution: "LMU Loyola Law School",
      location: "Los Angeles, CA",
      degree: "LL.M. Candidate with focus on Entertainment Law",
      field: "",
      startDate: "August 2021",
      endDate: "May 2022",
      gpa: "",
      coursework: [] as string[],
      activities: [
        "Intellectual Property Law Society, Secretary (Fall 2021 – Present)",
        "Business Law Society, Member (Fall 2021 – Present)"
      ] as string[]
    },
    {
      id: "2",
      institution: "University of Alberta",
      location: "Edmonton, AB",
      degree: "Bachelor of Laws",
      field: "",
      startDate: "September 2014",
      endDate: "May 2017",
      gpa: "With Distinction",
      coursework: [] as string[],
      activities: [] as string[]
    },
    {
      id: "3",
      institution: "University of British Columbia",
      location: "Vancouver, B.C.",
      degree: "Bachelor of Arts",
      field: "International Relations",
      startDate: "September 2012",
      endDate: "May 2016",
      gpa: "",
      coursework: [] as string[],
      activities: [] as string[]
    }
  ],
  experience: [
    {
      id: "1",
      company: "Blake, Cassels & Graydon LLP",
      position: "Associate",
      location: "Vancouver, B.C.",
      startDate: "August 2017",
      endDate: "June 2021",
      description: [
        "Provided strategic advice to clients regarding risk management and compliance",
        "Represented clients in the defense and resolution of regulatory charges",
        "Assisted with environmental and Indigenous due diligence for successful corporate transactions"
      ]
    },
    {
      id: "2",
      company: "Diamond & Diamond Lawyers LLP",
      position: "Law Clerk",
      location: "Vancouver, B.C.",
      startDate: "Summer 2016",
      endDate: "",
      description: [
        "Performed complex legal research",
        "Conducted fact investigations and interviewed clients",
        "Drafted research memoranda and discovery"
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
  skills: {
    programming: [] as string[],
    dataAnalysis: [] as string[],
    visualization: [] as string[],
    databases: [] as string[],
    cloud: [] as string[],
    tools: [] as string[]
  },
  certifications: [] as Array<{
    id: string
    name: string
    issuer: string
    date: string
    credentialId: string
  }>,
  achievements: [] as string[],
  additionalInfo: {
    languages: ["French (fluent)", "English (fluent)", "Spanish (basic)"] as string[],
    volunteer: ["Legal Name & Gender Marker Change Pro Bono Project (Spring 2022)"] as string[],
    memberships: [
      "International Association of Young Lawyers (Fall 2021 – Present)",
      "International Bar Association (Fall 2021 – Present)"
    ] as string[],
    interests: ["Indoor cycling, golf, and visiting National Parks"] as string[]
  }
}
