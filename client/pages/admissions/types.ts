// export type AdmissionStatus = "Pending" | "Verified" | "Rejected" | "Cancelled" | "Suspended";

// export interface Installment {
//   id: string;
//   amount: number;
//   dueDate: string; // ISO
//   paidAt?: string; // ISO if paid
// }

// export interface DocumentItem {
//   name: string;
//   url: string;
//   verified: boolean;
// }

// export interface AdmissionRecord {
//   id: string; // application id
//   createdAt: string; // ISO
//   studentId?: string; // generated after approval
//   status: AdmissionStatus;
//   student: {
//     name: string;
//     email: string;
//     phone: string;
//     dob?: string;
//     address?: string;
//   };
//   course: string;
//   batch: string;
//   campus: string;
//   fee: {
//     total: number;
//     installments: Installment[];
//   };
//   documents: DocumentItem[];
//   notes?: string;
//   rejectedReason?: string;
// }

// export type PaymentStatus = "Paid" | "Pending" | "Overdue";

// export function paymentStatus(rec: AdmissionRecord): PaymentStatus {
//   const allPaid = rec.fee.installments.every((i) => !!i.paidAt);
//   if (allPaid) return "Paid";
//   const now = Date.now();
//   const anyOverdue = rec.fee.installments.some((i) => !i.paidAt && new Date(i.dueDate).getTime() < now);
//   return anyOverdue ? "Overdue" : "Pending";
// }

// export function genStudentId(name: string): string {
//   const base = name
//     .trim()
//     .split(/\s+/)
//     .map((s) => s[0]?.toUpperCase() || "X")
//     .join("");
//   const n = Math.floor(Math.random() * 90000 + 10000);
//   return `${base}-${n}`;
// }

export type AdmissionStatus =
  | "Pending"
  | "Verified"
  | "Rejected"
  | "Cancelled"
  | "Suspended";

export interface Installment {
  id: string;
  amount: number;
  dueDate: string; // ISO
  paidAt?: string; // ISO if paid
}

export interface DocumentItem {
  name: string;
  url: string;
  verified: boolean;
}

export interface AdmissionRecord {
  id: string; // application id
  createdAt: string; // ISO
  studentId?: string; // generated after approval
  status: AdmissionStatus;
  student: {
    name: string;
    email: string;
    phone: string;
    dob?: string;
    address?: string;
  };
  course: string;
  batch: string;
  campus: string;
  fee: {
    total: number;
    installments: Installment[];
  };
  documents: DocumentItem[];
  notes?: string;
  rejectedReason?: string;
}

export type PaymentStatus = "Paid" | "Pending" | "Overdue";

export function paymentStatus(rec: AdmissionRecord): PaymentStatus {
  const allPaid = rec.fee.installments.every((i) => !!i.paidAt);
  if (allPaid) return "Paid";
  const now = Date.now();
  const anyOverdue = rec.fee.installments.some(
    (i) => !i.paidAt && new Date(i.dueDate).getTime() < now,
  );
  return anyOverdue ? "Overdue" : "Pending";
}

export function genStudentId(name: string): string {
  const base = name
    .trim()
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase() || "X")
    .join("");
  const n = Math.floor(Math.random() * 90000 + 10000);
  return `${base}-${n}`;
}
