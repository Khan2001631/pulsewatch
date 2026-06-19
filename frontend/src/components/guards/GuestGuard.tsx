import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/hooks/redux";

export function GuestGuard() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
