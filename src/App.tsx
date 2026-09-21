import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Clock,
  Users,
  Calendar,
  Megaphone,
  Shield,
  Bot,
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  Radio,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  Database
} from 'lucide-react';
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { HourlyActivityChart } from './components/HourlyActivityChart';
import { OwnerNotificationFeed } from './components/OwnerNotificationFeed';
import { JoinRequestsTab } from './components/JoinRequestsTab';
import { MemberDirectoryTab } from './components/MemberDirectoryTab';
import { ScheduleAutomationTab } from './components/ScheduleAutomationTab';
import { AnnouncementsTab } from './components/AnnouncementsTab';
import { AdminManagementTab } from './components/AdminManagementTab';
import { BotSettingsTab } from './components/BotSettingsTab';
import { ReportsCsvTab } from './components/ReportsCsvTab';
import { WelcomeMessageTab } from './components/WelcomeMessageTab';
import { ModerationTab } from './components/ModerationTab';
import { GroupsManagerTab } from './components/GroupsManagerTab';
import { DatabaseStorageTab } from './components/DatabaseStorageTab';
import { ClearDataModal } from './components/ClearDataModal';
import { SimulatorModal } from './components/SimulatorModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  BotConfig,
  DashboardMetrics,
  Member,
  JoinRequest,
  Announcement,
  OwnerNotification,
  AdminUser,
  ActivityLog
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [memberFilterTarget, setMemberFilterTarget] = useState<string>('all');

  // Core Application State
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ownerNotifications, setOwnerNotifications] = useState<OwnerNotification[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [quickToken, setQuickToken] = useState<string>('');
  const [quickConnecting, setQuickConnecting] = useState<boolean>(false);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all state from Express API
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        metricsRes,
        configRes,
        membersRes,
        requestsRes,
        announcementsRes,
        notifsRes,
        adminsRes,
        logsRes
      ] = await Promise.all([
        fetch('/api/metrics').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/members').then(r => r.json()),
        fetch('/api/join-requests').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
        fetch('/api/owner-notifications').then(r => r.json()),
        fetch('/api/admins').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()).catch(() => []),
      ]);

      setMetrics(metricsRes);
      setConfig(configRes);
      setMembers(membersRes);
      setJoinRequests(requestsRes);
      setAnnouncements(announcementsRes);
      setOwnerNotifications(notifsRes);
      setAdmins(adminsRes);
      setActivityLogs(logsRes || []);

      // Default current admin if not set
      if (!currentAdmin && adminsRes && adminsRes.length > 0) {
        setCurrentAdmin(adminsRes[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentAdmin]);

  // Initial load + periodic polling (15s)
  useEffect(() => {
    refreshAllData();
    const timer = setInterval(() => {
      refreshAllData();
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshAllData]);

  // Handle group status toggle (Force open / close)
  const handleToggleStatus = async (newStatus: 'open' | 'closed') => {
    try {
      const res = await fetch('/api/group/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminName: currentAdmin?.name || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (newStatus === 'open') {
          showToast(`Group opened! ${data.approvedCount || 0} pending requests auto-approved.`);
        } else {
          showToast('Group closed. All incoming requests will be queued.');
        }
        await refreshAllData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle single request approval
  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/join-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: currentAdmin?.name || 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.warning) {
          showToast(`Approved! Telegram Notice: ${data.warning}. Ensure Bot is Admin in group.`, 'info');
        } else {
          showToast('Join request approved & member admitted to group.');
        }
        await refreshAllData();
      } else {
        showToast(data.error || 'Failed to approve request', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle single request rejection
  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/join-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: currentAdmin?.name || 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Join request declined.', 'info');
        await refreshAllData();
      } else {
        showToast(data.error || 'Failed to reject request', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle bulk approval of all pending requests
  const handleApproveAll = async () => {
    try {
      const res = await fetch('/api/join-requests/approve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: currentAdmin?.name || 'Admin Bulk' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully processed approval for ${data.approvedCount} pending join request(s)!`);
        await refreshAllData();
      } else {
        showToast(data.error || 'Failed to approve pending requests', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save config updates
  const handleSaveConfig = async (updates: Partial<BotConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          adminName: currentAdmin?.name || 'Admin',
        }),
      });
      if (res.ok) {
        showToast('Bot settings updated successfully!');
        await refreshAllData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Send announcement
  const handleBroadcast = async (payload: {
    title: string;
    text: string;
    pin: boolean;
    silent: boolean;
    parseMode: 'Markdown' | 'HTML';
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          adminName: currentAdmin?.name || 'Admin',
        }),
      });
      const data = await res.json();
      await refreshAllData();
      if (data.success) {
        showToast('Announcement broadcasted successfully!');
        return { success: true, message: 'Announcement sent and delivered to Telegram group!' };
      } else {
        const errorMsg = data.error || 'Failed to dispatch to Telegram API';
        showToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      return { success: false, message: err.message || 'Network error broadcasting announcement' };
    }
  };

  // Save new admin
  const handleSaveAdmin = async (adminData: any) => {
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create admin');
    }
    showToast('Admin user saved successfully!');
    await refreshAllData();
  };

  // Delete admin
  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to remove this admin account?')) return;
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      showToast('Admin account removed.', 'info');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Test bot token
  const handleTestConnection = async (token: string) => {
    const res = await fetch('/api/bot/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.ok) {
      await refreshAllData();
    }
    return data;
  };

  // Quick connect bot token from banner
  const handleQuickConnect = async () => {
    if (!quickToken.trim()) return;
    setQuickConnecting(true);
    try {
      const res = await handleTestConnection(quickToken.trim());
      if (res.ok && res.bot) {
        showToast(`Connected to @${res.bot.username}! Bot is now active on Telegram.`);
        setQuickToken('');
      } else {
        showToast(res.error || 'Failed to authenticate token with Telegram API', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setQuickConnecting(false);
    }
  };

  // Remove or ban member from live group
  const handleRemoveMember = async (telegramId: string, reason: string, ban: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/members/${telegramId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          ban,
          adminName: currentAdmin?.name || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Member successfully ${ban ? 'banned' : 'removed'} from Telegram group.`);
        await refreshAllData();
        return true;
      } else {
        showToast(data.error || 'Failed to remove member', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing member removal', 'error');
      return false;
    }
  };

  // CSV download
  const handleDownloadCsv = (type: 'today_activity' | 'all_members' | 'join_requests' | 'audit_logs') => {
    window.location.href = `/api/export/${type}`;
    showToast(`Downloading ${type.replace(/_/g, ' ')} CSV...`);
  };

  // Simulator runner
  const handleSimulate = async (eventType: string) => {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType }),
    });
    const data = await res.json();
    await refreshAllData();
    return data;
  };

  // Admin login
  const handleLogin = async (username: string, pin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const data = await res.json();
    if (data.success && data.admin) {
      setCurrentAdmin(data.admin);
      showToast(`Welcome back, ${data.admin.name} (${data.admin.role === 'level_1_owner' ? 'Owner' : 'Moderator'})`);
      return true;
    }
    return false;
  };

  // Navigation Tabs Config
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    {
      id: 'requests',
      label: 'Join Requests',
      icon: Clock,
      badge: metrics?.pendingRequestsCount ? `${metrics.pendingRequestsCount}` : null,
    },
    { id: 'welcome', label: 'Welcome & Fonts', icon: Sparkles, badge: '🇮🇳' },
    { id: 'moderation', label: 'AutoMod & Filters', icon: ShieldAlert, badge: 'Auto' },
    { id: 'groups', label: 'Manage Groups', icon: Radio, badge: null },
    { id: 'members', label: 'Member Directory', icon: Users, badge: null },
    { id: 'schedule', label: 'Schedule & Auto-Approve', icon: Calendar, badge: null },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, badge: null },
    { id: 'database', label: 'Database & Storage', icon: Database, badge: 'DB' },
    { id: 'admins', label: 'Admin Roles (L1/L2/L3)', icon: Shield, badge: 'RBAC' },
    { id: 'bot', label: 'Bot Settings', icon: Bot, badge: null },
    { id: 'reports', label: 'Export CSV', icon: FileSpreadsheet, badge: null },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      
      {/* Persistent App Header */}
      <Header
        config={config}
        metrics={metrics}
        currentAdmin={currentAdmin}
        isRefreshing={isRefreshing}
        onRefresh={refreshAllData}
        onToggleStatus={handleToggleStatus}
        onApproveAll={handleApproveAll}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onOpenSimulator={() => setShowSimulator(true)}
        onOpenClearData={() => setShowClearModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Urgent Warning: Bot Token Not Configured */}
        {(!config?.botToken || config.botToken.length < 5) && (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-950/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <span>Telegram Bot Is Currently Offline (Token Required)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                      Awaiting API Token
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    The bot cannot respond to Telegram messages or intercept join requests because no Bot Token from @BotFather is saved yet.
                    Paste your token below to immediately activate long-polling:
                  </p>
                </div>
              </div>

              {/* Quick Input Bar */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="password"
                  value={quickToken}
                  onChange={(e) => setQuickToken(e.target.value)}
                  placeholder="Paste token (123456:ABC...)"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono w-60 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleQuickConnect}
                  disabled={quickConnecting || !quickToken.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
                >
                  {quickConnecting ? 'Connecting...' : 'Connect Bot'}
                </button>
                <button
                  onClick={() => setActiveTab('bot')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-800 flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'members') setMemberFilterTarget('all');
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      tab.id === 'requests' && Number(tab.badge) > 0
                        ? 'bg-purple-500 text-white animate-pulse'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Key Metrics Cards */}
            <MetricsCards
              metrics={metrics}
              onFilterMembers={(filter) => {
                setMemberFilterTarget(filter);
                setActiveTab('members');
              }}
              onApproveAll={handleApproveAll}
            />

            {/* Middle Section: Chart & Owner Notification Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <HourlyActivityChart data={metrics?.hourlyStats || []} />
              </div>
              <div className="lg:col-span-5">
                <OwnerNotificationFeed
                  notifications={ownerNotifications}
                  ownerId={config?.ownerChatId}
                  ownerUsername={config?.ownerUsername}
                />
              </div>
            </div>

            {/* Quick Actions & Pending Spotlight */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Automated Join Approval Engine</span>
                  <span className={`w-2 h-2 rounded-full ${metrics?.currentGroupStatus === 'open' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Operating rule: {config?.autoApproveMode === 'only_when_open' ? 'Hold requests while CLOSED; Auto-approve all upon OPENING.' : config?.autoApproveMode}
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab('requests')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  Manage Requests ({metrics?.pendingRequestsCount || 0})
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Configure Schedule
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Join Requests */}
        {activeTab === 'requests' && (
          <JoinRequestsTab
            requests={joinRequests}
            currentGroupStatus={metrics?.currentGroupStatus || 'open'}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onApproveAll={handleApproveAll}
            canManageRequests={currentAdmin?.permissions.canApproveRequests}
            onOpenClearModal={() => setShowClearModal(true)}
          />
        )}

        {/* Tab 2b: Welcome Message & Special Font Styler */}
        {activeTab === 'welcome' && config && (
          <WelcomeMessageTab
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {/* Tab 2c: AutoMod & Content Moderation */}
        {activeTab === 'moderation' && config && (
          <ModerationTab
            config={config}
            onSaveConfig={handleSaveConfig}
            logs={activityLogs}
          />
        )}

        {/* Tab 2d: Multi-Group Management Hub */}
        {activeTab === 'groups' && config && (
          <GroupsManagerTab
            config={config}
            onRefreshAll={refreshAllData}
            showToast={showToast}
          />
        )}

        {/* Tab 3: Member Directory */}
        {activeTab === 'members' && (
          <MemberDirectoryTab
            members={members}
            metrics={metrics}
            currentAdmin={currentAdmin}
            onExportCsv={handleDownloadCsv}
            onRemoveMember={handleRemoveMember}
            activeFilter={memberFilterTarget}
          />
        )}

        {/* Tab 4: Schedule & Auto-Approve */}
        {activeTab === 'schedule' && config && (
          <ScheduleAutomationTab
            config={config}
            onSaveConfig={handleSaveConfig}
            canEditSchedule={currentAdmin?.permissions.canChangeSchedule}
          />
        )}

        {/* Tab 5: Announcements */}
        {activeTab === 'announcements' && (
          <AnnouncementsTab
            announcements={announcements}
            onBroadcast={handleBroadcast}
            currentAdmin={currentAdmin}
            canBroadcast={currentAdmin?.permissions.canBroadcast}
          />
        )}

        {/* Tab: Database & Storage Engine */}
        {activeTab === 'database' && (
          <DatabaseStorageTab metrics={metrics} />
        )}

        {/* Tab 6: Multi-Level Admin */}
        {activeTab === 'admins' && (
          <AdminManagementTab
            admins={admins}
            currentAdmin={currentAdmin}
            onSaveAdmin={handleSaveAdmin}
            onDeleteAdmin={handleDeleteAdmin}
            onSwitchAdmin={(adm) => {
              setCurrentAdmin(adm);
              showToast(`Switched active session to ${adm.name}`);
            }}
          />
        )}

        {/* Tab 7: Bot Settings */}
        {activeTab === 'bot' && config && (
          <BotSettingsTab
            config={config}
            onSaveConfig={handleSaveConfig}
            onTestConnection={handleTestConnection}
            canEditCredentials={currentAdmin?.permissions.canChangeCredentials}
            onOpenClearModal={() => setShowClearModal(true)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {/* Tab 8: Export CSV */}
        {activeTab === 'reports' && (
          <ReportsCsvTab
            metrics={metrics}
            onDownloadCsv={handleDownloadCsv}
            canExport={currentAdmin?.permissions.canExportReports}
          />
        )}

      </main>

      {/* Persistent Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* Test Sandbox Simulator Modal */}
      <SimulatorModal
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        onSimulate={handleSimulate}
      />

      {/* Admin Login & Role Switcher Modal */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        admins={admins}
        currentAdmin={currentAdmin}
        onLogin={handleLogin}
        onFastSwitch={(adm) => {
          setCurrentAdmin(adm);
          showToast(`Switched active session to ${adm.name}`);
        }}
      />

      {/* Clear Old Data Modal */}
      <ClearDataModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onRefreshAll={refreshAllData}
        showToast={showToast}
      />

    </div>
  );
}
