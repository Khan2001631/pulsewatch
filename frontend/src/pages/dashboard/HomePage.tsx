import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks/redux";
import { useLogoutMutation } from "@/services/authApi";
import {
  useGetMonitorsQuery,
  useCreateMonitorMutation,
  useUpdateMonitorMutation,
  useDeleteMonitorMutation,
} from "@/services/monitorsApi";
import { MonitorForm } from "@/components/monitors/MonitorForm";
import { DeleteConfirmModal } from "@/components/monitors/DeleteConfirmModal";
import type { Monitor, HTTPMethod } from "@/types/monitor";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"Overview" | "Endpoints">("Overview");

  // Fetch real monitors data
  const { data: monitors = [], isLoading: isMonitorsLoading } = useGetMonitorsQuery();

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
  const totalMonitors = monitors.length;
  const activeMonitorsCount = monitors.filter((m) => m.is_active).length;

  const statCards = [
    {
      label: "Total Endpoints",
      value: totalMonitors.toString(),
      change: "Configured API/URLs",
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      ),
      color: "blue",
    },
    {
      label: "Overall Uptime",
      value: totalMonitors > 0 ? "100%" : "—",
      change: "No check history yet",
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "emerald",
    },
    {
      label: "Active Incidents",
      value: "0",
      change: "No active incidents",
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: "amber",
    },
    {
      label: "Avg Response Time",
      value: "—",
      change: "Monitoring inactive",
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "violet",
    },
  ];

  const navItems = [
    {
      label: "Overview",
      active: activeTab === "Overview",
      onClick: () => {
        setActiveTab("Overview");
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
      active: false,
      disabled: true,
      icon: <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
    {
      label: "Analytics",
      active: false,
      disabled: true,
      icon: <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    {
      label: "Settings",
      active: false,
      disabled: true,
      icon: <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                Dashboard · {activeTab === "Overview" ? "All endpoints" : "Manage monitors"}
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

          {activeTab === "Overview" ? (
            /* ─── Overview Tab ─── */
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

              {/* Endpoints Table inside Overview */}
              <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Monitored Endpoints</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live status of your configured URLs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs text-slate-500">Overview</span>
                  </div>
                </div>

                {isMonitorsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
                    <p className="text-xs">Loading monitors...</p>
                  </div>
                ) : monitors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <svg className="w-10 h-10 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-400">No monitors configured yet</p>
                    <p className="text-xs text-slate-600 mt-1 mb-4">Add your first HTTP/HTTPS endpoint to get started</p>
                    <button
                      onClick={handleOpenCreate}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-white transition-all duration-150"
                    >
                      Add First Monitor
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/4">
                    {monitors.map((ep) => {
                      const statusKey = ep.is_active ? "active" : "paused";
                      const s = statusConfig[statusKey];
                      return (
                        <div
                          key={ep.id}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors cursor-pointer"
                          onClick={() => handleOpenEdit(ep)}
                        >
                          {/* Status dot */}
                          <div className="flex-shrink-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                background: s.dot,
                                boxShadow: `0 0 6px ${s.dot}`,
                                animation: ep.is_active ? "pulse-glow 2s ease-in-out infinite" : "none",
                              }}
                            />
                          </div>

                          {/* Name & URL */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                                {ep.method}
                              </span>
                              <p className="text-sm font-medium text-slate-200 truncate">{ep.name}</p>
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-0.5">{ep.url}</p>
                          </div>

                          {/* Check interval */}
                          <div className="hidden md:flex flex-col items-end gap-1 w-24 text-right">
                            <span className="text-xs font-medium text-slate-300">{ep.check_interval_seconds}s</span>
                            <span className="text-[10px] text-slate-600">Interval</span>
                          </div>

                          {/* Expected Status Code */}
                          <div className="hidden sm:block w-20 text-right">
                            <span className="text-xs font-medium text-emerald-400">
                              exp: {ep.expected_status_code}
                            </span>
                          </div>

                          {/* Status badge */}
                          <div
                            className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border"
                            style={{ background: s.badge, color: s.badgeText, borderColor: s.badgeBorder }}
                          >
                            {s.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
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
                        <th className="py-3 px-4 text-center">Expected Status</th>
                        <th className="py-3 px-4 text-center">Check Interval</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                      {monitors.map((monitor) => (
                        <tr key={monitor.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3.5 px-5 max-w-xs sm:max-w-md">
                            <div className="font-semibold text-slate-200 truncate">{monitor.name}</div>
                            <div className="text-xs text-slate-600 truncate mt-0.5">{monitor.url}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block text-xs font-bold font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
                              {monitor.method}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono text-emerald-400 font-semibold">{monitor.expected_status_code}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            {monitor.check_interval_seconds}s
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleActive(monitor)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                monitor.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                              }`}
                              title={monitor.is_active ? "Click to pause monitoring" : "Click to resume monitoring"}
                            >
                              {monitor.is_active ? "Active" : "Paused"}
                            </button>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEdit(monitor)}
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                title="Edit Monitor"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleOpenDelete(monitor)}
                                className="p-1.5 rounded bg-red-500/5 hover:bg-red-500/15 text-red-500 hover:text-red-400 transition-colors"
                                title="Delete Monitor"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
