import { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getSupabase } from "../lib/supabase";

const isServerless =
  !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseDir = isServerless
  ? os.tmpdir()
  : path.join(import.meta.dirname, "../data");
const dataDir = baseDir;
const fsFile = path.join(dataDir, "certificates.json");

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

type CertItem = {
  id: string;
  studentId?: string | null;
  batchId?: string | null;
  courseId?: string | null;
  certificateType?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requestedAt: string;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  printingStartedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  statusHistory?: Array<any> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const postCertificateRequest: RequestHandler = async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      courseId,
      certificateType,
      requesterName,
      requesterEmail,
      notes,
      metadata,
    } = req.body || {};

    const now = new Date().toISOString();

    const it: CertItem = {
      id: `CERT-${Date.now()}`,
      studentId: studentId ?? null,
      batchId: batchId ?? null,
      courseId: courseId ?? null,
      certificateType: certificateType ?? null,
      requesterName: requesterName ?? null,
      requesterEmail: requesterEmail ?? null,
      requestedAt: now,
      status: "requested",
      notes: notes ?? null,
      metadata: metadata ?? null,
      statusHistory: [{ status: "requested", at: now, by: null, note: null }],
      createdAt: now,
      updatedAt: now,
    };

    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { error, data } = await supa
        .from("certificates")
        .insert({
          student_id: it.studentId ?? null,
          batch_id: it.batchId ?? null,
          course_id: it.courseId ?? null,
          certificate_type: it.certificateType ?? null,
          requester_name: it.requesterName ?? null,
          requester_email: it.requesterEmail ?? null,
          requested_at: it.requestedAt,
          status: it.status,
          notes: it.notes ?? null,
          metadata: it.metadata ?? null,
          status_history: it.statusHistory ?? null,
        })
        .select("*")
        .limit(1);

      if (error) throw new Error(error.message);
      const inserted = (data && data[0]) || null;
      if (inserted) {
        return res.json({ ok: true, item: inserted });
      }
    }

    const items = await readAllFs<CertItem>(fsFile);
    items.unshift(it);
    await writeAllFs(fsFile, items);
    res.json({ ok: true, item: it });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const listCertificates: RequestHandler = async (_req, res) => {
  try {
    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { data, error } = await supa
        .from("certificates")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw new Error(error.message);
      const items = (data || []).map((d: any) => ({
        id: String(d.id),
        studentId: d.student_id || null,
        batchId: d.batch_id || null,
        courseId: d.course_id || null,
        certificateType: d.certificate_type || null,
        requesterName: d.requester_name || null,
        requesterEmail: d.requester_email || null,
        requestedAt:
          d.requested_at || d.requestedAt || new Date().toISOString(),
        status: d.status || "requested",
        approvedBy: d.approved_by || null,
        approvedAt: d.approved_at || null,
        printingStartedAt: d.printing_started_at || null,
        readyAt: d.ready_at || null,
        deliveredAt: d.delivered_at || null,
        cancelledAt: d.cancelled_at || null,
        notes: d.notes || null,
        metadata: d.metadata || null,
        statusHistory: d.status_history || null,
        createdAt: d.created_at || d.createdAt || null,
        updatedAt: d.updated_at || d.updatedAt || null,
      }));
      return res.json({ ok: true, items });
    }

    const items = await readAllFs<CertItem>(fsFile);
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const getCertificate: RequestHandler = async (req, res) => {
  try {
    const id = (req.params?.id as string) || (req.query?.id as string) || "";
    if (!id) return res.status(400).json({ error: "id is required" });

    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { data, error } = await supa
        .from("certificates")
        .select("*")
        .eq("id", id)
        .limit(1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0)
        return res.status(404).json({ error: "Not found" });
      return res.json({ ok: true, item: data[0] });
    }

    const items = await readAllFs<CertItem>(fsFile);
    const found = items.find((it) => String(it.id) === String(id));
    if (!found) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, item: found });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const updateCertificateStatus: RequestHandler = async (req, res) => {
  try {
    const id = (req.params?.id as string) || (req.body?.id as string) || "";
    const status =
      (req.body?.status as string) || (req.query?.status as string) || "";
    const adminId = (req.body?.adminId as string) || null;
    const note = (req.body?.note as string) || null;

    if (!id || !status)
      return res.status(400).json({ error: "id and status are required" });

    const now = new Date().toISOString();
    const historyEntry = { status, at: now, by: adminId ?? null, note };

    if (supabaseReady()) {
      const supa = getSupabase()!;
      const updates: any = {
        status,
      };

      // Set appropriate timestamp/fields based on status
      if (status === "pending_approval") {
        // no extra timestamp
      } else if (status === "approved") {
        updates.approved_at = now;
        if (adminId) updates.approved_by = adminId;
      } else if (status === "printing") {
        updates.printing_started_at = now;
      } else if (status === "ready_for_collection") {
        updates.ready_at = now;
      } else if (status === "delivered") {
        updates.delivered_at = now;
      } else if (status === "cancelled") {
        updates.cancelled_at = now;
      }

      // push to jsonb history
      updates.status_history = supa.rpc ? undefined : undefined; // placeholder to avoid TS error

      // We'll use Postgres jsonb concatenation to append history
      const { data, error } = await supa
        .from("certificates")
        .update(updates)
        .eq("id", id)
        .select("*")
        .limit(1);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0)
        return res.status(404).json({ error: "Not found" });

      // Append to status_history via separate rpc to avoid complex expression if needed
      // For simplicity, update status_history client-side: fetch then update with appended history
      const record = data[0];
      const currentHistory = record.status_history || [];
      currentHistory.push(historyEntry);
      const { error: err2 } = await supa
        .from("certificates")
        .update({ status_history: currentHistory })
        .eq("id", id);
      if (err2) throw new Error(err2.message);

      const { data: final } = await supa
        .from("certificates")
        .select("*")
        .eq("id", id)
        .limit(1);
      return res.json({ ok: true, item: final ? final[0] : null });
    }

    // Filesystem fallback
    const items = await readAllFs<CertItem>(fsFile);
    const idx = items.findIndex((it) => String(it.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const target = items[idx];
    target.status = status;
    if (!target.statusHistory) target.statusHistory = [];
    (target.statusHistory as any[]).push(historyEntry);
    if (status === "approved") {
      target.approvedAt = now;
      if (adminId) target.approvedBy = adminId;
    } else if (status === "printing") {
      target.printingStartedAt = now;
    } else if (status === "ready_for_collection") {
      target.readyAt = now;
    } else if (status === "delivered") {
      target.deliveredAt = now;
    } else if (status === "cancelled") {
      target.cancelledAt = now;
    }
    target.updatedAt = now;
    items[idx] = target;
    await writeAllFs(fsFile, items);
    res.json({ ok: true, item: target });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};

export const deleteCertificate: RequestHandler = async (req, res) => {
  try {
    const rawId = (req.body?.id ?? req.params?.id ?? req.query?.id) as
      | string
      | undefined;
    const targetId = rawId ? String(rawId) : "";
    if (!targetId.trim())
      return res.status(400).json({ error: "id is required" });

    if (supabaseReady()) {
      const supa = getSupabase()!;
      const { data, error } = await supa
        .from("certificates")
        .delete()
        .eq("id", targetId)
        .select("id")
        .limit(1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0)
        return res.status(404).json({ error: "Not found" });
      return res.json({ ok: true, removedId: targetId });
    }

    const items = await readAllFs<CertItem>(fsFile);
    const next = items.filter((item) => String(item.id) !== targetId);
    if (next.length === items.length)
      return res.status(404).json({ error: "Not found" });
    await writeAllFs(fsFile, next);
    res.json({ ok: true, removedId: targetId });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
};
