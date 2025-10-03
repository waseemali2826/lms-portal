import type { RequestHandler } from "express";
import { getSupabase } from "../lib/supabase";

function isAdminOrOwnerRole(role: string | null | undefined) {
  const r = (role || "").toLowerCase();
  return r === "owner" || r === "admin";
}

export const listUsers: RequestHandler = async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(500).json({ error: "Admin not configured" });
  // Verify requester via Authorization bearer token
  const authz = req.header("authorization") || req.header("Authorization");
  if (!authz?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = authz.substring("Bearer ".length);
  const { data: me, error: meErr } = await supa.auth.getUser(token);
  if (meErr || !me?.user)
    return res.status(401).json({ error: "Invalid token" });

  // Fetch requester profile to confirm role
  const { data: myProfile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .maybeSingle();
  if (!isAdminOrOwnerRole(myProfile?.role))
    return res.status(403).json({ error: "Forbidden" });

  // List profiles
  const { data: profiles, error } = await supa
    .from("profiles")
    .select(
      "id, full_name, phone, role, status, avatar_url, created_at, updated_at, suspended_at",
    )
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  // Fetch all auth users (first 1000)
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) return res.status(500).json({ error: listErr.message });
  const emailById = new Map(
    list.users.map((u) => [u.id, u.email || null] as const),
  );

  const result = (profiles || []).map((p) => ({
    ...p,
    email: emailById.get(p.id) || null,
  }));
  res.json({ items: result });
};

export const createUser: RequestHandler = async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(500).json({ error: "Admin not configured" });
  const authz = req.header("authorization") || req.header("Authorization");
  if (!authz?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = authz.substring("Bearer ".length);
  const { data: me } = await supa.auth.getUser(token);
  if (!me?.user) return res.status(401).json({ error: "Invalid token" });
  const { data: myProfile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .maybeSingle();
  if (!isAdminOrOwnerRole(myProfile?.role))
    return res.status(403).json({ error: "Forbidden" });

  const { email, password, full_name, phone, role, status } = req.body || {};
  if (!email || !full_name || !role || !status)
    return res
      .status(400)
      .json({ error: "email, full_name, role, status are required" });
  const pwd =
    typeof password === "string" && password.length >= 8
      ? password
      : Math.random().toString(36).slice(2, 10) + "Aa1!";

  const { data: created, error: cErr } = await supa.auth.admin.createUser({
    email: String(email),
    password: pwd,
    email_confirm: true,
    user_metadata: { role: String(role) },
  });
  if (cErr || !created.user)
    return res
      .status(500)
      .json({ error: cErr?.message || "Failed to create user" });

  const uid = created.user.id;
  const { error: iErr } = await supa.from("profiles").insert({
    id: uid,
    full_name: String(full_name),
    phone: phone ? String(phone) : null,
    role: String(role).toLowerCase(),
    status: String(status).toLowerCase(),
    avatar_url: null,
  });
  if (iErr) return res.status(500).json({ error: iErr.message });
  res.json({ ok: true, id: uid });
};

export const updateUser: RequestHandler = async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(500).json({ error: "Admin not configured" });
  const authz = req.header("authorization") || req.header("Authorization");
  if (!authz?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = authz.substring("Bearer ".length);
  const { data: me } = await supa.auth.getUser(token);
  if (!me?.user) return res.status(401).json({ error: "Invalid token" });
  const { data: myProfile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .maybeSingle();
  if (!isAdminOrOwnerRole(myProfile?.role))
    return res.status(403).json({ error: "Forbidden" });

  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "id required" });
  const { full_name, phone, role, status, email } = req.body || {};

  if (email) {
    await supa.auth.admin.updateUserById(id, { email: String(email) });
  }
  const patch: any = {};
  if (typeof full_name === "string") patch.full_name = full_name;
  if (typeof phone === "string") patch.phone = phone;
  if (typeof role === "string") patch.role = role.toLowerCase();
  if (typeof status === "string") patch.status = status.toLowerCase();
  if (Object.keys(patch).length) {
    const { error } = await supa.from("profiles").update(patch).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(500).json({ error: "Admin not configured" });
  const authz = req.header("authorization") || req.header("Authorization");
  if (!authz?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = authz.substring("Bearer ".length);
  const { data: me } = await supa.auth.getUser(token);
  if (!me?.user) return res.status(401).json({ error: "Invalid token" });
  const { data: myProfile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .maybeSingle();
  if (!isAdminOrOwnerRole(myProfile?.role))
    return res.status(403).json({ error: "Forbidden" });

  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "id required" });
  const pwd = Math.random().toString(36).slice(2, 10) + "Aa1!";
  const { error } = await supa.auth.admin.updateUserById(id, { password: pwd });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, password: pwd });
};
