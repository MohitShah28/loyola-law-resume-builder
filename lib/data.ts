// Mock data for Mohit Shah's profile
export const PROFILE_KNOWLEDGE_BASE_VERSION = "2026-06-portfolio-document-no-cert-achievements"

export const mockProfile = {
  personalInfo: {
    firstName: "Mohit",
    lastName: "Shah",
    email: "mohit.shah.dev28@gmail.com",
    phone: "+1 (214) 566-0084",
    location: "Los Angeles, CA / Ontario, CA",
    linkedin: "linkedin.com/in/mohitshah2808",
    github: "github.com/MohitShah28",
    portfolio: "mohitshah.dev",
    summary: "Data Analyst focused on transforming complex datasets into actionable insights through Python, SQL, business intelligence, dashboard development, predictive modeling, data cleaning, customer segmentation, and HR analytics. Experienced in turning raw data into practical business value by identifying patterns, explaining drivers, building predictive workflows, and presenting results through clear visual storytelling. Currently available for freelance projects."
  },
  education: [
    {
      id: "1",
      institution: "Loyola Marymount University",
      degree: "Master of Science",
      field: "Computer Science",
      startDate: "2025",
      endDate: "2027",
      gpa: "3.5/4.00"
    },
    {
      id: "2",
      institution: "Gujarat Technological University",
      degree: "Bachelor of Engineering",
      field: "Computer Engineering",
      startDate: "2021",
      endDate: "2024",
      gpa: "2.98/4.00"
    },
    {
      id: "3",
      institution: "Gujarat Technological University",
      degree: "Diploma",
      field: "Computer Engineering",
      startDate: "2018",
      endDate: "2021",
      gpa: "2.98/4.00"
    }
  ],
  experience: [
    {
      id: "1",
      company: "VNurture Technologies",
      position: "Data Analyst Intern",
      location: "Ahmedabad, India",
      startDate: "Jan 2024",
      endDate: "Apr 2024",
      description: [
        "Performed end-to-end data analysis on a two-year customer marketing dataset using data cleaning, feature engineering, exploratory data analysis, and segmentation techniques",
        "Handled missing values, removed outliers using IQR, corrected data types, and engineered variables including Age, Age Group, Income Status, Total Purchases, and Total Expenses",
        "Built visualizations and dashboard-style reports using Matplotlib and Seaborn to analyze demographics, spending, campaign performance, age groups, and income-based spending trends",
        "Conducted correlation analysis and Kruskal-Wallis testing, including a reported 0.82 relationship between income and expenses",
        "Analyzed web, catalog, and store transactions, identifying in-store purchases as the highest-volume purchase channel",
        "Evaluated marketing campaign acceptance rates, demographic response behavior, and engagement metrics to support targeting strategies",
        "Created reports, charts, and insight summaries for academic supervisors and organizational stakeholders",
        "Used Python, Pandas, NumPy, Matplotlib, Seaborn, Jupyter Notebook, and VS Code across data preparation, analysis, visualization, and reporting workflows"
      ]
    }
  ],
  projects: [
    {
      id: "1",
      name: "HR Analytics: Employee Attrition Analysis and Prediction",
      description: "End-to-end HR analytics solution using Python and Power BI to analyze attrition patterns, predict turnover risk, and support HR decision-making.",
      technologies: ["Python", "Pandas", "NumPy", "Scikit-learn", "Matplotlib", "Seaborn", "Power BI", "Jupyter Notebook", "PyCharm"],
      link: "https://www.mohitshah.dev/projects/hr-analytics-employee-attrition",
      highlights: [
        "Analyzed 30+ HR features covering demographics, tenure, performance, compensation, overtime, and work-life balance attributes",
        "Standardized date fields and handled missing or invalid values using Python to improve data reliability for analysis",
        "Identified 5+ attrition drivers including tenure, job role, overtime, performance ratings, and salary level",
        "Built a classification model for employee attrition risk scoring and interpreted feature importance for decision support",
        "Delivered Power BI dashboards showing attrition distribution, department-wise attrition, feature importance, and predicted attrition risk by department",
        "Created a scalable framework for workforce planning, retention analysis, engagement tracking, and proactive HR intervention"
      ]
    },
    {
      id: "2",
      name: "Customer Personality Analysis and Segmentation",
      description: "Comprehensive customer data analysis to identify key segments and optimize marketing strategies through cleaning, feature engineering, statistical testing, and visual storytelling.",
      technologies: [
        "Python",
        "Pandas",
        "NumPy",
        "Seaborn",
        "Matplotlib",
        "SciPy",
        "Jupyter Notebook"
      ],
      link: "https://www.mohitshah.dev/projects/customer-segmentation-analysis",
      highlights: [
        "Analyzed 2,200+ customers from a marketing dataset and identified 4 distinct customer personas",
        "Engineered features including Total Spending and Tenure to support customer behavior and demographic analysis",
        "Applied unsupervised segmentation and structured exploratory analysis to study age groups, marital status, purchase channels, and campaign responses",
        "Used Kruskal-Wallis testing and visual comparisons to evaluate meaningful customer behavior patterns",
        "Found customers aged 45 and above contributed the highest purchase volume and married customers accounted for the largest share",
        "Identified in-store purchases as the dominant channel, followed by web purchases, and translated findings into marketing recommendations"
      ]
    },
    {
      id: "3",
      name: "Cleanlytics AI",
      description: "AI-powered enterprise data quality platform using Python and Streamlit to automate profiling, cleaning, schema inference, anomaly detection, reports, and cleaned dataset exports.",
      technologies: [
        "Python",
        "Streamlit",
        "Pandas",
        "NumPy",
        "Scikit-learn",
        "Plotly",
        "ReportLab",
        "Machine Learning",
        "Data Cleaning",
        "IQR",
        "Z-Score",
        "Isolation Forest"
      ],
      link: "https://www.mohitshah.dev/projects/cleanlytics-ai",
      highlights: [
        "Built a multi-page Streamlit dashboard for dataset profiling, automated cleaning, schema inference, reports, exports, and insights",
        "Implemented outlier detection using IQR, Z-Score, and Isolation Forest for statistical and machine learning-based comparison",
        "Added profiling workflows for structure, missing values, column types, unique values, duplicates, wrong data types, and quality issues",
        "Created schema inference logic using numeric conversion ratio, datetime parsing success, uniqueness ratio, and pattern checks",
        "Generated automated PDF reports, cleaned dataset exports, backup recovery flows, and cleaning audit logs for transparency",
        "Designed a responsive SaaS-style dashboard UI with module cards, workflow access, report management, and modular multi-page architecture"
      ]
    }
  ],
  skills: {
    programming: ["Python", "SQL", "JavaScript", "TypeScript", "C", "C++"],
    dataAnalysis: [
      "Pandas",
      "NumPy",
      "Scikit-learn",
      "Data Cleaning",
      "Exploratory Data Analysis (EDA)",
      "Feature Engineering",
      "Statistical Analysis",
      "Machine Learning",
      "Predictive Analytics",
      "Predictive Modeling",
      "Customer Segmentation",
      "HR Analytics",
      "Business Intelligence",
      "Business Systems Analysis",
      "Project Management",
      "Data Analysis and Reporting",
      "Technical Documentation",
      "Cross-Functional Collaboration",
      "Regression",
      "Classification",
      "K-Means",
      "Random Forest",
      "XGBoost",
      "Kruskal-Wallis Testing",
      "IQR Outlier Detection",
      "Z-Score Analysis",
      "Isolation Forest",
      "Schema Inference",
      "Anomaly Detection"
    ],
    visualization: ["Power BI", "Tableau", "Matplotlib", "Seaborn", "Plotly", "Microsoft Excel", "Excel / VBA"],
    databases: ["MySQL", "SQL Server", "PostgreSQL", "MongoDB", "Firebase"],
    cloud: ["Apache Spark"],
    tools: ["Streamlit", "Git", "GitHub", "Jupyter Notebook", "VS Code", "Anaconda", "PyCharm", "DataGrip", "MS Office", "ReportLab"]
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
    jobTitle: "Senior Data Analyst",
    company: "Google",
    atsScore: 92,
    createdAt: "2024-01-15",
    template: "FAANG",
    status: "completed"
  },
  {
    id: "2",
    jobTitle: "Data Scientist",
    company: "Meta",
    atsScore: 88,
    createdAt: "2024-01-12",
    template: "Harvard",
    status: "completed"
  },
  {
    id: "3",
    jobTitle: "Business Analyst",
    company: "McKinsey",
    atsScore: 95,
    createdAt: "2024-01-10",
    template: "Consulting",
    status: "completed"
  },
  {
    id: "4",
    jobTitle: "ML Engineer",
    company: "OpenAI",
    atsScore: 85,
    createdAt: "2024-01-08",
    template: "FAANG",
    status: "completed"
  },
  {
    id: "5",
    jobTitle: "Analytics Manager",
    company: "Stripe",
    atsScore: 90,
    createdAt: "2024-01-05",
    template: "Corporate",
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
  { id: "1", action: "Generated resume for Google", time: "2 hours ago" },
  { id: "2", action: "Updated work experience", time: "5 hours ago" },
  { id: "3", action: "Added new certification", time: "1 day ago" },
  { id: "4", action: "Generated resume for Meta", time: "3 days ago" },
  { id: "5", action: "Updated skills section", time: "5 days ago" }
]
