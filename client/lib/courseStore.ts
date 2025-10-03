const KEY = "admin.courses";

export type StoredCourse = {
  id: string;
  name: string;
  duration: string;
  fees: number;
  description?: string;
  createdAt: string; // ISO
};

export function getStoredCourses(): StoredCourse[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredCourse[]) : [];
  } catch {
    return [];
  }
}

function setStoredCourses(list: StoredCourse[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  try {
    window.dispatchEvent(
      new CustomEvent("courses:changed", { detail: { type: "sync" } }),
    );
  } catch {}
}

import { COURSES as PUBLIC_COURSES } from "@/data/courses";

export function getAllCourseNames(): string[] {
  try {
    const fromStore = getStoredCourses()
      .map((c) => c.name)
      .filter(Boolean);
    return Array.from(new Set(fromStore));
  } catch {
    return [];
  }
}

export function addStoredCourse(
  course: Omit<StoredCourse, "id" | "createdAt">,
) {
  const list = getStoredCourses();
  const next: StoredCourse = {
    id: `CRS-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...course,
  };
  setStoredCourses([next, ...list]);
  try {
    window.dispatchEvent(
      new CustomEvent("courses:changed", {
        detail: { type: "add", course: next },
      }),
    );
  } catch {}
  return next;
}

export function mergeSupabaseCourses(
  courses: Array<{
    id: string | number;
    name: string;
    duration?: string;
    fees?: number;
    description?: string;
  }>,
) {
  const existing = getStoredCourses();
  // Remove previous Supabase-sourced courses (id prefix SB-)
  const base = existing.filter((c) => !String(c.id).startsWith("SB-"));
  const now = new Date().toISOString();
  const supaItems: StoredCourse[] = courses
    .filter((c) => !!c && typeof c.name === "string" && c.name.trim())
    .map((c) => ({
      id: `SB-${String(c.id)}`,
      name: c.name,
      duration: String(c.duration || ""),
      fees: Number(c.fees || 0),
      description: c.description || "",
      createdAt: now,
    }));
  // De-duplicate by name (prefer Supabase entries)
  const byName = new Map<string, StoredCourse>();
  for (const it of base) byName.set(it.name, it);
  for (const it of supaItems) byName.set(it.name, it);
  setStoredCourses(Array.from(byName.values()));
}
