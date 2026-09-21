import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Table,
  ArrowDownToLine
} from 'lucide-react';
import { DashboardMetrics } from '../types';

interface ReportsCsvTabProps {
  metrics: DashboardMetrics | null;
  onDownloadCsv: (type: 'today_activity' | 'all_members' | 'join_requests' | 'audit_logs') => void;
  canExport?: boolean;
}

export const ReportsCsvTab: React.FC<ReportsCsvTabProps> = ({
  metrics,
  onDownloadCsv,
  canExport = true,
}) => {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const handleDownload = (type: 'today_activity' | 'all_members' | 'join_requests' | 'audit_logs') => {
    setDownloadingType(type);
    onDownloadCsv(type);
    setTimeout(() => setDownloadingType(null), 1000);
  };

  const reports = [
    {
      id: 'today_activity' as const,
      title: "Today's Joining & Exit Activity Report",
      badge: "High Priority",
      description: "Includes all member arrivals, departures, rejoin indicators, timestamps, and usernames for today's date.",
      stats: `${metrics?.todayJoiningCount || 0} joins, ${metrics?.todayExitingCount || 0} exits today`,
      icon: Calendar,
      color: 'emerald',
      fields: ['Telegram ID', 'Username', 'Full Name', 'Action (JOIN/EXIT)', 'Join Count', 'Is Rejoined', 'Timestamp', 'Current Status'],
    },
    {
      id: 'all_members' as const,
      title: 'Full Member Roster & Retention Directory',
      badge: 'Database',
      description: 'Complete all-time database of community members with join counts, first join date, last exit date, and status.',
      stats: `${metrics?.totalActiveMembers || 0} active / ${metrics?.totalHistoricalMembers || 0} total records`,
      icon: Users,
      color: 'sky',
      fields: ['Telegram ID', 'Username', 'First Name', 'Last Name', 'Status', 'Join Count', 'Is Rejoined', 'First Joined', 'Last Joined', 'Last Exited'],
    },
    {
      id: 'join_requests' as const,
      title: 'Join Requests & Auto-Approval History',
      badge: 'Queue',
      description: 'Audit logs of every join applicant, queue state (Open vs Closed when requested), and approval timestamps.',
      stats: `${metrics?.pendingRequestsCount || 0} pending in queue`,
      icon: Clock,
      color: 'purple',
      fields: ['Request ID', 'Telegram ID', 'Username', 'Full Name', 'Status', 'Is Rejoin', 'Previous Joins', 'Requested At', 'Processed By'],
    },
    {
      id: 'audit_logs' as const,
      title: 'System Bot Audit & Operational Logs',
      badge: 'Security',
      description: 'Complete trace of schedule open/close transitions, group permissions changes, admin logins, and broadcast history.',
      stats: 'Full chronological trail',
      icon: ShieldCheck,
      color: 'amber',
      fields: ['Log ID', 'Timestamp', 'Type', 'Action', 'Description', 'Actor', 'Success Status'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">
            Export Reports & Analytical Spreadsheets (CSV)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Export standardized CSV files ready for import into Excel, Google Sheets, or Python/R data pipelines for deeper retention analysis
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((rpt) => {
          const Icon = rpt.icon;
          const isDownloading = downloadingType === rpt.id;

          return (
            <div
              key={rpt.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {rpt.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {rpt.stats}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                    {rpt.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {rpt.description}
                </p>

                {/* Schema preview pill list */}
                <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 mb-4">
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1.5 uppercase tracking-wider">
                    Export Columns Schema:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rpt.fields.map((f, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!canExport || isDownloading}
                onClick={() => handleDownload(rpt.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ArrowDownToLine className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? 'Generating CSV...' : `Download ${rpt.title.split(' ')[0]} CSV`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
