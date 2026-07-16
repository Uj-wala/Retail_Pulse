import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

interface RoleRouteProps {
  allow: UserRole[];
}

export function RoleRoute({ allow }: RoleRouteProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
