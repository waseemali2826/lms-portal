import { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getSupabase } from "../lib/supabase";

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string; // ISO
  ip?: string | null;
};

const isServerless =
  !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseDir = isServerless
  ? os.tmpdir()
  : path.join(import.meta.dirname, "../data");
const dataDir = path.join(baseDir);
const dataFile = path.join(dataDir, "contact-submissions.json");

function supabaseClient(): SupabaseClient | null {
  return getSupabase();
}

function reportSupabaseIssue(context: string, error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "Unknown error");
  console.warn(`[contact] ${context}: ${message}`);
}

async function ensureStore() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
}

async function readAllFs(): Promise<ContactSubmission[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ContactSubmission[]) : [];
  } catch {
    return [];
  }
}

async function writeAllFs(items: ContactSubmission[]) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(items, null, 2), "utf8");
}

async function readAll(): Promise<ContactSubmission[]> {
  const supa = supabaseClient();
  if (supa) {
    try {
      const { data, error } = await supa
        .from("contact_submissions")
        .select("id,name,email,message,created_at,createdAt,ip")
        .order("created_at", { ascending: true });
      if (!error && data) {
        return data.map((d: any) => ({
          id: String(d.id),
          name: String(d.name || ""),
          email: String(d.email || ""),
          message: String(d.message || ""),
          createdAt: String(
            d.created_at || d.createdAt || new Date().toISOString(),
          ),
          ip: d.ip ?? null,
        }));
      }
      if (error)
        reportSupabaseIssue("Failed to fetch contact submissions", error);
    } catch (err) {
      reportSupabaseIssue("Unexpected error fetching contact submissions", err);
    }
  }
  return readAllFs();
}

async function writeAll(items: ContactSubmission[]) {
  const supa = supabaseClient();
  if (supa) {
    try {
      const payload = items.map((it) => ({
        id: it.id,
        name: it.name,
        email: it.email,
        message: it.message,
        created_at: it.createdAt,
        ip: it.ip ?? null,
      }));
      const { error } = await supa
        .from("contact_submissions")
        .upsert(payload, { onConflict: "id" });
      if (!error) return;
      reportSupabaseIssue("Failed to upsert cached contact submissions", error);
    } catch (err) {
      reportSupabaseIssue(
        "Unexpected error upserting contact submissions",
        err,
      );
    }
  }
  await writeAllFs(items);
}

export const submitContact: RequestHandler = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (
      !name ||
      typeof name !== "string" ||
      !email ||
      typeof email !== "string" ||
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const sub: ContactSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      ip:
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        null,
    };

    const supa = supabaseClient();
    let stored = false;
    if (supa) {
      try {
        const { error } = await supa.from("contact_submissions").insert({
          id: sub.id,
          name: sub.name,
          email: sub.email,
          message: sub.message,
          created_at: sub.createdAt,
          ip: sub.ip ?? null,
        });
        if (!error) stored = true;
        else reportSupabaseIssue("Failed to insert contact submission", error);
      } catch (err) {
        reportSupabaseIssue(
          "Unexpected error inserting contact submission",
          err,
        );
      }
    }

    if (!stored) {
      const items = await readAllFs();
      items.push(sub);
      await writeAllFs(items);
    }

    res.json({ ok: true, storedIn: stored ? "supabase" : "filesystem" });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const listContacts: RequestHandler = async (_req, res) => {
  try {
    const items = await readAll();
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const listContactsCsv: RequestHandler = async (_req, res) => {
  try {
    const items = await readAll();
    const header = ["id", "name", "email", "message", "createdAt", "ip"].join(
      ",",
    );
    const rows = items.map((it) =>
      [
        it.id,
        quoteCsv(it.name),
        it.email,
        quoteCsv(it.message),
        it.createdAt,
        it.ip ?? "",
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=contact-submissions.csv",
    );
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const updateContact: RequestHandler = async (req, res) => {
  try {
    const { id, name, email, message } = req.body || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id required" });
    }
    const supa = supabaseClient();
    if (supa) {
      try {
        const updates: Record<string, string> = {};
        if (typeof name === "string") updates.name = name.trim();
        if (typeof email === "string")
          updates.email = email.trim().toLowerCase();
        if (typeof message === "string") updates.message = message.trim();
        const { data, error } = await supa
          .from("contact_submissions")
          .update(updates)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (!error && data) return res.json({ ok: true, item: data });
        if (error)
          reportSupabaseIssue("Failed to update contact submission", error);
      } catch (err) {
        reportSupabaseIssue(
          "Unexpected error updating contact submission",
          err,
        );
      }
    }

    const items = await readAllFs();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    if (typeof name === "string") items[idx].name = name.trim();
    if (typeof email === "string")
      items[idx].email = email.trim().toLowerCase();
    if (typeof message === "string") items[idx].message = message.trim();
    await writeAllFs(items);
    return res.json({ ok: true, item: items[idx] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const deleteContact: RequestHandler = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id required" });
    }
    const supa = supabaseClient();
    if (supa) {
      try {
        const { data, error } = await supa
          .from("contact_submissions")
          .delete()
          .eq("id", id)
          .select()
          .maybeSingle();
        if (!error && data) return res.json({ ok: true, removed: data });
        if (error)
          reportSupabaseIssue("Failed to delete contact submission", error);
      } catch (err) {
        reportSupabaseIssue(
          "Unexpected error deleting contact submission",
          err,
        );
      }
    }

    const items = await readAllFs();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const [removed] = items.splice(idx, 1);
    await writeAllFs(items);
    return res.json({ ok: true, removed });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

function quoteCsv(s: string) {
  const needs = /[",\n]/.test(s);
  const v = s.replace(/"/g, '""');
  return needs ? `"${v}"` : v;
}
