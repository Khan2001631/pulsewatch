import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

const Login = () => <div>Login Page</div>;
const Dashboard = () => <div>Dashboard</div>;
const Monitors = () => <div>Monitors</div>;
const Incidents = () => <div>Incidents</div>;

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
            <Route path="/incidents" element={<Incidents />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}