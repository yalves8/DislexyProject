import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "../contexts/AuthContext";
import type { ReactNode } from "react";

interface Props {
  role: Role;
  children: ReactNode;
}

export default function ProtectedRoute({ role, children }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === "student" ? "/student/portal" : "/teacher/dashboard"} replace />;
  }

  return <>{children}</>;
}
