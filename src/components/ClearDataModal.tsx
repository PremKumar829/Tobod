import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Clock,
  Users,
  Bell,
  Activity,
  RotateCcw,
  CheckCircle2,
  X,
  ShieldAlert
} from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onRefreshAll,
  showToast,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'requests' | 'members' | 'logs' | 'notifications' | 'all'>('requests');
  const [preservePending, setPreservePending] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const targets = [
    {
      id: 'requests' as const,
      label: 'Join Requests History',
      icon: Clock,
      description: 'Clear processed approved/rejected join requests. You can preserve current pending requests.',
      requiresConfirm: false,
    },
    {
      id: 'members' as const,
      label: 'Member Directory Records',
      icon: Users,
      description: 'Clears saved member records and past rejoin history. Group memberships in Telegram remain untouched.',
      requiresConfirm: false,
    },
    {
      id: 'logs' as const,
      label: 'Activity & Audit Logs',
      icon: Activity,
      description: 'Clears past schedule events, automod filter actions, and admin activity history.',
      requiresConfirm: false,
    },
    {
      id: 'notifications' as const,
      label: 'Owner Notifications Feed',
      icon: Bell,
      description: 'Clears past join alerts sent to the bot owner in the dashboard.',
      requiresConfirm: false,
    },
    {
      id: 'all' as const,
      label: 'Full System Reset (Clear All Old Data)',
      icon: Trash2,
      description: 'Purges all requests, member logs, audit trails, and feeds. Config and Admin logins are kept.',
      requiresConfirm: true,
    },
  ];

  const handleExecuteClear = async () => {
    if (selectedTarget === 'all' && confirmText.trim().toLowerCase() !== 'clear all') {
      showToast('Please type "clear all" to confirm full data purge', 'error');
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/data/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: selectedTarget,
          preservePending: selectedTarget === 'requests' ? preservePending : false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Data successfully cleared! (${data.clearedCount ?? 'Selected'} items removed)`);
        await onRefreshAll();
        onClose();
      } else {
        showToast(data.error || 'Failed to clear data', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 text-slate-100">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Clear Old System Data</h3>
              <p className="text-xs text-slate-400">Select what data to remove from database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Options */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Select Data Category to Clear:</label>
          <div className="space-y-2">
            {targets.map(t => {
              const Icon = t.icon;
              const isSelected = selectedTarget === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTarget(t.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                    isSelected
                      ? t.id === 'all'
                        ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/30'
                        : 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      t.id === 'all'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>{t.label}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options for Requests */}
        {selectedTarget === 'requests' && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-200">Preserve Pending Requests</div>
              <div className="text-[10px] text-slate-400">
                Keep real users waiting in pending queue for approval
              </div>
            </div>
            <input
              type="checkbox"
              checked={preservePending}
              onChange={e => setPreservePending(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* Danger confirmation for Clear All */}
        {selectedTarget === 'all' && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Safety Confirmation Required</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Type <strong className="text-white font-mono">clear all</strong> below to confirm wiping all history and logs:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="type 'clear all' to confirm"
              className="w-full bg-slate-950 border border-rose-500/40 rounded-lg px-3 py-1.5 text-xs text-rose-200 font-mono focus:outline-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteClear}
            disabled={clearing}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearing ? 'Clearing Data...' : 'Confirm & Clear Selected'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
