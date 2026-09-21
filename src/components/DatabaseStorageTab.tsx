import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  HardDrive,
  Table,
  CheckCircle2,
  RefreshCw,
  Clock,
  Shield,
  FileCode,
  Calendar,
  Layers,
  ArrowDownCircle,
  Activity,
  GitBranch,
  Terminal,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { DashboardMetrics } from '../types';

interface DatabaseStats {
  engine: string;
  databasePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  lastModified: string;
  schemaVersion: number;
  tables: {
    membersCount: number;
    activeMembersCount: number;
    exitedMembersCount: number;
    joinRequestsCount: number;
    pendingRequestsCount: number;
    dailySnapshotsCount: number;
    announcementsCount: number;
    adminsCount: number;
    logsCount: number;
    notificationsCount: number;
  };
}

interface DatabaseStorageTabProps {
  metrics: DashboardMetrics | null;
}

export const DatabaseStorageTab: React.FC<DatabaseStorageTabProps> = ({ metrics }) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingArchive, setDownloadingArchive] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch database stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadBackup = () => {
    setDownloading(true);
    window.location.href = '/api/database/backup';
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleDownloadArchive = () => {
    setDownloadingArchive(true);
    window.location.href = '/api/project/export-zip';
    setTimeout(() => setDownloadingArchive(false), 2500);
  };

  const gitCommands = [
    '# 1. Initialize git and commit',
    'git init',
    'git branch -M main',
    'git add .',
    'git commit -m "feat: Telegram Group Automator full project"',
    '',
    '# 2. Push to your repository (PremKumar829/Tobod)',
    'git remote add origin https://github.com/PremKumar829/Tobod.git',
    'git push -u origin main --force'
  ].join('\n');

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">
                  Database & Storage Architecture
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  Persistent Storage Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Persistent relational data storage for Telegram members, 12:00 AM IST daily snapshots, multi-level admin roles, and join request queues.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </button>
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Export Database JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Database Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Storage Engine</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-100 font-mono">
            {stats?.engine || 'Persistent JSON/SQLite'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono truncate">
            {stats?.databasePath || '/data/db.json'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Database File Size</span>
            <FileCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-100 font-mono">
            {stats?.fileSizeFormatted || 'Calculating...'}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimal query performance</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">12:00 AM IST Snapshots</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-amber-300 font-mono">
            {stats?.tables.dailySnapshotsCount ?? metrics?.dailyHistory?.length ?? 0} days recorded
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Auto-reset daily at 00:00 IST
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Tracked Members</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-purple-300 font-mono">
            {stats?.tables.membersCount ?? metrics?.totalHistoricalMembers ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats?.tables.activeMembersCount ?? metrics?.totalActiveMembers ?? 0} currently active
          </div>
        </div>
      </div>

      {/* Tables Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Database Table Schemas & Row Counts
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Schema Version {stats?.schemaVersion || 2}
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 text-xs">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">members</div>
              <div className="text-slate-400 text-[11px]">
                Telegram members, join counts, rejoin tags, first joined timestamp, last exit timestamp.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-slate-200">
                {stats?.tables.membersCount ?? 0} records
              </span>
              <span className="text-emerald-400 font-mono text-[11px]">
                ({stats?.tables.activeMembersCount ?? 0} active / {stats?.tables.exitedMembersCount ?? 0} exited)
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">dailySnapshots (12:00 AM IST Archive)</div>
              <div className="text-slate-400 text-[11px]">
                Historical snapshots recorded every midnight at 12:00 AM Indian Standard Time.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-amber-300">
                {stats?.tables.dailySnapshotsCount ?? 0} records
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">joinRequests</div>
              <div className="text-slate-400 text-[11px]">
                Queued chat join applicants awaiting automatic or manual approval when group is open.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-purple-300">
                {stats?.tables.joinRequestsCount ?? 0} records
              </span>
              <span className="text-amber-400 font-mono text-[11px]">
                ({stats?.tables.pendingRequestsCount ?? 0} pending)
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">admins (Multi-Level RBAC)</div>
              <div className="text-slate-400 text-[11px]">
                Admin accounts with role hierarchy (Level 1 Owner, Level 2 Analyst, Level 3 Moderator), PIN credentials and Telegram User IDs.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-sky-300">
                {stats?.tables.adminsCount ?? 0} records
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">announcements</div>
              <div className="text-slate-400 text-[11px]">
                Broadcast announcements sent to group with pinned and silent status flags.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-slate-300">
                {stats?.tables.announcementsCount ?? 0} records
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
            <div>
              <div className="font-bold text-slate-200 font-mono">activityLogs & ownerNotifications</div>
              <div className="text-slate-400 text-[11px]">
                Audit trails of schedule transitions, join approvals, member removals, and owner alerts.
              </div>
            </div>
            <div className="flex items-center space-x-3 text-right shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-800 font-mono font-bold text-slate-300">
                {(stats?.tables.logsCount ?? 0) + (stats?.tables.notificationsCount ?? 0)} records
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Backup & Deployment Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Database Persistence & Backup Instructions
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              When hosting on Render, Railway, or VPS, mount a persistent disk at <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">/data</code> or set environment variable <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">DATA_DIR=/var/data</code>. You can click "Export Database JSON" anytime to create an instant offline backup of all members, historical snapshots, and admin accounts.
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Connection & Direct Source Code Export */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                GitHub Connection & Source Code Export
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold border border-purple-500/30">
                  Ready to Push
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Troubleshooting Google AI Studio GitHub export and direct repository setup.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadArchive}
            disabled={downloadingArchive}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-900/20 transition-all disabled:opacity-60 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingArchive ? 'Packaging Code...' : 'Download Full Code (.ZIP)'}</span>
          </button>
        </div>

        {/* Troubleshooting Alert */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
          <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Facing "Unable to connect with GitHub" in Google AI Studio?</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 pl-6 list-disc">
            <li>
              <strong className="text-amber-200">Pop-up Blocker:</strong> Look at your browser address bar (URL bar). Click the blocked pop-up icon and select <strong className="text-amber-200">"Always allow pop-ups and redirects from ai.studio"</strong>.
            </li>
            <li>
              <strong className="text-amber-200">Third-Party Cookies / Privacy Shield:</strong> If using Brave, Safari, or Chrome incognito, allow third-party cookies or temporarily pause shields so the GitHub OAuth handshake completes.
            </li>
            <li>
              <strong className="text-amber-200">GitHub Organization Access:</strong> If creating under a GitHub organization, ensure OAuth app access is granted under your GitHub Account Settings &gt; Applications.
            </li>
          </ul>
        </div>

        {/* Manual Push Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Manual Push to GitHub (Zero-Dependency Method)
            </span>
            <button
              onClick={handleCopyCommands}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
            >
              {copiedCommands ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Commands</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {gitCommands}
          </pre>
        </div>
      </div>
    </div>
  );
};
