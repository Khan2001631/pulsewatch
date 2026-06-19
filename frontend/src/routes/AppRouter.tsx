import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { IncidentsPage } from "@/pages/dashboard/IncidentsPage";
import { IncidentDetailsPage } from "@/pages/dashboard/IncidentDetailsPage";

const Login = () => <div>Login Page</div>;
const Dashboard = () => <div>Dashboard</div>;
const Monitors = () => <div>Monitors</div>;

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/monitors" element={<Monitors />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailsPage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}