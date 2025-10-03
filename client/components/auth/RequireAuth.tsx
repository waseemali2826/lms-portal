import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

export function RequireAuth({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role || "")
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
