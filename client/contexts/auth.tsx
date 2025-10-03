import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { RolePermissions } from "@/pages/roles/types";
import { roles as seedRoles } from "@/pages/roles/data";

const OWNER_EMAIL = "waseem38650@gmail.com";
const LIMITED_EMAIL = "waseemscs105@gmail.com";

type User = { email: string; uid: string } | null;

type AuthContextType = {
  user: User;
  role: string | null; // owner | limited
  appRoleId: string | null; // e.g., role-frontdesk
  perms: RolePermissions | null;
  can: (
    module: keyof RolePermissions,
    action?: "view" | "add" | "edit" | "delete",
  ) => boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractRoleFromUser(u: any) {
  const email: string | null = u?.email ?? null;
  const meta = (u?.user_metadata || {}) as Record<string, any>;
  const role = (meta.role as string) || null;
  const appRoleId = (meta.appRoleId as string) || null;
  let resolvedRole = role;
  let resolvedAppRoleId = appRoleId;
  if (!resolvedRole && email) {
    if (email === OWNER_EMAIL) resolvedRole = "owner";
    else if (email === LIMITED_EMAIL) resolvedRole = "limited";
  }
  if (!resolvedAppRoleId && email === LIMITED_EMAIL)
    resolvedAppRoleId = "role-frontdesk";
  return { resolvedRole, resolvedAppRoleId } as const;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>(null);
  const [role, setRole] = useState<string | null>(null);
  const [appRoleId, setAppRoleId] = useState<string | null>(null);
  const [perms, setPerms] = useState<RolePermissions | null>(null);

  // Initialize from current session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!mounted) return;
        const u = session?.user || null;
        setUser(u?.email ? { email: u.email, uid: u.id } : null);
        const { resolvedRole, resolvedAppRoleId } = extractRoleFromUser(u);
        setRole(resolvedRole);
        setAppRoleId(resolvedAppRoleId);
        // resolve permissions
        let base: RolePermissions | null = null;
        if (resolvedAppRoleId) {
          const def = seedRoles.find((x) => x.id === resolvedAppRoleId);
          if (def) base = def.permissions;
          try {
            const resp = await fetch(`/api/role-perms/${resolvedAppRoleId}`);
            if (resp.ok) {
              const data = await resp.json();
              if (data?.permissions) base = data.permissions as RolePermissions;
            }
          } catch {}
          try {
            const raw = localStorage.getItem(`rolePerms:${resolvedAppRoleId}`);
            if (raw) base = JSON.parse(raw);
          } catch {}
        }
        setPerms(base);
      } catch (err: any) {
        // Network or Supabase errors should not crash the app; show friendly toast
        if (
          err &&
          (err.message?.toLowerCase?.().includes("failed to fetch") ||
            err.message?.toLowerCase?.().includes("network"))
        ) {
          toast({
            title: "Network error",
            description:
              "Unable to reach Supabase. Check VITE_SUPABASE_URL and your network connection.",
          });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to auth state changes (sign in/out, token refresh)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user || null;
        setUser(u?.email ? { email: u.email, uid: u.id } : null);
        const { resolvedRole, resolvedAppRoleId } = extractRoleFromUser(u);
        setRole(resolvedRole);
        setAppRoleId(resolvedAppRoleId);
        // resolve permissions
        let base: RolePermissions | null = null;
        if (resolvedAppRoleId) {
          const def = seedRoles.find((x) => x.id === resolvedAppRoleId);
          if (def) base = def.permissions;
          try {
            const resp = await fetch(`/api/role-perms/${resolvedAppRoleId}`);
            if (resp.ok) {
              const data = await resp.json();
              if (data?.permissions) base = data.permissions as RolePermissions;
            }
          } catch {}
          try {
            const raw = localStorage.getItem(`rolePerms:${resolvedAppRoleId}`);
            if (raw) base = JSON.parse(raw);
          } catch {}
        }
        setPerms(base);
      },
    );
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        toast({
          title: "Supabase not configured",
          description:
            "Authentication is disabled because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Set them in project settings.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        // If the error is a network/fetch failure, show clearer guidance
        const msg = String(err?.message || err || "Authentication error");
        if (
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("network")
        ) {
          toast({
            title: "Network error",
            description:
              "Unable to reach Supabase. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings and ensure network access.",
            variant: "destructive",
          });
          return;
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          if (!data?.session) {
            // If email confirmation is required, inform user
            toast({
              title: "Verify your email",
              description: "Check your inbox to confirm your account.",
            });
            return;
          }
          navigate("/dashboard", { replace: true });
          return;
        } catch (e: any) {
          toast({
            title: "Authentication failed",
            description: e?.message ?? "Check your email/password",
          });
          throw e;
        }
      }
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const can: AuthContextType["can"] = useCallback(
    (module, action = "view") => {
      if (role === "owner") return true;
      if (!perms) return false;
      const p = (perms as any)[module];
      return !!p && !!p[action];
    },
    [role, perms],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      role,
      appRoleId,
      perms,
      can,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, role, appRoleId, perms, can, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
