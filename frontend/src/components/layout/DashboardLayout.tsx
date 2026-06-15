import { Button } from "@/ui/button";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white p-4">
                <h2 className="text-xl font-bold">PulseWatch</h2>
                <nav className="mt-6 space-y-2">
                <div>Dashboard</div>
                <div>Monitors</div>
                <div>Incidents</div>
                </nav>
            </aside>
            {/* Main content */}
            <main className="flex-1 p-6 bg-gray-100">
                <Button>PulseWatch Button Works</Button>;
                <Outlet />
            </main>
        </div>
  );
}