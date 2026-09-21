import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Key,
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Settings,
  X,
  TrendingUp,
  Sliders,
  Send,
  UserMinus,
  FileSpreadsheet
} from 'lucide-react';
import { AdminUser, AdminRole, AdminPermissions } from '../types';

interface AdminManagementTabProps {
  admins: AdminUser[];
  currentAdmin: AdminUser | null;
  onSaveAdmin: (admin: Partial<AdminUser> & {
    name: string;
    username: string;
    pin: string;
    role: AdminRole;
    telegramUserId?: string;
    permissions?: AdminPermissions;
  }) => Promise<void>;
  onDeleteAdmin: (id: string) => Promise<void>;
  onSwitchAdmin: (admin: AdminUser) => void;
}

export const AdminManagementTab: React.FC<AdminManagementTabProps> = ({
  admins,
  currentAdmin,
  onSaveAdmin,
  onDeleteAdmin,
  onSwitchAdmin,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [telegramUserId, setTelegramUserId] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<AdminRole>('level_2_admin');
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canViewAnalytics: true,
    canRemoveMembers: false,
    canBroadcast: false,
    canApproveRequests: false,
    canExportReports: false,
    canChangeSchedule: false,
    canManageAdmins: false,
    canChangeCredentials: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLevel1 = currentAdmin?.role === 'level_1_owner';

  const handleRoleSelect = (newRole: AdminRole) => {
    setRole(newRole);
    if (newRole === 'level_1_owner') {
      setPermissions({
        canViewAnalytics: true,
        canRemoveMembers: true,
        canBroadcast: true,
        canApproveRequests: true,
        canExportReports: true,
        canChangeSchedule: true,
        canManageAdmins: true,
        canChangeCredentials: true,
      });
    } else if (newRole === 'level_2_admin') {
      // Level 2: strictly analytics (kitna members aaj join hua and kl join/exit hua)
      setPermissions({
        canViewAnalytics: true,
        canRemoveMembers: false,
        canBroadcast: false,
        canApproveRequests: false,
        canExportReports: true,
        canChangeSchedule: false,
        canManageAdmins: false,
        canChangeCredentials: false,
      });
    } else {
      // Level 3: Moderator
      setPermissions({
        canViewAnalytics: true,
        canRemoveMembers: true,
        canBroadcast: true,
        canApproveRequests: true,
        canExportReports: false,
        canChangeSchedule: false,
        canManageAdmins: false,
        canChangeCredentials: false,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !pin) {
      setErrorMsg('Please fill out name, username, and 4-digit PIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSaveAdmin({
        name,
        username,
        telegramUserId: telegramUserId.trim() || undefined,
        pin,
        role,
        permissions: role === 'level_1_owner'
          ? {
              canViewAnalytics: true,
              canRemoveMembers: true,
              canBroadcast: true,
              canApproveRequests: true,
              canExportReports: true,
              canChangeSchedule: true,
              canManageAdmins: true,
              canChangeCredentials: true,
            }
          : permissions,
      });

      setShowAddModal(false);
      setName('');
      setUsername('');
      setTelegramUserId('');
      setPin('');
      setRole('level_2_admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100">
                Multi-Level Admin Hierarchy & Role-Based Access Control (RBAC)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enforce granular authority: Level 1 (Owner/Root), Level 2 (Analytics Analyst: Today & Yesterday joins/exits only), and Level 3 (Moderator).
            </p>
          </div>

          {isLevel1 && (
            <button
              onClick={() => {
                handleRoleSelect('level_2_admin');
                setShowAddModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Admin Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Comparison Matrix: 3 Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Level 1: Owner Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          currentAdmin?.role === 'level_1_owner'
            ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/30'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Level 1: Super Admin (Owner)</h3>
                <span className="text-[10px] text-amber-400 font-semibold">Master Authority</span>
              </div>
            </div>

            {currentAdmin?.role === 'level_1_owner' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Active Session
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Holds root control over Telegram bot credentials, group open/close schedule, and admin management.
          </p>

          <div className="space-y-1.5 text-xs">
            {[
              'Configure Bot Token & Target Group ID',
              'Set Group Schedules & Auto-Approve Policy',
              'Remove / Kick & Ban members from website & bot',
              'Create, assign, & delete Level 2 & 3 Admins',
              'Full Telegram Bot Commands (/open, /close, /kick, /ban)',
            ].map((perm, i) => (
              <div key={i} className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level 2: Analyst Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          currentAdmin?.role === 'level_2_admin'
            ? 'bg-sky-950/20 border-sky-500/40 ring-1 ring-sky-500/30'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Level 2: Analyst (Stats Only)</h3>
                <span className="text-[10px] text-sky-400 font-semibold">Analytics & Growth Metrics</span>
              </div>
            </div>

            {currentAdmin?.role === 'level_2_admin' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                Active Session
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Strictly limited to monitoring join and exit activity for today and yesterday, with no editing or removal rights.
          </p>

          <div className="space-y-1.5 text-xs">
            {[
              'View Today Joined & Exited (Reset at 12:00 AM IST)',
              'View Yesterday Archived Joins & Exits snapshot',
              'Check /today, /yesterday & /stats commands in Bot',
              'Export CSV analytics reports of daily members',
              'Restricted: Cannot remove members, change token, or toggle open/close',
            ].map((perm, i) => (
              <div key={i} className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level 3: Moderator Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          currentAdmin?.role === 'level_3_moderator'
            ? 'bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/30'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Level 3: Operational Moderator</h3>
                <span className="text-[10px] text-purple-400 font-semibold">Group Operations</span>
              </div>
            </div>

            {currentAdmin?.role === 'level_3_moderator' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                Active Session
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Assists with daily applicant approvals, removing abusive members, and group broadcast dispatches.
          </p>

          <div className="space-y-1.5 text-xs">
            {[
              'Review & approve/reject queued join requests',
              'Kick or remove spam members from web dashboard',
              'Send official announcements to Telegram group',
              'View content moderation and bad-words audit logs',
              'Restricted: Cannot delete admins or change bot credentials',
            ].map((perm, i) => (
              <div key={i} className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Admin Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Configured Admin Accounts ({admins.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Click "Switch Session" to test or operate with that account's permissions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Login Username</th>
                <th className="py-3 px-4">Telegram ID</th>
                <th className="py-3 px-4">Role Hierarchy</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Passcode PIN</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admins.map((adm) => {
                const isCurrent = currentAdmin?.id === adm.id;
                const isAdmLevel1 = adm.role === 'level_1_owner';
                const isAdmLevel2 = adm.role === 'level_2_admin';

                return (
                  <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center space-x-2">
                        <span>{adm.name}</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active session"></span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      @{adm.username}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {adm.telegramUserId ? (
                        <span className="text-sky-300 font-bold">{adm.telegramUserId}</span>
                      ) : (
                        <span className="text-slate-600 italic">Not linked</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAdmLevel1
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isAdmLevel2
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {isAdmLevel1 ? 'Level 1: Owner' : isAdmLevel2 ? 'Level 2: Analyst' : 'Level 3: Moderator'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {adm.permissions.canViewAnalytics !== false && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-300 font-mono">
                            Analytics
                          </span>
                        )}
                        {adm.permissions.canRemoveMembers && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/50 text-[10px] text-rose-300 font-mono border border-rose-800/40">
                            Remove
                          </span>
                        )}
                        {adm.permissions.canApproveRequests && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-emerald-300 font-mono">
                            Approve
                          </span>
                        )}
                        {adm.permissions.canBroadcast && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300 font-mono">
                            Broadcast
                          </span>
                        )}
                        {adm.permissions.canChangeSchedule && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-purple-300 font-mono">
                            Schedule
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {isLevel1 ? adm.pin : '••••'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSwitchAdmin(adm)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isCurrent ? 'Active Session' : 'Switch To'}
                        </button>

                        {!isAdmLevel1 && isLevel1 && (
                          <button
                            onClick={() => onDeleteAdmin(adm.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remove admin account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Create Multi-Level Admin Account</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Login Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rahul_analyst"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    4-Digit Security PIN
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono tracking-widest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telegram User ID (Optional - for Telegram Bot command authority)
                </label>
                <input
                  type="text"
                  value={telegramUserId}
                  onChange={(e) => setTelegramUserId(e.target.value)}
                  placeholder="e.g. 123456789 (Find via /myid in bot)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  When this ID is set, the Telegram bot will automatically recognize this user's admin level when they send commands like /today, /yesterday, /open, etc.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assigned Role Hierarchy
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer ${
                      role === 'level_2_admin'
                        ? 'bg-sky-950/40 border-sky-500/40 text-sky-200 ring-1 ring-sky-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === 'level_2_admin'}
                      onChange={() => handleRoleSelect('level_2_admin')}
                    />
                    <div className="font-bold text-sky-300">Level 2 Analyst</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Today & Yesterday stats only</div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer ${
                      role === 'level_3_moderator'
                        ? 'bg-purple-950/40 border-purple-500/40 text-purple-200 ring-1 ring-purple-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === 'level_3_moderator'}
                      onChange={() => handleRoleSelect('level_3_moderator')}
                    />
                    <div className="font-bold text-purple-300">Level 3 Moderator</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Requests & Member Moderation</div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer ${
                      role === 'level_1_owner'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === 'level_1_owner'}
                      onChange={() => handleRoleSelect('level_1_owner')}
                    />
                    <div className="font-bold text-amber-300">Level 1 Owner</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Full root authority</div>
                  </label>
                </div>
              </div>

              {/* Granular Permission Checklist */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Granular Permissions & Feature Access
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canViewAnalytics !== false}
                      onChange={(e) => setPermissions({ ...permissions, canViewAnalytics: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span>View Analytics (Today/Yesterday)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canRemoveMembers}
                      disabled={role === 'level_2_admin'}
                      onChange={(e) => setPermissions({ ...permissions, canRemoveMembers: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span className={role === 'level_2_admin' ? 'text-slate-600 line-through' : ''}>
                      Remove / Kick Members
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canApproveRequests}
                      disabled={role === 'level_2_admin'}
                      onChange={(e) => setPermissions({ ...permissions, canApproveRequests: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span className={role === 'level_2_admin' ? 'text-slate-600 line-through' : ''}>
                      Approve Join Requests
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canBroadcast}
                      disabled={role === 'level_2_admin'}
                      onChange={(e) => setPermissions({ ...permissions, canBroadcast: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span className={role === 'level_2_admin' ? 'text-slate-600 line-through' : ''}>
                      Broadcast Announcements
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canExportReports}
                      onChange={(e) => setPermissions({ ...permissions, canExportReports: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span>Export CSV Reports</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canChangeSchedule}
                      disabled={role !== 'level_1_owner'}
                      onChange={(e) => setPermissions({ ...permissions, canChangeSchedule: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    <span className={role !== 'level_1_owner' ? 'text-slate-600 line-through' : ''}>
                      Change Group Schedule
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
