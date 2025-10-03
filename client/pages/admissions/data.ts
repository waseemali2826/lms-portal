import { AdmissionRecord } from "./types";

const now = () => new Date().toISOString();
const daysFromNow = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString();
};

export const mockAdmissions: AdmissionRecord[] = [
  {
    id: "APP-2001",
    createdAt: now(),
    status: "Pending",
    student: { name: "Rohan Mehta", email: "rohan@example.com", phone: "+91 90000 11111" },
    course: "Full Stack Web Dev",
    batch: "FSWD-2024A",
    campus: "Mumbai",
    fee: {
      total: 80000,
      installments: [
        { id: "I1", amount: 30000, dueDate: daysFromNow(-5), paidAt: daysFromNow(-5) },
        { id: "I2", amount: 30000, dueDate: daysFromNow(20) },
        { id: "I3", amount: 20000, dueDate: daysFromNow(60) },
      ],
    },
    documents: [
      { name: "ID Proof", url: "#", verified: true },
      { name: "Address Proof", url: "#", verified: false },
      { name: "Photo", url: "#", verified: true },
    ],
  },
  {
    id: "APP-2002",
    createdAt: now(),
    status: "Verified",
    studentId: "RM-12345",
    student: { name: "Aisha Khan", email: "aisha@example.com", phone: "+91 90000 22222" },
    course: "Data Science",
    batch: "DS-2024B",
    campus: "Delhi",
    fee: {
      total: 90000,
      installments: [
        { id: "I1", amount: 45000, dueDate: daysFromNow(-20), paidAt: daysFromNow(-20) },
        { id: "I2", amount: 45000, dueDate: daysFromNow(-1), paidAt: daysFromNow(-1) },
      ],
    },
    documents: [
      { name: "ID Proof", url: "#", verified: true },
      { name: "Graduation Certificate", url: "#", verified: true },
    ],
  },
  {
    id: "APP-2003",
    createdAt: now(),
    status: "Suspended",
    student: { name: "Kunal Shah", email: "kunal@example.com", phone: "+91 90000 33333" },
    course: "UI/UX Design",
    batch: "UIUX-2024A",
    campus: "Bengaluru",
    fee: {
      total: 70000,
      installments: [
        { id: "I1", amount: 35000, dueDate: daysFromNow(-30), paidAt: daysFromNow(-30) },
        { id: "I2", amount: 35000, dueDate: daysFromNow(-2) },
      ],
    },
    documents: [
      { name: "ID Proof", url: "#", verified: false },
      { name: "Photo", url: "#", verified: false },
    ],
  },
];
