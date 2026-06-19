import { useGetUptimeQuery } from "@/services/dashboardApi";

export function UptimeCard() {
  // Use 10-second polling to keep data fresh
  const { data, isLoading } = useGetUptimeQuery(undefined, { pollingInterval: 10000 });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.monitors.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex flex-col items-center justify-center text-slate-500">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">No uptime data available</p>
        <p className="text-xs text-slate-500 mt-1">Configure monitors to start collecting metrics</p>
      </div>
    );
  }

  // Calculate colors based on percentage
  const getColor = (pct: number) => {
    if (pct >= 99) return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    if (pct >= 95) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  };

  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080d18]/40">
        <div>
          <h3 className="text-sm font-semibold text-white">Uptime Tracking</h3>
          <p className="text-xs text-slate-500 mt-0.5">Overall and individual endpoint success rates</p>
        </div>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">
        {/* Overall stat */}
        <div className="mb-6 pb-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Global 24h Uptime</p>
            <p className="text-2xl font-bold text-white">{data.overall_uptime_24h.toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Global 7d Uptime</p>
            <p className="text-2xl font-bold text-white">{data.overall_uptime_7d.toFixed(2)}%</p>
          </div>
        </div>

        {/* Individual monitors */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Endpoint Breakdown (24h)</p>
          {data.monitors.map((m) => (
            <div key={m.monitor_id}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium truncate pr-4">{m.monitor_name}</span>
                <span className={m.uptime_24h >= 99 ? "text-emerald-400" : m.uptime_24h >= 95 ? "text-amber-400" : "text-red-400"}>
                  {m.uptime_24h.toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${getColor(m.uptime_24h)}`}
                  style={{ width: `${m.uptime_24h}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
