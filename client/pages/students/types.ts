export type StudentStatus =
  | "Current"
  | "Freeze"
  | "Concluded"
  | "Not Completed"
  | "Suspended"
  | "Alumni";

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
}

export interface AttendanceEntry {
  date: string; // YYYY-MM-DD
  present: boolean;
}

export type CommChannel = "SMS" | "Email" | "WhatsApp" | "Call";

export interface CommunicationItem {
  id: string;
  channel: CommChannel;
  message: string;
  at: string; // ISO
}

export interface DocumentItem {
  name: string;
  url: string;
  verified: boolean;
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: StudentStatus;
  admission: {
    course: string;
    batch: string;
    campus: string;
    date: string; // ISO
  };
  fee: {
    total: number;
    installments: Installment[];
  };
  attendance: AttendanceEntry[];
  documents: DocumentItem[];
  communications: CommunicationItem[];
  enrolledCourses?: string[]; // cross-enrollment
  notes?: string;
}

export type PaymentStatus = "Paid" | "Pending" | "Overdue";

export function paymentStatus(stu: StudentRecord): PaymentStatus {
  const allPaid = stu.fee.installments.every((i) => !!i.paidAt);
  if (allPaid) return "Paid";
  const now = Date.now();
  const anyOverdue = stu.fee.installments.some((i) => !i.paidAt && new Date(i.dueDate).getTime() < now);
  return anyOverdue ? "Overdue" : "Pending";
}

export function nextUnpaidInstallment(stu: StudentRecord) {
  return stu.fee.installments.find((i) => !i.paidAt);
}

export function markInstallmentPaid(stu: StudentRecord, id: string): StudentRecord {
  return {
    ...stu,
    fee: {
      ...stu.fee,
      installments: stu.fee.installments.map((i) => (i.id === id ? { ...i, paidAt: new Date().toISOString() } : i)),
    },
  };
}

export function ensureAttendance(stu: StudentRecord, date: string, present: boolean): StudentRecord {
  const idx = stu.attendance.findIndex((a) => a.date === date);
  if (idx >= 0) {
    const next = [...stu.attendance];
    next[idx] = { date, present };
    return { ...stu, attendance: next };
  }
  return { ...stu, attendance: [...stu.attendance, { date, present }] };
}
