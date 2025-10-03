import { StudentRecord } from "./types";

const now = () => new Date().toISOString();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const studentsMock: StudentRecord[] = [
  {
    id: "STU-0001",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 90000 11111",
    status: "Current",
    admission: {
      course: "Full Stack Web Dev",
      batch: "FSWD-2024A",
      campus: "Lahore",
      date: now(),
    },
    fee: {
      total: 80000,
      installments: [
        {
          id: "I1",
          amount: 30000,
          dueDate: daysFromNow(-30),
          paidAt: daysFromNow(-30),
        },
        { id: "I2", amount: 30000, dueDate: daysFromNow(10) },
        { id: "I3", amount: 20000, dueDate: daysFromNow(50) },
      ],
    },
    attendance: [
      { date: iso(new Date()), present: true },
      { date: iso(new Date(Date.now() - 86400000)), present: false },
    ],
    documents: [
      { name: "ID Proof", url: "#", verified: true },
      { name: "Address Proof", url: "#", verified: false },
    ],
    communications: [
      { id: "c1", channel: "Email", message: "Welcome email sent", at: now() },
    ],
    enrolledCourses: ["Soft Skills"],
  },
  {
    id: "STU-0002",
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "+91 90000 22222",
    status: "Alumni",
    admission: {
      course: "Data Science",
      batch: "DS-2024B",
      campus: "Islamabad",
      date: now(),
    },
    fee: {
      total: 90000,
      installments: [
        {
          id: "I1",
          amount: 45000,
          dueDate: daysFromNow(-60),
          paidAt: daysFromNow(-60),
        },
        {
          id: "I2",
          amount: 45000,
          dueDate: daysFromNow(-20),
          paidAt: daysFromNow(-20),
        },
      ],
    },
    attendance: [],
    documents: [{ name: "Photo", url: "#", verified: true }],
    communications: [],
  },
  {
    id: "STU-0003",
    name: "Rahul Verma",
    email: "rahul@example.com",
    phone: "+91 90000 33333",
    status: "Suspended",
    admission: {
      course: "UI/UX Design",
      batch: "UIUX-2024A",
      campus: "Faisalabad",
      date: now(),
    },
    fee: {
      total: 70000,
      installments: [
        {
          id: "I1",
          amount: 35000,
          dueDate: daysFromNow(-10),
          paidAt: daysFromNow(-10),
        },
        { id: "I2", amount: 35000, dueDate: daysFromNow(-1) },
      ],
    },
    attendance: [],
    documents: [],
    communications: [],
  },
];
