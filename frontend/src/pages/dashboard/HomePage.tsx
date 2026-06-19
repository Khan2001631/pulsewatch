import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/redux";
import { useLogoutMutation } from "@/services/authApi";
import {
  useGetMonitorsQuery,
  useCreateMonitorMutation,
  useUpdateMonitorMutation,
  useDeleteMonitorMutation,
} from "@/services/monitorsApi";
import { useGetIncidentsQuery } from "@/services/incidentsApi";
import { MonitorForm } from "@/components/monitors/MonitorForm";
import { DeleteConfirmModal } from "@/components/monitors/DeleteConfirmModal";
import { MonitorRow } from "@/components/monitors/MonitorRow";
import { IncidentsPage } from "@/pages/dashboard/IncidentsPage";
import { UptimeCard } from "@/components/dashboard/UptimeCard";
import { ResponseTimeCard } from "@/components/dashboard/ResponseTimeCard";
import { RecentIncidentsCard } from "@/components/dashboard/RecentIncidentsCard";
import { useGetSummaryQuery } from "@/services/dashboardApi";
import type { Monitor } from "@/types/monitor";

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  blue:    { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", border: "rgba(59,130,246,0.2)", glow: "rgba(59,130,246,0.15)" },
  emerald: { bg: "rgba(16,185,129,0.1)", text: "#34d399", border: "rgba(16,185,129,0.2)", glow: "rgba(16,185,129,0.15)" },
  amber:   { bg: "rgba(245,158,11,0.1)", text: "#fbbf24", border: "rgba(245,158,11,0.2)", glow: "rgba(245,158,11,0.15)" },
  violet:  { bg: "rgba(139,92,246,0.1)", text: "#a78bfa", border: "rgba(139,92,246,0.2)", glow: "rgba(139,92,246,0.15)" },
};

const statusConfig = {
  active: { dot: "#10b981", label: "Active", badge: "rgba(16,185,129,0.12)", badgeText: "#34d399", badgeBorder: "rgba(16,185,129,0.25)" },
  paused: { dot: "#f59e0b", label: "Paused", badge: "rgba(245,158,11,0.12)", badgeText: "#fbbf24", badgeBorder: "rgba(245,158,11,0.25)" },
};

export function HomePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"Dashboard" | "Endpoints" | "Incidents">(
    (location.state as any)?.tab || "Dashboard"
  );

  // Fetch real monitors data
  const { data: monitors = [], isLoading: isMonitorsLoading } = useGetMonitorsQuery();

  // Fetch real incidents data
  const { data: incidents = [] } = useGetIncidentsQuery(undefined, {
    pollingInterval: 10000, // Sync with backend scheduler tick (10 seconds)
  });

  // Fetch dashboard summary
  const { data: summaryData, isLoading: isSummaryLoading } = useGetSummaryQuery(undefined, {
    pollingInterval: 10000,
  });

  // Mutations
  const [createMonitor, { isLoading: isCreating }] = useCreateMonitorMutation();
  const [updateMonitor, { isLoading: isUpdating }] = useUpdateMonitorMutation();
  const [deleteMonitor, { isLoading: isDeleting }] = useDeleteMonitorMutation();

  // Dialog/Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Monitor | null>(null);
  const [formTitle, setFormTitle] = useState("Create Monitor");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // ignore
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setFormInitialData(null);
    setFormTitle("Create New Monitor");
    setIsFormOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (monitor: Monitor) => {
    setFormInitialData(monitor);
    setFormTitle("Edit Monitor");
    setIsFormOpen(true);
  };

  // Open delete confirmation modal
  const handleOpenDelete = (monitor: Monitor) => {
    setDeletingMonitor(monitor);
    setIsDeleteOpen(true);
  };

  // Form submit handler
  const handleFormSubmit = async (values: any) => {
    try {
      if (formInitialData) {
        // Edit flow
        await updateMonitor({
          id: formInitialData.id,
          data: values,
        }).unwrap();
      } else {
        // Create flow
        await createMonitor(values).unwrap();
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    if (!deletingMonitor) return;
    try {
      await deleteMonitor(deletingMonitor.id).unwrap();
      setIsDeleteOpen(false);
    } catch (error) {
      console.error("Failed to delete monitor:", error);
    }
  };

  // Toggle monitor active status (Pause/Resume)
  const handleToggleActive = async (monitor: Monitor) => {
    try {
      await updateMonitor({
        id: monitor.id,
        data: { is_active: !monitor.is_active },
      }).unwrap();
    } catch (error) {
      console.error("Failed to toggle monitor status:", error);
    }
  };

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "U";

  // Calculate dynamic stats
  const totalMonitors = summaryData?.total_monitors || 0;
  const activeMonitorsCount = summaryData?.healthy_monitors || 0;
  const downMonitorsCount = summaryData?.down_monitors || 0;
  const openIncidentsCount = summaryData?.open_incidents || 0;

  const statCards = [
    {
      label: "Total Endpoints",
      value: isSummaryLoading ? "..." : totalMonitors.toString(),
      change: "Configured API/URLs",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      ),
      color: "blue",
    },
    {
      label: "Healthy Endpoints",
      value: isSummaryLoading ? "..." : activeMonitorsCount.toString(),
      change: "Active without issues",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "emerald",
    },
    {
      label: "Down Endpoints",
      value: isSummaryLoading ? "..." : downMonitorsCount.toString(),
      change: downMonitorsCount > 0 ? "Currently experiencing outages" : "All services operational",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: downMonitorsCount > 0 ? "red" : "emerald",
    },
    {
      label: "Open Incidents",
      value: isSummaryLoading ? "..." : openIncidentsCount.toString(),
      change: openIncidentsCount > 0 ? "Action required" : "No active incidents",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: openIncidentsCount > 0 ? "amber" : "emerald",
    },
  ];

  const navItems = [
    {
      label: "Dashboard",
      active: activeTab === "Dashboard",
      onClick: () => {
        setActiveTab("Dashboard");
        setSidebarOpen(false);
      },
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
      label: "Endpoints",
      active: activeTab === "Endpoints",
      onClick: () => {
        setActiveTab("Endpoints");
        setSidebarOpen(false);
      },
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
    },
    {
      label: "Incidents",
      active: activeTab === "Incidents",
      onClick: () => {
        setActiveTab("Incidents");
        setSidebarOpen(false);
      },
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
  ];

  return (
    <div className="min-h-screen bg-[#060b14] flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col border-r border-white/5 bg-[#080d18] transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 opacity-20 blur-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">PulseWatch</p>
            <p className="text-xs text-slate-500">API Monitoring</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              disabled={item.disabled}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                item.active
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/4"
              } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 pb-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/4 transition-colors cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
              <p className="text-xs text-slate-600">Free plan</p>
            </div>
            <button
              id="home-logout-btn"
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-5 border-b border-white/5 bg-[#060b14]/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white">{activeTab}</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Dashboard · {activeTab === "Dashboard" ? "All endpoints" : "Manage monitors"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeMonitorsCount} / {totalMonitors} Active
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/8 border border-white/6 hover:border-red-500/20 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 p-5 lg:p-7 space-y-6 overflow-y-auto">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl p-5 lg:p-6 border border-white/6"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 50%, rgba(52,211,153,0.05) 100%)" }}>
            <div className="glow-orb absolute -right-16 -top-16 w-48 h-48 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Welcome 👋</p>
                <h2 className="text-xl font-bold text-white">
                  Welcome back, <span className="text-gradient">{user?.email?.split("@")[0]}</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  System operational &nbsp;·&nbsp; {activeMonitorsCount} endpoints actively monitored
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="hidden sm:flex btn-primary-glow items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add monitor
              </button>
            </div>
          </div>

          {activeTab === "Dashboard" ? (
            /* ─── Dashboard Tab ─── */
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {statCards.map((card, i) => {
                  const c = colorMap[card.color];
                  return (
                    <div
                      key={i}
                      className="stat-card rounded-xl p-4 animate-fade-in"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                        >
                          {card.icon}
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white mb-0.5">{card.value}</p>
                      <p className="text-xs text-slate-500">{card.label}</p>
                      <p className="text-xs mt-1.5 text-slate-400">
                        {card.change}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
                <UptimeCard />
                <ResponseTimeCard />
              </div>
              <div className="mt-5 lg:mt-7">
                <RecentIncidentsCard />
              </div>
            </>
          ) : activeTab === "Endpoints" ? (
            /* ─── Endpoints/Monitors Configuration Tab ─── */
            <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080d18]/40">
                <div>
                  <h3 className="text-sm font-semibold text-white">Monitors Configuration</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your HTTP/HTTPS endpoints health parameters</p>
                </div>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Monitor
                </button>
              </div>

              {isMonitorsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
                  <p className="text-xs">Loading endpoints...</p>
                </div>
              ) : monitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <svg className="w-12 h-12 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-medium text-slate-400">No monitors configured yet</p>
                  <p className="text-xs text-slate-600 mt-1 mb-4">Configure your first health check monitoring endpoint</p>
                  <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                    Create Monitor
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-semibold text-slate-500 bg-[#080d18]/20">
                        <th className="py-3 px-5">Name & URL</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4 text-center">Expected</th>
                        <th className="py-3 px-4 text-center">Interval</th>
                        <th className="py-3 px-4 text-center">Health</th>
                        <th className="py-3 px-4 text-center">Response</th>
                        <th className="py-3 px-4 text-center">Last Check</th>
                        <th className="py-3 px-4 text-center">Schedule</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                      {monitors.map((monitor) => (
                        <MonitorRow
                          key={monitor.id}
                          monitor={monitor}
                          variant="table"
                          onEdit={handleOpenEdit}
                          onDelete={handleOpenDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ─── Incidents Tab ─── */
            <IncidentsPage />
          )}
        </main>
      </div>

      {/* Monitor creation / edit form modal */}
      <MonitorForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={formInitialData}
        title={formTitle}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        monitorName={deletingMonitor?.name ?? ""}
        isLoading={isDeleting}
      />
    </div>
  );
}
