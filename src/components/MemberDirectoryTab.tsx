import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Repeat,
  Sparkles,
  Download,
  Calendar,
  History,
  ChevronRight,
  X,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  UserMinus,
  ShieldAlert,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { Member, DashboardMetrics, AdminUser } from '../types';

interface MemberDirectoryTabProps {
  members: Member[];
  metrics?: DashboardMetrics | null;
  currentAdmin?: AdminUser | null;
  onExportCsv: (type: 'all_members' | 'today_activity') => void;
  onRemoveMember?: (telegramId: string, reason: string, ban: boolean) => Promise<boolean>;
  activeFilter?: string;
}

// Client-side IST Date Formatter
const formatIstDate = (dateVal: string | number | Date): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateVal));
  } catch {
    return '';
  }
};

const formatIstLabel = (dateStr: string): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00+05:30'));
  } catch {
    return dateStr;
  }
};

export const MemberDirectoryTab: React.FC<MemberDirectoryTabProps> = ({
  members,
  metrics,
  currentAdmin,
  onExportCsv,
  onRemoveMember,
  activeFilter = 'all',
}) => {
  const [currentTab, setCurrentTab] = useState<string>(activeFilter);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Member removal modal state
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removeReason, setRemoveReason] = useState('Violation of community guidelines');
  const [isBan, setIsBan] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Permission check: Level 1 Super Admin or Admin with canRemoveMembers permission
  const canRemoveMembers = currentAdmin?.role === 'level_1_owner' || !!currentAdmin?.permissions?.canRemoveMembers;

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !onRemoveMember) return;
    setIsRemoving(true);
    try {
      const ok = await onRemoveMember(memberToRemove.telegramId, removeReason, isBan);
      if (ok) {
        setMemberToRemove(null);
        if (selectedMember?.telegramId === memberToRemove.telegramId) {
          setSelectedMember(null);
        }
      }
    } finally {
      setIsRemoving(false);
    }
  };

  useEffect(() => {
    if (activeFilter) {
      setCurrentTab(activeFilter);
    }
  }, [activeFilter]);

  const now = new Date();
  const todayDateIst = metrics?.todayDateIst || formatIstDate(now);
  const yesterdayDateIst = metrics?.yesterdayDateIst || formatIstDate(new Date(now.getTime() - 86400000));

  // Counts for tabs
  const todayJoinedCount = members.filter(m => formatIstDate(m.lastJoinedAt) === todayDateIst).length;
  const todayExitedCount = members.filter(m => m.lastExitedAt && formatIstDate(m.lastExitedAt) === todayDateIst).length;
  const yesterdayJoinedCount = members.filter(m => formatIstDate(m.lastJoinedAt) === yesterdayDateIst).length;
  const yesterdayExitedCount = members.filter(m => m.lastExitedAt && formatIstDate(m.lastExitedAt) === yesterdayDateIst).length;
  const newCount = members.filter(m => !m.isRejoined && m.joinCount === 1).length;
  const rejoinedCount = members.filter(m => m.isRejoined || m.joinCount > 1).length;

  // Filter list
  const filtered = members.filter(m => {
    const memberJoinDate = formatIstDate(m.lastJoinedAt);
    const memberExitDate = m.lastExitedAt ? formatIstDate(m.lastExitedAt) : '';

    // Specific historical date filter
    if (selectedHistoryDate) {
      if (memberJoinDate !== selectedHistoryDate && memberExitDate !== selectedHistoryDate) {
        return false;
      }
    } else if (currentTab === 'today_joined') {
      if (memberJoinDate !== todayDateIst) return false;
    } else if (currentTab === 'today_exited') {
      if (memberExitDate !== todayDateIst) return false;
    } else if (currentTab === 'yesterday_joined') {
      if (memberJoinDate !== yesterdayDateIst) return false;
    } else if (currentTab === 'yesterday_exited') {
      if (memberExitDate !== yesterdayDateIst) return false;
    } else if (currentTab === 'new') {
      if (m.isRejoined || m.joinCount > 1) return false;
    } else if (currentTab === 'rejoined') {
      if (!m.isRejoined && m.joinCount <= 1) return false;
    } else if (currentTab === 'active') {
      if (m.status !== 'active') return false;
    } else if (currentTab === 'exited') {
      if (m.status !== 'exited') return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = `${m.firstName} ${m.lastName || ''}`.toLowerCase().includes(q);
      const matchUser = m.username?.toLowerCase().includes(q);
      const matchId = m.telegramId.includes(q);
      if (!matchName && !matchUser && !matchId) return false;
    }

    return true;
  });

  const dailyHistoryList = metrics?.dailyHistory || [];

  return (
    <div className="space-y-4">
      {/* Control Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-slate-100">
                Member Directory & Daily History
              </h2>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                IST (UTC+5:30) • 12:00 AM Reset
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Track real-time joins, exits, and yesterday's archived statistics according to Indian Standard Time (12:00 AM Midnight Reset)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExportCsv('today_activity')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Today's Activity CSV</span>
            </button>
            <button
              onClick={() => onExportCsv('all_members')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full CSV</span>
            </button>
          </div>
        </div>

        {/* Tab filters */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: `All Members (${members.length})` },
              { id: 'today_joined', label: `Today Joined (${todayJoinedCount})` },
              { id: 'today_exited', label: `Today Exited (${todayExitedCount})` },
              { id: 'yesterday_joined', label: `Yesterday Joined (${yesterdayJoinedCount})`, highlight: true },
              { id: 'yesterday_exited', label: `Yesterday Exited (${yesterdayExitedCount})`, highlight: true },
              { id: 'daily_history', label: `📅 Daily History Archive`, isHistory: true },
              { id: 'rejoined', label: `Rejoined (${rejoinedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setSelectedHistoryDate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                  currentTab === tab.id && !selectedHistoryDate
                    ? 'bg-sky-600 text-white shadow-sm'
                    : tab.highlight
                    ? 'bg-slate-800/80 text-sky-300 hover:bg-slate-800 border border-sky-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {selectedHistoryDate && (
          <div className="mt-3 flex items-center justify-between bg-sky-950/30 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-sky-200">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Filtering members active on <strong>{formatIstLabel(selectedHistoryDate)}</strong> ({selectedHistoryDate})
              </span>
            </div>
            <button
              onClick={() => setSelectedHistoryDate(null)}
              className="flex items-center space-x-1 text-[11px] font-semibold text-sky-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Daily History Archive Tab View */}
      {currentTab === 'daily_history' && !selectedHistoryDate && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Daily Join & Exit History (Indian Standard Time - Midnight Reset Archive)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Each day automatically seals at 12:00 AM IST (UTC+5:30)
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date (IST)</th>
                  <th className="py-3 px-4 text-emerald-400">Joins</th>
                  <th className="py-3 px-4 text-rose-400">Exits</th>
                  <th className="py-3 px-4 text-slate-200">Net Growth</th>
                  <th className="py-3 px-4 text-sky-400">New Members</th>
                  <th className="py-3 px-4 text-amber-400">Rejoiners</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dailyHistoryList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No historical snapshots recorded yet.
                    </td>
                  </tr>
                ) : (
                  dailyHistoryList.map((day) => {
                    const isToday = day.date === todayDateIst;
                    const isYesterday = day.date === yesterdayDateIst;
                    const netPositive = day.netGrowth >= 0;

                    return (
                      <tr
                        key={day.date}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isYesterday ? 'bg-sky-950/10' : isToday ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200">{day.dateLabel}</span>
                            <span className="font-mono text-slate-500 text-[11px]">({day.date})</span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Today (Live)
                              </span>
                            )}
                            {isYesterday && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Yesterday
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          +{day.joinsCount}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-rose-400">
                          -{day.exitsCount}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${
                              netPositive
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-rose-500/10 text-rose-300'
                            }`}
                          >
                            {netPositive ? (
                              <ArrowUpRight className="w-3 h-3 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 mr-0.5" />
                            )}
                            {netPositive ? `+${day.netGrowth}` : day.netGrowth}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-sky-300">
                          {day.newMembersCount}
                        </td>

                        <td className="py-3 px-4 font-mono text-amber-300">
                          {day.rejoinsCount}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedHistoryDate(day.date);
                              setCurrentTab('all');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors inline-flex items-center space-x-1"
                          >
                            <span>Inspect Members</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Members Table */}
      {(currentTab !== 'daily_history' || selectedHistoryDate) && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Telegram ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Member Type</th>
                  <th className="py-3 px-4">Join Frequency</th>
                  <th className="py-3 px-4">Last Activity (IST)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No members match this view.
                    </td>
                  </tr>
                ) : (
                  filtered.map(member => {
                    const isActive = member.status === 'active';
                    const isRejoin = member.isRejoined || member.joinCount > 1;

                    return (
                      <tr
                        key={member.telegramId}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                            {member.firstName} {member.lastName || ''}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {member.username ? `@${member.username}` : 'No username'}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400">
                          {member.telegramId}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isRejoin ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Repeat className="w-2.5 h-2.5 mr-1" /> Rejoined Member
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> First-Time New
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-slate-200">{member.joinCount}</span>
                          <span className="text-slate-500 text-[11px]"> join(s)</span>
                        </td>

                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          <div>Joined: {formatIstDate(member.lastJoinedAt)}</div>
                          {member.lastExitedAt && (
                            <div className="text-rose-400/80 text-[10px]">
                              Exited: {formatIstDate(member.lastExitedAt)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center space-x-1.5 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMember(member);
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
                              title="View member timeline and logs"
                            >
                              <History className="w-3 h-3" />
                              <span>Timeline</span>
                            </button>

                            {member.status === 'active' && (
                              canRemoveMembers ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemberToRemove(member);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors text-[11px] font-medium"
                                  title="Remove member from Telegram group"
                                >
                                  <UserMinus className="w-3 h-3 text-rose-400" />
                                  <span>Remove</span>
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800/50 text-slate-500 text-[10px] cursor-not-allowed border border-slate-800"
                                  title="Level 2 Analyst: Read-only access. Member removal requires Level 1 Super Admin"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>L1 Only</span>
                                </span>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member History Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{selectedMember.firstName} {selectedMember.lastName || ''}</span>
                  {selectedMember.isRejoined && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Rejoined #{selectedMember.joinCount}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  @{selectedMember.username || 'no_username'} • ID: {selectedMember.telegramId}
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500">First Seen (IST):</span>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {formatIstDate(selectedMember.firstJoinedAt)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Lifetime Joins:</span>
                  <div className="font-semibold text-slate-200 mt-0.5 font-mono">
                    {selectedMember.joinCount} time(s)
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Current Status:</span>
                  <div className="font-semibold text-slate-200 mt-0.5 uppercase">
                    {selectedMember.status}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Last Departure (IST):</span>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {selectedMember.lastExitedAt ? formatIstDate(selectedMember.lastExitedAt) : 'Never exited'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Audit Activity Trail
                </h4>
                <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
                  {selectedMember.history && selectedMember.history.length > 0 ? (
                    selectedMember.history.map((evt) => (
                      <div key={evt.id} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-slate-900" />
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatIstDate(evt.timestamp)}
                        </div>
                        <div className="text-slate-200 font-medium">{evt.details}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500">No previous logs for this user.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
              {selectedMember.status === 'active' && canRemoveMembers ? (
                <button
                  onClick={() => setMemberToRemove(selectedMember)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Remove Member</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove / Kick Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Remove Member from Group
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Execute live kick or ban via Telegram Bot API
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMemberToRemove(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Target Details */}
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Member:</span>
                  <span className="font-semibold text-slate-200">
                    {memberToRemove.firstName} {memberToRemove.lastName || ''}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Telegram Username:</span>
                  <span className="text-sky-300">
                    {memberToRemove.username ? `@${memberToRemove.username}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Telegram ID:</span>
                  <span className="text-slate-300">{memberToRemove.telegramId}</span>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Reason for Removal / Audit Note
                </label>
                <input
                  type="text"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="e.g. Violation of community guidelines, spamming..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Ban Checkbox */}
              <label className="flex items-start space-x-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={isBan}
                  onChange={(e) => setIsBan(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 bg-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Permanently Ban User</div>
                  <div className="text-slate-400 text-[11px]">
                    User will be banned in Telegram and prevented from rejoining until manually unbanned.
                  </div>
                </div>
              </label>

              {/* Safety notice */}
              <div className="flex items-center space-x-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  The Telegram bot must have admin rights with "Ban Users" permission in your group.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-end space-x-2.5">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-950/30 flex items-center space-x-1.5"
              >
                <UserMinus className="w-4 h-4" />
                <span>{isRemoving ? 'Removing Member...' : (isBan ? 'Confirm Ban' : 'Confirm Kick')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
