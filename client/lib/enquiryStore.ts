const KEY = "admin.enquiries";

export type EnquiryLocal = {
  id: string;
  name: string;
  course: string;
  contact: string;
  email?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  campus?: string | null;
  next_follow?: string | null; // ISO datetime
  probability?: number;
  sources?: string[];
  source?: string;
  remarks?: string | null;
  stage: "Prospective" | "Need Analysis" | "Proposal" | "Negotiation";
  status: "Pending" | "Enrolled" | "Not Interested";
  created_at: string; // ISO
};

export function getLocalEnquiries(): EnquiryLocal[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EnquiryLocal[]) : [];
  } catch {
    return [];
  }
}

export function addLocalEnquiry(
  input: Omit<EnquiryLocal, "id" | "created_at"> & { id?: string },
): EnquiryLocal {
  const list = getLocalEnquiries();
  const rec: EnquiryLocal = {
    id: input.id || `ENQ-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...input,
  } as EnquiryLocal;
  const idx = list.findIndex((e) => e.id === rec.id);
  const next =
    idx >= 0
      ? [...list.slice(0, idx), rec, ...list.slice(idx + 1)]
      : [rec, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(
      new CustomEvent("enquiries:changed", {
        detail: { type: idx >= 0 ? "upsert" : "add", enquiry: rec },
      }),
    );
  } catch {}
  return rec;
}

export function updateLocalEnquiry(
  id: string,
  patch: Partial<EnquiryLocal>,
): EnquiryLocal | null {
  const list = getLocalEnquiries();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const rec: EnquiryLocal = { ...list[idx], ...patch } as EnquiryLocal;
  const next = [...list];
  next[idx] = rec;
  localStorage.setItem(KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(
      new CustomEvent("enquiries:changed", {
        detail: { type: "upsert", enquiry: rec },
      }),
    );
  } catch {}
  return rec;
}
