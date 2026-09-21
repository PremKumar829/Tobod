import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Clock,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ManagedGroup, BotConfig } from '../types';

interface GroupsManagerTabProps {
  config: BotConfig;
  onRefreshAll: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const GroupsManagerTab: React.FC<GroupsManagerTabProps> = ({
  config,
  onRefreshAll,
  showToast,
}) => {
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ManagedGroup | null>(null);

  // New Group Form
  const [newTitle, setNewTitle] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [newInviteLink, setNewInviteLink] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [config.groupId]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newGroupId.trim()) {
      showToast('Group Title and Telegram Group ID are required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          groupId: newGroupId.trim(),
          inviteLink: newInviteLink.trim() || undefined,
          status: 'open',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add group');
      }

      showToast(`Group "${newTitle}" added successfully!`);
      setShowAddModal(false);
      setNewTitle('');
      setNewGroupId('');
      setNewInviteLink('');
      await fetchGroups();
      await onRefreshAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleActivateGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Active primary group switched to "${data.activeGroup.title}"!`);
        await fetchGroups();
        await onRefreshAll();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteGroup = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from managed groups?`)) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      showToast(`Group "${title}" removed.`);
      await fetchGroups();
      await onRefreshAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Multi-Group Management Hub
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {groups.length} Groups Configured
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage multiple Telegram channels & groups with a single bot. Set active working groups, monitor open/close states, and approve join requests.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Group</span>
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const isActive = group.isActive || group.groupId === config.groupId;

          return (
            <div
              key={group.id}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-100 truncate">{group.title}</h3>
                      {isActive && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Active Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className="text-xs text-slate-400 font-mono select-all truncate">
                        ID: {group.groupId}
                      </span>
                      <button
                        onClick={() => handleCopy(group.groupId, group.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy Group ID"
                      >
                        {copiedId === group.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      group.status === 'open'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {group.status}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-1.5 my-3 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Joined Members:</span>
                    <span className="text-slate-200 font-bold">{group.memberCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Pending Requests:</span>
                    <span className={group.pendingRequestsCount ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                      {group.pendingRequestsCount || 0}
                    </span>
                  </div>
                  {group.inviteLink && (
                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
                      <span>Invite Link:</span>
                      <a
                        href={group.inviteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                {!isActive ? (
                  <button
                    onClick={() => handleActivateGroup(group.id)}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Set Active</span>
                  </button>
                ) : (
                  <div className="flex-1 text-[11px] text-emerald-400 font-medium flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Default Target for Bot</span>
                  </div>
                )}

                {groups.length > 1 && !isActive && (
                  <button
                    onClick={() => handleDeleteGroup(group.id, group.title)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-xl transition-colors"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Card */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-400">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          How to connect a new Telegram group to the bot:
        </div>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-300">
          <li>Add your Telegram bot to the group as an <strong>Administrator</strong>.</li>
          <li>Ensure the permission <strong>"Approve new chat members"</strong> is toggled <strong>ON</strong>.</li>
          <li>Find the group ID (always starts with <code>-100...</code>). Send <code>/myid</code> or forward a message from the group to <code>@userinfobot</code>.</li>
          <li>Click <strong>Add New Group</strong> above and enter the group name and ID.</li>
        </ol>
      </div>

      {/* Modal: Add New Group */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400" />
                Add New Managed Group
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Group Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. VIP Trading & Crypto Community"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Telegram Group Chat ID *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupId}
                  onChange={e => setNewGroupId(e.target.value)}
                  placeholder="e.g. -1002345678901"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Must start with <code>-100</code> for Telegram supergroups and channels.
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Public / Private Invite Link (Optional)
                </label>
                <input
                  type="url"
                  value={newInviteLink}
                  onChange={e => setNewInviteLink(e.target.value)}
                  placeholder="e.g. https://t.me/+joinchat..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Add Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
