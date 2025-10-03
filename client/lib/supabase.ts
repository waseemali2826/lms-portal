import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const missingConfig = !url || !anon;

const supabaseFallbackWarning = (() => {
  let notified = false;
  return () => {
    if (notified) return;
    notified = true;
    console.warn(
      "Supabase environment variables are not configured. Authentication features are disabled.",
    );
  };
})();

function createSupabaseStub(): SupabaseClient {
  supabaseFallbackWarning();
  const disabledMessage =
    "Supabase credentials are missing. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication.";

  return {
    auth: {
      async getSession() {
        supabaseFallbackWarning();
        return { data: { session: null }, error: null };
      },
      onAuthStateChange(_callback) {
        supabaseFallbackWarning();
        return {
          data: {
            subscription: {
              unsubscribe() {
                /* noop */
              },
            },
          },
          error: null,
        };
      },
      async signInWithPassword() {
        supabaseFallbackWarning();
        return {
          data: { session: null, user: null },
          error: new Error(disabledMessage),
        };
      },
      async signUp() {
        supabaseFallbackWarning();
        return {
          data: { session: null, user: null },
          error: new Error(disabledMessage),
        };
      },
      async signOut() {
        supabaseFallbackWarning();
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
}

export const supabase = missingConfig
  ? createSupabaseStub()
  : createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { headers: { "X-Client-Info": "fusion-starter-client" } },
    });

export const isSupabaseConfigured = !missingConfig;

export default supabase;



