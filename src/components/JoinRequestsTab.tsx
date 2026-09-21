import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Repeat,
  Sparkles,
  Search,
  Filter,
  CheckCheck,
  ShieldAlert,
  Calendar,
  AlertCircle,
  Trash2,
  Info,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { JoinRequest, GroupStatus } from '../types';

interface JoinRequestsTabProps {
  requests: JoinRequest[];
  currentGroupStatus: GroupStatus;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  canManageRequests?: boolean;
  onOpenClearModal?: () => void;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({
  requests,
  currentGroupStatus,
  onApprove,
  onReject,
  onApproveAll,
  canManageRequests = true,
  onOpenClearModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'rejoin' | 'new'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApproveWithSpinner = async (id: string) => {
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter(req => {
    // Status filter
    if (filter === 'pending' && req.status !== 'pending') return false;
    if (filter === 'approved' && req.status !== 'approved') return false;
    if (filter === 'rejected' && req.status !== 'rejected') return false;
    if (filter === 'rejoin' && !req.isRejoin) return false;
    if (filter === 'new' && req.isRejoin) return false;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = `${req.firstName} ${req.lastName}`.toLowerCase().includes(q);
      const matchUser = req.username?.toLowerCase().includes(q);
      const matchId = req.telegramId.includes(q);
      if (!matchName && !matchUser && !matchId) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Bulk Action */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-slate-100">
                Join Requests & Auto-Approval Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentGroupStatus === 'closed'
                ? '🔒 Group is currently CLOSED. Incoming requests remain pending and will be bulk approved by the bot automatically when the group opens.'
                : '🟢 Group is currently OPEN. Requests are auto-approved per your schedule rules.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {onOpenClearModal && (
              <button
                onClick={onOpenClearModal}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Clear old processed request records"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear Old Data</span>
              </button>
            )}

            {pendingCount > 0 && canManageRequests && (
              <button
                id="btn-bulk-approve-tab"
                onClick={onApproveAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Approve All {pendingCount} Pending Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Telegram Approval Requirements Notice */}
        <div className="mt-4 p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-start space-x-2.5 text-xs text-purple-200">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-purple-100">
              Telegram Auto-Approve Checklist:
            </span>
            <span className="text-purple-300 ml-1">
              Bot must be an <strong>Administrator</strong> in the group with the <strong>"Approve new chat members"</strong> permission enabled. When approved, the bot automatically sends your custom stylized welcome message!
            </span>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: `All Requests (${requests.length})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'rejoin', label: 'Rejoined Only' },
              { id: 'new', label: 'First-Time New' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or @username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No requests found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'No join requests match your search criteria.' : 'No join requests in this view category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(req => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isPending
                    ? 'bg-slate-900/90 border-purple-500/30 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 opacity-90'
                }`}
              >
                {/* Header Info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-100">
                          {req.firstName} {req.lastName}
                        </span>
                        {req.isRejoin ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Repeat className="w-2.5 h-2.5 mr-1" /> Rejoined #{req.previousJoinCount + 1}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> New Member
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {req.username ? `@${req.username}` : `ID: ${req.telegramId}`}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* History Stats Card */}
                  <div className="bg-slate-950/70 rounded-lg p-2.5 text-[11px] font-mono border border-slate-800 space-y-1 my-3 text-slate-300">
                    <div className="flex justify-between text-slate-400">
                      <span>Requested:</span>
                      <span className="text-slate-200">
                        {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Group at request:</span>
                      <span className={req.groupStatusAtRequest === 'open' ? 'text-emerald-400' : 'text-rose-400'}>
                        {req.groupStatusAtRequest.toUpperCase()}
                      </span>
                    </div>
                    {req.isRejoin && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Past Exits:</span>
                          <span className="text-rose-400">{req.previousExitsCount} exit(s)</span>
                        </div>
                        {req.firstSeenAt && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">First recorded:</span>
                            <span className="text-slate-400">{new Date(req.firstSeenAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </>
                    )}
                    {req.processedBy && (
                      <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="text-slate-500">Processed by:</span>
                        <span className="text-indigo-300">{req.processedBy}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isPending && canManageRequests ? (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleApproveWithSpinner(req.id)}
                      disabled={processingId === req.id}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      {processingId === req.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      disabled={processingId === req.id}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span>{isApproved ? 'Successfully admitted to group' : 'Request rejected'}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
