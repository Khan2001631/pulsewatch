import { useGetRecentIncidentsQuery } from "@/services/dashboardApi";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export function RecentIncidentsCard() {
  const { data, isLoading } = useGetRecentIncidentsQuery(undefined, { pollingInterval: 10000 });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const incidents = data?.incidents || [];

  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm p-5 h-[300px] flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400">All clear</p>
        <p className="text-xs text-slate-500 mt-1">No recent incidents detected</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/2 backdrop-blur-sm flex flex-col h-full max-h-[400px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080d18]/40">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Incidents</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest service interruptions</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {incidents.map((incident) => {
            const isOpen = incident.status === "OPEN";
            return (
              <Link 
                to={`/incidents/${incident.id}`} 
                key={incident.id}
                className="block p-4 hover:bg-white/4 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isOpen ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> OPEN
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> RESOLVED
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-200">{incident.monitor.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{incident.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">
                      Started: {formatDistanceToNow(parseISO(incident.started_at), { addSuffix: true })}
                    </p>
                    {!isOpen && incident.resolved_at && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Resolved: {formatDistanceToNow(parseISO(incident.resolved_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
