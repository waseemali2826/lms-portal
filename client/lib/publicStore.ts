const ENQ_KEY = "public.enquiries";
const APP_KEY = "public.applications";

type Enquiry = {
  id: string;
  name: string;
  course: string;
  contact: string;
  email?: string;
  preferredStart?: string; // ISO date
  createdAt: string; // ISO
};

type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  preferredStart?: string; // ISO date
  createdAt: string; // ISO
};

export function addPublicEnquiry(e: Omit<Enquiry, "id" | "createdAt">) {
  const list = getPublicEnquiries();
  const id = `ENQ-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const next = { id, createdAt, ...e };
  localStorage.setItem(ENQ_KEY, JSON.stringify([next, ...list]));
  return next;
}

export function getPublicEnquiries(): Enquiry[] {
  try { return JSON.parse(localStorage.getItem(ENQ_KEY) || "[]"); } catch { return []; }
}

export function addPublicApplication(a: Omit<Application, "id" | "createdAt">) {
  const list = getPublicApplications();
  const id = `APP-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const next = { id, createdAt, ...a };
  localStorage.setItem(APP_KEY, JSON.stringify([next, ...list]));
  return next;
}

export function getPublicApplications(): Application[] {
  try { return JSON.parse(localStorage.getItem(APP_KEY) || "[]"); } catch { return []; }
}
