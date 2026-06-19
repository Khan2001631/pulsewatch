import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { GuestGuard } from "@/components/guards/GuestGuard";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { HomePage } from "@/pages/dashboard/HomePage";
import { IncidentDetailsPage } from "@/pages/dashboard/IncidentDetailsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (Guest Only) */}
        <Route element={<GuestGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Routes (Authenticated Only) */}
        <Route element={<AuthGuard />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/incidents" element={<Navigate to="/" state={{ tab: "Incidents" }} replace />} />
          <Route path="/incidents/:id" element={<IncidentDetailsPage />} />
          {/* Add more protected routes here */}
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}