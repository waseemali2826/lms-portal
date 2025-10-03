import { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getSupabase } from "../lib/supabase";

export type PublicEnquiry = {
  id: string;
  name: string;
  course: string;
  contact: string;
  email?: string;
  preferredStart?: string; // ISO date
  createdAt: string; // ISO
};

export type PublicApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  preferredStart?: string; // ISO date
  createdAt: string; // ISO
};

const isServerless =
  !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseDir = isServerless
  ? os.tmpdir()
  : path.join(import.meta.dirname, "../data");
const dataDir = baseDir;

const enquiriesFile = path.join(dataDir, "public-enquiries.json");
const applicationsFile = path.join(dataDir, "public-applications.json");

function supabaseReady() {
  return !!getSupabase();
}

async function ensure(file: string) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(file);
  } catch {
    await fs.writeFile(file, "[]", "utf8");
  }
}

async function readAllFs<T>(file: string): Promise<T[]> {
  await ensure(file);
  const raw = await fs.readFile(file, "utf8");
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

async function writeAllFs<T>(file: string, items: T[]) {
  await ensure(file);
  await fs.writeFile(file, JSON.stringify(items, null, 2), "utf8");
}

export const postPublicEnquiry: RequestHandler = async (req, res) => {
  try {
    const { name, course, contact, email, preferredStart } = req.body || {};
    if (!name || !course || !contact)
      return res.status(400).json({ error: "Invalid payload" });
    const it: PublicEnquiry = {
      id: `ENQ-${Date.now()}`,
      name: String(name),
      course: String(course),
      contact: String(contact),
      email: email ? String(email) : undefined,
      preferredStart: preferredStart ? String(preferredStart) : undefined,
      createdAt: new Date().toISOString(),
    };
    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { error } = await supa.from("public_enquiries").insert({
        id: it.id,
        name: it.name,
        course: it.course,
        contact: it.contact,
        email: it.email ?? null,
        preferred_start: it.preferredStart ?? null,
        created_at: it.createdAt,
      });
      if (error) throw new Error(error.message);
    } else {
      const items = await readAllFs<PublicEnquiry>(enquiriesFile);
      items.unshift(it);
      await writeAllFs(enquiriesFile, items);
    }
    res.json({ ok: true, item: it });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const listPublicEnquiries: RequestHandler = async (_req, res) => {
  try {
    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { data, error } = await supa
        .from("public_enquiries")
        .select(
          "id,name,course,contact,email,preferred_start,created_at,createdAt",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const items: PublicEnquiry[] = (data || []).map((d: any) => ({
        id: String(d.id),
        name: String(d.name || ""),
        course: String(d.course || ""),
        contact: String(d.contact || ""),
        email: d.email || undefined,
        preferredStart: d.preferred_start || d.preferredStart || undefined,
        createdAt: String(
          d.created_at || d.createdAt || new Date().toISOString(),
        ),
      }));
      return res.json({ ok: true, items });
    }
    const items = await readAllFs<PublicEnquiry>(enquiriesFile);
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const postPublicApplication: RequestHandler = async (req, res) => {
  try {
    const { name, email, phone, course, preferredStart } = req.body || {};
    if (!name || !email || !phone || !course)
      return res.status(400).json({ error: "Invalid payload" });
    const it: PublicApplication = {
      id: `APP-${Date.now()}`,
      name: String(name),
      email: String(email),
      phone: String(phone),
      course: String(course),
      preferredStart: preferredStart ? String(preferredStart) : undefined,
      createdAt: new Date().toISOString(),
    };
    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { error } = await supa.from("public_applications").insert({
        id: it.id,
        name: it.name,
        email: it.email,
        phone: it.phone,
        course: it.course,
        preferred_start: it.preferredStart ?? null,
        created_at: it.createdAt,
      });
      if (error) throw new Error(error.message);
    } else {
      const items = await readAllFs<PublicApplication>(applicationsFile);
      items.unshift(it);
      await writeAllFs(applicationsFile, items);
    }
    res.json({ ok: true, item: it });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const listPublicApplications: RequestHandler = async (_req, res) => {
  try {
    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { data, error } = await supa
        .from("public_applications")
        .select(
          "id,name,email,phone,course,preferred_start,created_at,createdAt",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const items: PublicApplication[] = (data || []).map((d: any) => ({
        id: String(d.id),
        name: String(d.name || ""),
        email: String(d.email || ""),
        phone: String(d.phone || ""),
        course: String(d.course || ""),
        preferredStart: d.preferred_start || d.preferredStart || undefined,
        createdAt: String(
          d.created_at || d.createdAt || new Date().toISOString(),
        ),
      }));
      return res.json({ ok: true, items });
    }
    const items = await readAllFs<PublicApplication>(applicationsFile);
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const deletePublicApplication: RequestHandler = async (req, res) => {
  try {
    const rawId = (req.body?.id ?? req.params?.id ?? req.query?.id) as
      | string
      | number
      | undefined;
    const targetId = rawId !== undefined && rawId !== null ? String(rawId) : "";
    if (!targetId.trim()) {
      return res.status(400).json({ error: "id is required" });
    }

    if (supabaseReady()) {
      const supa = getSupabase()!;
      const numeric = Number(targetId);
      const values = Number.isFinite(numeric)
        ? [numeric, targetId]
        : [targetId];
      const tables = ["applications", "public_applications"] as const;

      for (const table of tables) {
        for (const column of ["app_id", "id"] as const) {
          for (const value of values) {
            const { data, error } = await supa
              .from(table)
              .delete()
              .eq(column, value as any)
              .select("id")
              .limit(1);
            if (!error && (data?.length ?? 0) > 0) {
              return res.json({ ok: true, removedId: targetId, source: table });
            }
          }
        }
      }

      return res.status(404).json({ error: "Not found" });
    }

    const items = await readAllFs<PublicApplication>(applicationsFile);
    const next = items.filter((item) => String(item.id) !== targetId);
    if (next.length === items.length) {
      return res.status(404).json({ error: "Not found" });
    }
    await writeAllFs(applicationsFile, next);
    return res.json({ ok: true, removedId: targetId });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};
