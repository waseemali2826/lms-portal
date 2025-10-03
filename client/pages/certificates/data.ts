import { CertificateRequest, CertificateType, CertificateStatus } from "./types";

const now = () => new Date().toISOString();

export const mockRequests: CertificateRequest[] = [
  {
    id: "REQ-1001",
    studentId: "STU-0001",
    studentName: "Aarav Sharma",
    course: "Full Stack Web Dev",
    batch: "FSWD-2024A",
    campus: "Mumbai",
    type: "Completion",
    status: "Pending Approval",
    requestedAt: now(),
  },
  {
    id: "REQ-1002",
    studentId: "STU-0002",
    studentName: "Priya Patel",
    course: "Data Science",
    batch: "DS-2024B",
    campus: "Delhi",
    type: "Merit",
    status: "Approved",
    requestedAt: now(),
    approvedBy: "Program Manager",
  },
  {
    id: "REQ-1003",
    studentId: "STU-0003",
    studentName: "Rahul Verma",
    course: "UI/UX Design",
    batch: "UIUX-2024A",
    campus: "Bengaluru",
    type: "Participation",
    status: "On Printing",
    requestedAt: now(),
  },
  {
    id: "REQ-1004",
    studentId: "STU-0004",
    studentName: "Neha Gupta",
    course: "Cloud Computing",
    batch: "CC-2024C",
    campus: "Pune",
    type: "Completion",
    status: "Ready for Collection",
    requestedAt: now(),
  },
  {
    id: "REQ-1005",
    studentId: "STU-0005",
    studentName: "Ankit Singh",
    course: "Cybersecurity",
    batch: "SEC-2024A",
    campus: "Hyderabad",
    type: "Completion",
    status: "Delivered",
    requestedAt: now(),
    courierTrackingId: "TRK123456",
  },
  {
    id: "REQ-1006",
    studentId: "STU-0006",
    studentName: "Isha Kapoor",
    course: "AI & ML",
    batch: "AIML-2024A",
    campus: "Chennai",
    type: "Completion",
    status: "Reprinting",
    requestedAt: now(),
  },
];

export const campuses = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"];
export const batches = ["FSWD-2024A", "DS-2024B", "UIUX-2024A", "CC-2024C", "SEC-2024A", "AIML-2024A"];
export const courses = ["Full Stack Web Dev", "Data Science", "UI/UX Design", "Cloud Computing", "Cybersecurity", "AI & ML"];

export function genId(prefix = "REQ"): string {
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${Date.now().toString().slice(-5)}${n}`;
}
