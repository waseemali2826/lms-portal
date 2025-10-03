import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  try {
    if (client) return client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "X-Client-Info": "fusion-starter-server" } },
    });
    return client;
  } catch {
    return null;
  }
}
