import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getRolePerms, saveRolePerms } from "./routes/role-perms";
import {
  submitContact,
  listContacts,
  listContactsCsv,
  updateContact,
  deleteContact,
} from "./routes/contact";
import {
  postPublicEnquiry,
  listPublicEnquiries,
  postPublicApplication,
  listPublicApplications,
  deletePublicApplication,
} from "./routes/public-submissions";
import { getSupabase } from "./lib/supabase";
import { listBatches, createBatch } from "./routes/batches";
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
} from "./routes/users";
import {
  postCertificateRequest,
  listCertificates,
  getCertificate,
  updateCertificateStatus,
  deleteCertificate,
} from "./routes/certificates";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  const supa = getSupabase();
  const supabaseReady = !!supa;

  async function getUserFromAuthHeader(req: express.Request) {
    const authz = req.header("authorization") || req.header("Authorization");
    if (!authz || !authz.startsWith("Bearer ")) return null;
    const token = authz.substring("Bearer ".length);
    try {
      const { data, error } = await supa!.auth.getUser(token);
      if (error) return null;
      return data.user || null;
    } catch {
      return null;
    }
  }

  function isOwner(user: any): boolean {
    const email = user?.email as string | undefined;
    const meta = (user?.user_metadata || {}) as Record<string, any>;
    const role = (meta.role as string) || null;
    if (role === "owner") return true;
    if (email && email === "waseem38650@gmail.com") return true;
    return false;
  }

  // Global safeguard: prevent DELETE by non-owner
  app.use(async (req, res, next) => {
    if (req.method !== "DELETE") return next();
    if (!supabaseReady) return res.status(403).json({ error: "Forbidden" });
    const user = await getUserFromAuthHeader(req);
    if (!user || !isOwner(user))
      return res.status(403).json({ error: "Forbidden" });
    return next();
  });

  app.get("/api/demo", handleDemo);

  // Batches
  app.get("/api/batches", listBatches);
  app.post("/api/batches", createBatch);

  // Contact submissions
  app.post("/api/contact-submissions", submitContact);
  app.get("/api/contact-submissions", listContacts);
  app.get("/api/contact-submissions.csv", listContactsCsv);
  app.post("/api/contact-submissions/update", updateContact);
  app.post("/api/contact-submissions/delete", deleteContact);

  // Public enquiries/applications (public site -> admin dashboard)
  app.post("/api/public/enquiries", postPublicEnquiry);
  app.get("/api/public/enquiries", listPublicEnquiries);
  app.post("/api/public/applications", postPublicApplication);
  app.get("/api/public/applications", listPublicApplications);
  app.post("/api/public/applications/delete", deletePublicApplication);

  // Certificates: requests, listing and processing
  app.post("/api/certificates", postCertificateRequest);
  app.get("/api/certificates", listCertificates);
  app.get("/api/certificates/:id", getCertificate);
  app.patch("/api/certificates/:id/status", updateCertificateStatus);
  app.post("/api/certificates/delete", deleteCertificate);

  // Admin: Users management
  // Registered only if service role env vars are present (checked inside handlers)
  app.get("/api/admin/users", listUsers);
  app.post("/api/admin/users", createUser);
  app.patch("/api/admin/users/:id", updateUser);
  app.post("/api/admin/users/:id/reset-password", resetPassword);

  // Role permissions persistence (read open, write requires ADMIN_API_TOKEN)
  app.get("/api/role-perms", getRolePerms);
  app.get("/api/role-perms/:roleId", getRolePerms);
  app.post("/api/admin/role-perms", saveRolePerms);

  function authorize(req: express.Request, res: express.Response) {
    const token =
      req.header("x-admin-token") ||
      (req.query.token as string | undefined) ||
      (req.body && (req.body.token as string | undefined));
    if (!token || token !== process.env.ADMIN_API_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
    if (!supabaseReady) {
      res.status(500).json({ error: "Admin not configured" });
      return false;
    }
    return true;
  }

  async function findUserByEmail(email: string) {
    if (!supabaseReady) return null;
    const target = email.toLowerCase();
    const perPage = 1000;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supa!.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) break;
      const users = data?.users || [];
      const found = users.find((u) => (u.email || "").toLowerCase() === target);
      if (found) return found;
      if (users.length < perPage) break;
    }
    return null;
  }

  // POST: set one or many roles (token header x-admin-token)
  app.post("/api/admin/set-role", async (req, res) => {
    if (!authorize(req, res)) return;
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];
    const results: Array<{
      email: string | null;
      ok: boolean;
      error?: string;
    }> = [];
    for (const it of items) {
      if (!it || typeof it.email !== "string" || typeof it.role !== "string") {
        results.push({
          email: it?.email ?? null,
          ok: false,
          error: "Invalid payload",
        });
        continue;
      }
      try {
        const user = await findUserByEmail(it.email);
        if (!user) throw new Error("User not found");
        await supa!.auth.admin.updateUserById(user.id, {
          user_metadata: { role: String(it.role), appRoleId: String(it.role) },
        });
        results.push({ email: it.email, ok: true });
      } catch (err: any) {
        results.push({
          email: it.email,
          ok: false,
          error: err?.message ?? String(err),
        });
      }
    }
    res.json({ ok: true, results });
  });

  // POST: set roles using Supabase access token of an owner
  app.post("/api/admin/set-role-auth", async (req, res) => {
    if (!supabaseReady)
      return res.status(500).json({ error: "Admin not configured" });
    const requester = await getUserFromAuthHeader(req);
    if (!requester) return res.status(401).json({ error: "Invalid token" });
    if (!isOwner(requester))
      return res.status(403).json({ error: "Forbidden" });

    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];
    const results: Array<{
      email: string | null;
      ok: boolean;
      error?: string;
      appliedClaim?: string;
    }> = [];

    const mapToClaim = (role: string) => {
      const r = String(role).toLowerCase();
      if (
        r === "owner" ||
        r === "admin" ||
        r.includes("role-owner") ||
        r.includes("role-admin")
      )
        return "owner";
      return "limited";
    };

    for (const it of items) {
      if (!it || typeof it.email !== "string" || typeof it.role !== "string") {
        results.push({
          email: it?.email ?? null,
          ok: false,
          error: "Invalid payload",
        });
        continue;
      }
      try {
        const user = await findUserByEmail(it.email);
        if (!user) throw new Error("User not found");
        const claim = mapToClaim(it.role);
        await supa!.auth.admin.updateUserById(user.id, {
          user_metadata: { role: claim, appRoleId: String(it.role) },
        });
        results.push({ email: it.email, ok: true, appliedClaim: claim });
      } catch (err: any) {
        results.push({
          email: it.email,
          ok: false,
          error: err?.message ?? String(err),
        });
      }
    }

    res.json({ ok: true, results });
  });

  // GET: quick single role set via query (temporary convenience)
  app.get("/api/admin/set-role", async (req, res) => {
    if (!authorize(req, res)) return;
    const email = (req.query.email as string) || "";
    const role = (req.query.role as string) || "";
    if (!email || !role)
      return res.status(400).json({ error: "email and role are required" });
    try {
      const user = await findUserByEmail(email);
      if (!user) throw new Error("User not found");
      await supa!.auth.admin.updateUserById(user.id, {
        user_metadata: { role, appRoleId: role },
      });
      res.json({ ok: true, email, role });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  return app;
}
