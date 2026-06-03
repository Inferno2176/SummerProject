export type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  remote: boolean;
  salary: string;
  atsScore: number;
  status:
    | "ready"
    | "review"
    | "weak"
    | "applied";

  experience: string;

  posted: string;

  skills: string[];

  missingSkills: string[];

  description: string;

  tailoredChanges: string[];
};

export const mockJobs: Job[] = [
  {
    id: "1",
    company: "OpenAI",
    role: "Frontend Engineer",
    location: "Remote",
    remote: true,
    salary: "$140k - $180k",
    atsScore: 92,
    status: "ready",
    experience: "3+ years",
    posted: "2h ago",

    skills: [
      "React",
      "TypeScript",
      "Tailwind",
      "AI UX",
    ],

    missingSkills: [
      "GraphQL",
    ],

    description:
      "Build AI-native desktop and web interfaces for productivity systems.",

    tailoredChanges: [
      "Added AI tooling experience",
      "Improved React keywords",
      "Optimized ATS formatting",
    ],
  },

  {
    id: "2",
    company: "Linear",
    role: "Product Engineer",
    location: "San Francisco",
    remote: false,
    salary: "$160k - $210k",
    atsScore: 88,
    status: "review",
    experience: "5+ years",
    posted: "5h ago",

    skills: [
      "React",
      "Node.js",
      "Design Systems",
    ],

    missingSkills: [
      "Swift",
    ],

    description:
      "Create world-class product experiences with exceptional UX quality.",

    tailoredChanges: [
      "Improved UI architecture section",
      "Added ownership keywords",
    ],
  },

  {
    id: "3",
    company: "Notion",
    role: "Desktop Engineer",
    location: "Remote",
    remote: true,
    salary: "$150k - $190k",
    atsScore: 79,
    status: "weak",
    experience: "4+ years",
    posted: "1d ago",

    skills: [
      "Electron",
      "Rust",
      "Desktop Apps",
    ],

    missingSkills: [
      "C++",
    ],

    description:
      "Develop collaborative desktop productivity experiences.",

    tailoredChanges: [
      "Resume requires ATS optimization",
    ],
  },

  {
    id: "4",
    company: "Vercel",
    role: "Full Stack Engineer",
    location: "Remote",
    remote: true,
    salary: "$130k - $170k",
    atsScore: 94,
    status: "ready",
    experience: "3+ years",
    posted: "4h ago",

    skills: [
      "Next.js",
      "TypeScript",
      "Serverless",
    ],

    missingSkills: [],

    description:
      "Build developer-first cloud and deployment experiences.",

    tailoredChanges: [
      "Enhanced Next.js experience",
      "Added deployment optimization",
    ],
  },

  {
    id: "5",
    company: "Stripe",
    role: "Software Engineer",
    location: "Seattle",
    remote: false,
    salary: "$170k - $220k",
    atsScore: 84,
    status: "review",
    experience: "4+ years",
    posted: "8h ago",

    skills: [
      "APIs",
      "Distributed Systems",
      "Payments",
    ],

    missingSkills: [
      "Go",
    ],

    description:
      "Scale financial infrastructure powering the internet.",

    tailoredChanges: [
      "Added API scaling metrics",
    ],
  },

  {
    id: "6",
    company: "Cursor",
    role: "AI Engineer",
    location: "Remote",
    remote: true,
    salary: "$180k - $250k",
    atsScore: 97,
    status: "ready",
    experience: "5+ years",
    posted: "1h ago",

    skills: [
      "LLMs",
      "AI Agents",
      "Rust",
    ],

    missingSkills: [],

    description:
      "Develop AI-native coding workflows and agent systems.",

    tailoredChanges: [
      "Added local AI workflows",
      "Highlighted Tauri architecture",
    ],
  },

  {
    id: "7",
    company: "Supabase",
    role: "Backend Engineer",
    location: "Remote",
    remote: true,
    salary: "$145k - $185k",
    atsScore: 81,
    status: "review",
    experience: "3+ years",
    posted: "9h ago",

    skills: [
      "Postgres",
      "APIs",
      "Realtime",
    ],

    missingSkills: [
      "Elixir",
    ],

    description:
      "Build scalable open-source backend infrastructure.",

    tailoredChanges: [
      "Added API optimization metrics",
    ],
  },

  {
    id: "8",
    company: "Figma",
    role: "Frontend Platform Engineer",
    location: "New York",
    remote: false,
    salary: "$175k - $230k",
    atsScore: 90,
    status: "ready",
    experience: "5+ years",
    posted: "3h ago",

    skills: [
      "Performance",
      "React",
      "Rendering",
    ],

    missingSkills: [],

    description:
      "Improve frontend architecture powering collaborative design.",

    tailoredChanges: [
      "Enhanced rendering optimization",
    ],
  },

  {
    id: "9",
    company: "GitHub",
    role: "Developer Experience Engineer",
    location: "Remote",
    remote: true,
    salary: "$140k - $195k",
    atsScore: 86,
    status: "review",
    experience: "3+ years",
    posted: "7h ago",

    skills: [
      "Developer Tools",
      "CI/CD",
      "Git",
    ],

    missingSkills: [
      "Actions",
    ],

    description:
      "Build workflows improving developer productivity globally.",

    tailoredChanges: [
      "Added CI/CD workflows",
    ],
  },

  {
    id: "10",
    company: "Anthropic",
    role: "AI Product Engineer",
    location: "Remote",
    remote: true,
    salary: "$190k - $260k",
    atsScore: 95,
    status: "ready",
    experience: "5+ years",
    posted: "30m ago",

    skills: [
      "AI Systems",
      "Prompting",
      "TypeScript",
    ],

    missingSkills: [],

    description:
      "Create safe and powerful AI product experiences.",

    tailoredChanges: [
      "Added AI safety terminology",
      "Enhanced prompt engineering",
    ],
  },

  {
    id: "11",
    company: "Netflix",
    role: "UI Engineer",
    location: "Los Angeles",
    remote: false,
    salary: "$165k - $210k",
    atsScore: 76,
    status: "weak",
    experience: "4+ years",
    posted: "2d ago",

    skills: [
      "Streaming",
      "React",
      "Performance",
    ],

    missingSkills: [
      "Playback Systems",
    ],

    description:
      "Build immersive streaming experiences across platforms.",

    tailoredChanges: [
      "Needs stronger media optimization keywords",
    ],
  },

  {
    id: "12",
    company: "Shopify",
    role: "Frontend Developer",
    location: "Remote",
    remote: true,
    salary: "$120k - $160k",
    atsScore: 89,
    status: "applied",
    experience: "2+ years",
    posted: "1d ago",

    skills: [
      "React",
      "Commerce",
      "Hydrogen",
    ],

    missingSkills: [],

    description:
      "Develop scalable commerce experiences for merchants.",

    tailoredChanges: [
      "Added commerce metrics",
    ],
  },
];