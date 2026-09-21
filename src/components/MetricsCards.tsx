import React from 'react';
import {
  UserPlus,
  UserMinus,
  Users,
  Clock,
  Sparkles,
  Repeat,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsCardsProps {
  metrics: DashboardMetrics | null;
  onFilterMembers?: (filter: string) => void;
  onApproveAll?: () => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  onFilterMembers,
  onApproveAll,
}) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: 'metric-today-joins',
      label: "Today's Joins (IST)",
      badge: '12 AM Reset',
      value: metrics.todayJoiningCount,
      subtext: `+${metrics.newMembersCount} new, +${metrics.uniqueRejoinedCount} rejoin`,
      icon: UserPlus,
      color: 'emerald',
      filter: 'today_joined',
      accent: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400',
    },
    {
      id: 'metric-today-exits',
      label: "Today's Exits (IST)",
      badge: 'Today',
      value: metrics.todayExitingCount,
      subtext: metrics.todayExitingCount > 0 ? 'Left group today' : '0 exits today',
      icon: UserMinus,
      color: 'rose',
      filter: 'today_exited',
      accent: 'border-rose-500/30 bg-rose-950/30 text-rose-400',
    },
    {
      id: 'metric-yesterday-joins',
      label: "Yesterday's Joins",
      badge: 'IST Yesterday',
      value: metrics.yesterdayJoiningCount ?? 0,
      subtext: `+${metrics.yesterdayNewMembersCount ?? 0} new, +${metrics.yesterdayRejoinedCount ?? 0} rejoin`,
      icon: UserPlus,
      color: 'sky',
      filter: 'yesterday_joined',
      accent: 'border-sky-500/30 bg-sky-950/30 text-sky-400',
    },
    {
      id: 'metric-yesterday-exits',
      label: "Yesterday's Exits",
      badge: 'Archived',
      value: metrics.yesterdayExitingCount ?? 0,
      subtext: (metrics.yesterdayExitingCount ?? 0) > 0 ? 'Exited yesterday' : '0 exits yesterday',
      icon: UserMinus,
      color: 'amber',
      filter: 'yesterday_exited',
      accent: 'border-amber-500/30 bg-amber-950/30 text-amber-400',
    },
    {
      id: 'metric-pending-requests',
      label: 'Pending Queue',
      badge: metrics.currentGroupStatus === 'closed' ? 'Closed' : 'Open',
      value: metrics.pendingRequestsCount,
      subtext: metrics.currentGroupStatus === 'closed' ? 'Queued for morning' : 'Ready for approval',
      icon: Clock,
      color: 'purple',
      filter: 'pending',
      accent: metrics.pendingRequestsCount > 0
        ? 'border-purple-500/40 bg-purple-950/30 text-purple-300 ring-1 ring-purple-500/30'
        : 'border-slate-800 bg-slate-900/50 text-slate-400',
      action: metrics.pendingRequestsCount > 0 ? 'Approve' : undefined,
    },
    {
      id: 'metric-total-active',
      label: 'Active Members',
      badge: 'Live',
      value: metrics.totalActiveMembers,
      subtext: `From ${metrics.totalHistoricalMembers} all-time records`,
      icon: Users,
      color: 'indigo',
      filter: 'active',
      accent: 'border-indigo-500/30 bg-indigo-950/30 text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            id={c.id}
            onClick={() => onFilterMembers && onFilterMembers(c.filter)}
            className="relative p-3.5 rounded-xl border border-slate-800 transition-all duration-200 cursor-pointer hover:border-slate-600 bg-slate-900/90 shadow-sm flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors truncate">
                  {c.label}
                </span>
              </div>
              <div className={`p-1.5 rounded-lg border ${c.accent}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
                  {c.value}
                </span>
                {c.badge && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5" title={c.subtext}>
                {c.subtext}
              </div>
            </div>

            {c.action && onApproveAll && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll();
                }}
                className="mt-1 w-full py-1 px-2 text-[11px] font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors flex items-center justify-center space-x-1 shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-Approve</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
