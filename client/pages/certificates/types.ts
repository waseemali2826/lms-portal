export type CertificateType = "Completion" | "Participation" | "Merit";

export type CertificateStatus =
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "On Printing"
  | "Ready for Collection"
  | "Delivered"
  | "Reprinting";

export interface CertificateRequest {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  batch: string;
  campus: string;
  type: CertificateType;
  status: CertificateStatus;
  requestedAt: string; // ISO string
  approvedBy?: string;
  rejectedReason?: string;
  courierTrackingId?: string;
}

export const REQUEST_KINDS = [
  { value: "student", label: "Student Wise" },
  { value: "batch", label: "Batch Wise" },
  { value: "completion", label: "By Course Completion" },
  { value: "online", label: "Online Request" },
] as const;

export type RequestKind = typeof REQUEST_KINDS[number]["value"];

export const CERTIFICATE_TYPES: CertificateType[] = [
  "Completion",
  "Participation",
  "Merit",
];

export const nextStatus = (status: CertificateStatus): CertificateStatus => {
  switch (status) {
    case "Approved":
      return "On Printing";
    case "On Printing":
      return "Ready for Collection";
    case "Ready for Collection":
      return "Delivered";
    default:
      return status;
  }
};

export const isPending = (s: CertificateStatus) => s === "Pending Approval";
export const isApproved = (s: CertificateStatus) => s === "Approved";
export const isRejected = (s: CertificateStatus) => s === "Rejected";
export const isInProcessing = (s: CertificateStatus) =>
  s === "On Printing" || s === "Ready for Collection" || s === "Delivered" || s === "Reprinting";
