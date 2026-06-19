import { useGetResponseTimesQuery } from "@/services/dashboardApi";

export function ResponseTimeCard() {
  const { data, isLoading } = useGetResponseTimesQuery(undefined, { pollingInterval: 10000 });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.monitors.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex flex-col items-center justify-center text-slate-500">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">No response times yet</p>
        <p className="text-xs text-slate-500 mt-1">Metrics will appear after the first check</p>
      </div>
    );
  }

  // Calculate the max response time to scale the visual bars relative to the slowest request.
  // Using Math.max with a minimum fallback of 100ms.
  const allTimes = data.monitors.flatMap(m => [m.average_response_time_ms || 0, m.latest_response_time_ms || 0]);
  const maxTime = Math.max(100, ...allTimes);

  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080d18]/40">
        <div>
          <h3 className="text-sm font-semibold text-white">Response Times</h3>
          <p className="text-xs text-slate-500 mt-0.5">Average (24h) and latest latencies</p>
        </div>
      </div>
      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        {data.monitors.map((m) => {
          const avg = m.average_response_time_ms ?? 0;
          const latest = m.latest_response_time_ms ?? 0;
          const avgPct = Math.min(100, (avg / maxTime) * 100);
          const latestPct = Math.min(100, (latest / maxTime) * 100);

          return (
            <div key={m.monitor_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 truncate">{m.monitor_name}</span>
              </div>
              
              <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span className="text-[10px] text-slate-500 font-mono text-right">AVG: {avg > 0 ? `${Math.round(avg)}ms` : "—"}</span>
                <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full bg-violet-500/70 rounded-full transition-all duration-1000"
                    style={{ width: `${avgPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span className="text-[10px] text-slate-500 font-mono text-right">NOW: {latest > 0 ? `${latest}ms` : "—"}</span>
                <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      latest > avg * 1.5 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-blue-400"
                    }`}
                    style={{ width: `${latestPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
