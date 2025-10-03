import type { RequestHandler } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const dataFile = path.join(dataDir, "role-perms.json");

async function ensureDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {}
}

async function readAll(): Promise<Record<string, any> | null> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeAll(obj: Record<string, any>) {
  await ensureDir();
  await fs.writeFile(dataFile, JSON.stringify(obj, null, 2), "utf-8");
}

export const getRolePerms: RequestHandler = async (req, res) => {
  const roleId = (req.params.roleId || req.query.roleId) as string | undefined;
  const all = (await readAll()) || {};
  if (!roleId) return res.json(all);
  const perms = all[roleId];
  if (!perms) return res.status(404).json({ error: "Not found" });
  res.json({ roleId, permissions: perms });
};

export const saveRolePerms: RequestHandler = async (req, res) => {
  const token = (req.header("x-admin-token") || "").trim();
  if (!process.env.ADMIN_API_TOKEN || token !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { roleId, permissions } = req.body || {};
  if (!roleId || typeof roleId !== "string" || !permissions) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const all = (await readAll()) || {};
  all[roleId] = permissions;
  await writeAll(all);
  res.json({ ok: true });
};
