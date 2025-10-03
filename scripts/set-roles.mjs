#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail("Missing SUPABASE_URL env var");
if (!key) fail("Missing SUPABASE_SERVICE_ROLE_KEY env var");

const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let assignments = [];
const rawAssignments = process.env.ROLE_ASSIGNMENTS;
if (!rawAssignments) fail("Missing ROLE_ASSIGNMENTS env var (JSON array)");
try {
  assignments = JSON.parse(rawAssignments);
} catch (e) {
  fail("Invalid ROLE_ASSIGNMENTS: not valid JSON array");
}

if (!Array.isArray(assignments) || assignments.length === 0) {
  fail("ROLE_ASSIGNMENTS must be a non-empty JSON array");
}

async function findUserByEmail(email) {
  const target = String(email).toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break;
  }
  return null;
}

async function setRoleByEmail(email, role) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");
  await supa.auth.admin.updateUserById(user.id, {
    user_metadata: { role, appRoleId: role },
  });
  console.log(`Set role '${role}' for ${email}`);
}

async function main() {
  for (const a of assignments) {
    if (!a || typeof a.email !== "string" || typeof a.role !== "string") {
      console.warn("Skipping invalid assignment:", a);
      continue;
    }
    try {
      await setRoleByEmail(a.email, a.role);
    } catch (err) {
      console.error(`Failed for ${a.email}:`, err?.message || err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
