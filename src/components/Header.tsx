import React from 'react';
import {
  Bot,
  Shield,
  Clock,
  Radio,
  Lock,
  Unlock,
  CheckCheck,
  UserCheck,
  Sliders,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Trash2
} from 'lucide-react';
import { AdminUser, BotConfig, DashboardMetrics } from '../types';

interface HeaderProps {
  config: BotConfig | null;
  metrics: DashboardMetrics | null;
  currentAdmin: AdminUser | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleStatus: (newStatus: 'open' | 'closed') => void;
  onApproveAll: () => void;
  onOpenLoginModal: () => void;
  onOpenSimulator: () => void;
  onOpenClearData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  metrics,
  currentAdmin,
  isRefreshing,
  onRefresh,
  onToggleStatus,
  onApproveAll,
  onOpenLoginModal,
  onOpenSimulator,
  onOpenClearData,
}) => {
  const isOpen = metrics?.currentGroupStatus === 'open';
  const pendingCount = metrics?.pendingRequestsCount || 0;
  const isLevel1 = currentAdmin?.role === 'level_1_owner';

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & Bot Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/10">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  Telegram Group Manager
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Bot Engine v2.5
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-slate-300">
                  {config?.groupTitle || 'Official Group'}
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 font-medium">
                    {config?.botToken ? 'Live Bot Active' : 'Sandbox Ready'}
                  </span>
                </span>
                <span>•</span>
                <span>{config?.timezone || 'UTC'}</span>
              </div>
            </div>
          </div>

          {/* Group Status & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Live Group State Badge */}
            <div className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isOpen
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${isOpen ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
              <span className="uppercase tracking-wider">Group {metrics?.currentGroupStatus}</span>
              {metrics?.nextScheduleEvent && (
                <span className="ml-2 pl-2 border-l border-slate-700 text-slate-400 font-normal">
                  Next: {metrics.nextScheduleEvent.type.toUpperCase()} in {metrics.nextScheduleEvent.countdownMinutes}m
                </span>
              )}
            </div>

            {/* Force Open / Close Action */}
            <button
              id="btn-toggle-group-status"
              onClick={() => onToggleStatus(isOpen ? 'closed' : 'open')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm ${
                isOpen
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
              title={isOpen ? 'Manually close group' : 'Manually open group and auto-approve all pending'}
            >
              {isOpen ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-white" />}
              <span>{isOpen ? 'Force Close' : 'Force Open & Approve'}</span>
            </button>

            {/* Pending Requests Quick Approve */}
            {pendingCount > 0 && (
              <button
                id="btn-quick-approve-all"
                onClick={onApproveAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all animate-pulse"
                title="Approve all pending join requests immediately"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Approve {pendingCount} Pending</span>
              </button>
            )}

            {/* Simulator Trigger */}
            <button
              id="btn-open-simulator"
              onClick={onOpenSimulator}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors"
              title="Open Sandbox to simulate join requests and scheduler events"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Test Simulator</span>
            </button>

            {/* Clear Old Data Trigger */}
            {onOpenClearData && (
              <button
                id="btn-header-clear-data"
                onClick={onOpenClearData}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 transition-colors"
                title="Clear old requests, member history, or audit logs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Data</span>
              </button>
            )}

            {/* Refresh */}
            <button
              id="btn-refresh-dashboard"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Admin Badge & Switcher */}
            <div className="pl-2 border-l border-slate-800 flex items-center">
              <button
                id="btn-current-admin"
                onClick={onOpenLoginModal}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isLevel1
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                }`}
                title="Click to switch admin role or authenticate with PIN"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{isLevel1 ? 'L1: Owner' : 'L2: Moderator'}</span>
                <span className="text-[10px] text-slate-400">({currentAdmin?.name.split(' ')[0]})</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
