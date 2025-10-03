import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import type { RolePermissions } from "@/pages/roles/types";

export function RequirePermission({
  module,
  action = "view",
  redirectTo,
  children,
}: {
  module: keyof RolePermissions;
  action?: "view" | "add" | "edit" | "delete";
  redirectTo?: string | null;
  children: JSX.Element;
}) {
  const { isAuthenticated, role, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role === "owner") {
    return children;
  }

  if (!can(module, action)) {
    if (redirectTo === null) return <></>;
    return <Navigate to={redirectTo ?? "/dashboard"} replace />;
  }

  return children;
}
