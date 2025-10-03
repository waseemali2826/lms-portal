export type CourseInfo = { id: string; name: string; duration: string; fees: number; description: string };

export const COURSES: CourseInfo[] = [
  { id: "fswd", name: "Full-Stack Web Development", duration: "6 months", fees: 60000, description: "Frontend (React), Backend (Node/Express), Databases, and deployment best practices." },
  { id: "uiux", name: "UI/UX Design", duration: "4 months", fees: 45000, description: "User research, wireframing, prototyping, and design systems with Figma." },
  { id: "ds", name: "Data Science", duration: "8 months", fees: 90000, description: "Python, data wrangling, ML algorithms, model deployment, and visualization." },
  { id: "dm", name: "Digital Marketing", duration: "3 months", fees: 40000, description: "SEO, SEM, social media strategy, analytics, and campaign management." },
];
