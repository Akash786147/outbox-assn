import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/scheduled" replace /> : <Outlet />;
}
