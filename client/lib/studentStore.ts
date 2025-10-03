import type { StudentRecord } from "@/pages/students/types";

const KEY = "admin.students";

export function getStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudentRecord[]) : [];
  } catch {
    return [];
  }
}

export function addStudent(input: {
  name: string;
  email: string;
  phone: string;
  course: string;
  preferredStart?: string;
}): StudentRecord {
  const list = getStudents();
  const id = `STU-${Date.now()}`;
  const date = input.preferredStart || new Date().toISOString();
  const next: StudentRecord = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    status: "Current",
    admission: {
      course: input.course,
      batch: "UNASSIGNED",
      campus: "Lahore",
      date,
    },
    fee: {
      total: 0,
      installments: [{ id: "I1", amount: 0, dueDate: date }],
    },
    attendance: [],
    documents: [],
    communications: [],
  };
  localStorage.setItem(KEY, JSON.stringify([next, ...list]));
  try {
    window.dispatchEvent(
      new CustomEvent("students:changed", {
        detail: { type: "add", student: next },
      }),
    );
  } catch {}
  return next;
}

export function upsertStudent(rec: StudentRecord): StudentRecord {
  const list = getStudents();
  const idx = list.findIndex((s) => s.id === rec.id);
  const next =
    idx >= 0
      ? [...list.slice(0, idx), rec, ...list.slice(idx + 1)]
      : [rec, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(
      new CustomEvent("students:changed", {
        detail: { type: "upsert", student: rec },
      }),
    );
  } catch {}
  return rec;
}

export function deleteStudent(id: string): void {
  const list = getStudents();
  const next = list.filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(
      new CustomEvent("students:changed", {
        detail: { type: "delete", id },
      }),
    );
  } catch {}
}
