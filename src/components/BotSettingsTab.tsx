import React, { useState, useEffect } from 'react';
import {
  Bot,
  Key,
  Shield,
  Send,
  Radio,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Activity,
  RefreshCw,
  Zap,
  Check,
  AlertTriangle,
  MessageSquare,
  Trash2,
  ShieldAlert,
  Lock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { BotConfig } from '../types';

interface BotDiagnostics {
  tokenConfigured: boolean;
  botValid: boolean;
  botInfo?: {
    id: number;
    username: string;
    first_name: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
  };
  webhookActive: boolean;
  webhookUrl?: string;
  pollingActive: boolean;
  lastPollTimestamp: string | null;
  lastPollingError: string | null;
  groupReachable: boolean;
  groupTitle?: string;
  botIsGroupAdmin: boolean;
  groupError?: string;
  ownerChatReachable: boolean;
  recommendations: string[];
}

interface BotSettingsTabProps {
  config: BotConfig;
  onSaveConfig: (updates: Partial<BotConfig>) => void;
  onTestConnection: (token: string) => Promise<{ ok: boolean; bot?: any; error?: string }>;
  canEditCredentials?: boolean;
  onOpenClearModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const BotSettingsTab: React.FC<BotSettingsTabProps> = ({
  config,
  onSaveConfig,
  onTestConnection,
  canEditCredentials = true,
  onOpenClearModal,
  onNavigateTab,
}) => {
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [showToken, setShowToken] = useState(false);
  const [groupId, setGroupId] = useState(config.groupId || '');
  const [groupTitle, setGroupTitle] = useState(config.groupTitle || '');
  const [ownerChatId, setOwnerChatId] = useState(config.ownerChatId || '');
  const [ownerUsername, setOwnerUsername] = useState(config.ownerUsername || '');
  const [connectionMode, setConnectionMode] = useState(config.connectionMode || 'polling');

  // Command Access & Security (Owner & Admin Only)
  const [adminOnlyCommands, setAdminOnlyCommands] = useState(config.adminOnlyCommands !== false);
  const [nonAdminResponseMode, setNonAdminResponseMode] = useState<'silent' | 'alert_dm'>(config.nonAdminResponseMode || 'silent');
  const [autoDeleteUnauthorizedCommands, setAutoDeleteUnauthorizedCommands] = useState(config.autoDeleteUnauthorizedCommands !== false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<BotDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [clearingWebhook, setClearingWebhook] = useState(false);
  const [pingChatId, setPingChatId] = useState(config.ownerChatId || '');
  const [sendingPing, setSendingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/webhook` : '';

  const runDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const res = await fetch('/api/bot/diagnostics');
      const data = await res.json();
      setDiagnostics(data);
    } catch (err: any) {
      console.error('Diagnostics error:', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, [config.botToken, config.groupId]);

  const handleClearWebhook = async () => {
    setClearingWebhook(true);
    try {
      const res = await fetch('/api/bot/clear-webhook', { method: 'POST' });
      const data = await res.json();
      await runDiagnostics();
      setTestResult({ ok: true, message: 'Conflicting webhook cleared! Long-polling restarted.' });
    } catch (err: any) {
      setTestResult({ ok: false, message: `Failed to clear webhook: ${err.message}` });
    } finally {
      setClearingWebhook(false);
    }
  };

  const handleSendPing = async () => {
    setSendingPing(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/bot/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: pingChatId || ownerChatId }),
      });
      const data = await res.json();
      if (data.ok) {
        setPingResult({ ok: true, message: 'Message sent successfully! Check Telegram.' });
      } else {
        setPingResult({ ok: false, message: data.error || data.description || 'Failed to send message.' });
      }
    } catch (err: any) {
      setPingResult({ ok: false, message: err.message });
    } finally {
      setSendingPing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(botToken);
      if (res.ok && res.bot) {
        setTestResult({
          ok: true,
          message: `Connected successfully! Bot: @${res.bot.username} (${res.bot.first_name})`,
        });
        runDiagnostics();
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Failed to authenticate with Telegram Bot API.',
        });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      botToken,
      groupId,
      groupTitle,
      ownerChatId,
      ownerUsername,
      connectionMode,
      adminOnlyCommands,
      nonAdminResponseMode,
      autoDeleteUnauthorizedCommands,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      runDiagnostics();
    }, 1000);
  };

  const copyWebhookToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-slate-100">
                Telegram Bot API & Channel Credentials
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect your official Telegram Bot token from @BotFather, specify group ID, and owner notification chat
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!canEditCredentials}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics & Live Bot Health Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Live Bot Connection & Health Diagnostics</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Auto-Inspector
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runDiagnostics}
              disabled={loadingDiag}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin text-sky-400' : ''}`} />
              <span>{loadingDiag ? 'Inspecting...' : 'Re-check Health'}</span>
            </button>
            <button
              onClick={handleClearWebhook}
              disabled={clearingWebhook}
              title="Fix 409 Webhook Conflict when using polling"
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{clearingWebhook ? 'Clearing...' : 'Clear Webhook / Force Polling'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostics Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status 1: Bot Token */}
          <div className={`p-3.5 rounded-xl border ${
            diagnostics?.botValid
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Bot API Token</span>
              {diagnostics?.botValid ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className={`text-sm font-bold ${diagnostics?.botValid ? 'text-emerald-300' : 'text-rose-300'}`}>
              {diagnostics?.botValid ? `@${diagnostics.botInfo?.username}` : 'Not Connected'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {diagnostics?.botValid ? diagnostics.botInfo?.first_name : (diagnostics?.lastPollingError || 'Token missing')}
            </div>
          </div>

          {/* Status 2: Polling Runner */}
          <div className={`p-3.5 rounded-xl border ${
            diagnostics?.pollingActive && !diagnostics.lastPollingError
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : diagnostics?.pollingActive
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Update Receiver</span>
              <span className={`w-2 h-2 rounded-full ${
                diagnostics?.pollingActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-200">
              {connectionMode === 'polling' ? 'Long-Polling Active' : 'Webhook Mode'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {diagnostics?.lastPollTimestamp
                ? `Last poll: ${new Date(diagnostics.lastPollTimestamp).toLocaleTimeString()}`
                : 'Waiting for token'}
            </div>
          </div>

          {/* Status 3: Group Status */}
          <div className={`p-3.5 rounded-xl border ${
            diagnostics?.groupReachable && diagnostics.botIsGroupAdmin
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : diagnostics?.groupReachable
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Group & Admin</span>
              {diagnostics?.botIsGroupAdmin ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-200 truncate">
              {diagnostics?.groupTitle || config.groupTitle || 'Group ID Target'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {diagnostics?.botIsGroupAdmin
                ? 'Bot is Administrator'
                : diagnostics?.groupReachable
                ? '⚠️ Bot is not Admin'
                : 'ID not verified'}
            </div>
          </div>

          {/* Status 4: Owner Channel */}
          <div className={`p-3.5 rounded-xl border ${
            config.ownerChatId && config.ownerChatId !== '987654321'
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Owner Alert Chat</span>
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono truncate">
              {config.ownerChatId || 'Not set'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {config.ownerChatId && config.ownerChatId !== '987654321'
                ? 'Ready for join stats'
                : 'Send /myid to bot'}
            </div>
          </div>
        </div>

        {/* Actionable Recommendations If Any */}
        {diagnostics?.recommendations && diagnostics.recommendations.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Recommended Fixes for Bot Responsiveness:</span>
            </span>
            <ul className="text-xs text-slate-300 space-y-1 pl-5 list-disc">
              {diagnostics.recommendations.map((rec, idx) => (
                <li key={idx} className="text-slate-300 leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Live Test Ping Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-xs font-semibold text-slate-200 block">Send Test Message from Bot</span>
            <span className="text-[11px] text-slate-400 block">
              Directly verify if the bot can send messages to your Telegram user or group chat
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={pingChatId}
              onChange={(e) => setPingChatId(e.target.value)}
              placeholder="Chat ID (e.g. your ID or group ID)"
              className="bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-100 font-mono w-48 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSendPing}
              disabled={sendingPing || !botToken}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingPing ? 'Sending...' : 'Send Test Ping'}</span>
            </button>
          </div>
        </div>

        {pingResult && (
          <div className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
            pingResult.ok
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            {pingResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{pingResult.message}</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Bot Credentials & Channel Targeting</span>
            <span className="text-[11px] text-amber-400 font-mono">
              {!canEditCredentials && 'Level 1 Owner Only'}
            </span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Bot Token */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Telegram Bot Token (from @BotFather)</span>
                <span className="text-[10px] text-slate-500">e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  disabled={!canEditCredentials}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Paste your Telegram bot token here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono pr-24 focus:outline-none focus:border-sky-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !botToken}
                    className="px-2 py-0.5 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 text-[10px] font-bold"
                  >
                    {testing ? 'Checking...' : 'Test'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                    testResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Group ID & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telegram Group Chat ID
                </label>
                <input
                  type="text"
                  disabled={!canEditCredentials}
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. -1002345678901"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Supergroups usually start with -100
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Community Group Title
                </label>
                <input
                  type="text"
                  disabled={!canEditCredentials}
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="e.g. Official VIP Community"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Owner Chat ID & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner Telegram Chat ID (For Alerts & /open)
                </label>
                <input
                  type="text"
                  disabled={!canEditCredentials}
                  value={ownerChatId}
                  onChange={(e) => setOwnerChatId(e.target.value)}
                  placeholder="e.g. 987654321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Send /myid to the bot in Telegram to get your ID
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner Username
                </label>
                <input
                  type="text"
                  disabled={!canEditCredentials}
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  placeholder="e.g. GroupOwner"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Command Access Control (Owner & Admin Restriction) */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Owner & Admin Command Protection
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  adminOnlyCommands 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {adminOnlyCommands ? 'Owner/Admin Only' : 'Open Access'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bot ka use sirf group Owner aur authorized Admins kar sakte hain. Regular members ke commands ka bot koi response nahi dega.
              </p>

              <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminOnlyCommands}
                    onChange={(e) => setAdminOnlyCommands(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Enforce Owner & Admin Only Commands
                    </span>
                    <span className="text-[10px] text-slate-400">
                      When enabled, the bot will strictly ignore commands (/status, /open, /close, /pending, /help, etc.) from non-admin users.
                    </span>
                  </div>
                </label>

                {adminOnlyCommands && (
                  <div className="pl-7 space-y-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                        Response Behavior for Regular Members (Non-Admins):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start space-x-2 ${
                            nonAdminResponseMode === 'silent'
                              ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="nonAdminResponse"
                            className="sr-only"
                            checked={nonAdminResponseMode === 'silent'}
                            onChange={() => setNonAdminResponseMode('silent')}
                          />
                          <div>
                            <div className="font-bold flex items-center gap-1">
                              <span>Silent (No Response)</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal">Recommended</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Bot remains completely silent. Does not reply to regular users.
                            </div>
                          </div>
                        </label>

                        <label
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start space-x-2 ${
                            nonAdminResponseMode === 'alert_dm'
                              ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="nonAdminResponse"
                            className="sr-only"
                            checked={nonAdminResponseMode === 'alert_dm'}
                            onChange={() => setNonAdminResponseMode('alert_dm')}
                          />
                          <div>
                            <div className="font-bold">Private DM Notice Only</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Replies "Access Restricted to Owner & Admins" in private DMs only.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDeleteUnauthorizedCommands}
                        onChange={(e) => setAutoDeleteUnauthorizedCommands(e.target.checked)}
                        className="mt-0.5 w-3.5 h-3.5 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500"
                      />
                      <div>
                        <span className="text-xs text-slate-200 font-medium block">
                          Auto-Delete Unauthorized Commands in Group Chats
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Automatically removes commands sent by regular members in the group so group chat stays clean and spam-free.
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Manage Authorized Level-1 & Level-2 Admins:</span>
                      </div>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('admins')}
                          className="text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
                        >
                          Open Admins Tab &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Telegram Connection Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer ${
                    connectionMode === 'polling'
                      ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="connMode"
                    className="sr-only"
                    checked={connectionMode === 'polling'}
                    onChange={() => setConnectionMode('polling')}
                  />
                  <div className="font-bold">Long-Polling (Recommended)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Fetches updates continuously; no public domain or SSL needed
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer ${
                    connectionMode === 'webhook'
                      ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="connMode"
                    className="sr-only"
                    checked={connectionMode === 'webhook'}
                    onChange={() => setConnectionMode('webhook')}
                  />
                  <div className="font-bold">Cloud Webhook</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Telegram pushes updates to applet URL
                  </div>
                </label>
              </div>
            </div>

            {/* Webhook URL preview if webhook selected */}
            {connectionMode === 'webhook' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Your Applet Webhook URL:</span>
                <div className="flex items-center justify-between font-mono text-xs text-sky-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={copyWebhookToClipboard}
                    className="ml-2 p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedWebhook && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">Copied to clipboard!</span>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Setup Instructions Guide & Troubleshooting */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Why Is The Bot Not Responding? Troubleshooting:</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block mb-1">1. Bot Token Not Configured Yet</strong>
              <p className="text-[11px] text-slate-400">
                Open Telegram &gt; search <strong>@BotFather</strong> &gt; send <code>/newbot</code> (or <code>/token</code>). Copy the HTTP API token and paste it in the field on the left, then click <strong>Save Credentials</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block mb-1">2. Bot Must Be Group Administrator</strong>
              <p className="text-[11px] text-slate-400">
                In your Telegram group, add the bot and promote it to <strong>Administrator</strong>. You <em>must</em> enable:
                <br />• <strong>Approve new chat members</strong> (Required for join requests)
                <br />• <strong>Delete messages</strong> &amp; <strong>Pin messages</strong>
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block mb-1">3. Join Request Link Required</strong>
              <p className="text-[11px] text-slate-400">
                In Group Settings &gt; Invite Links &gt; Create New Link &gt; toggle <strong>"Request Admin Approval"</strong> ON. Telegram will only send join requests when users join using this approval link.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block mb-1">4. Get Your Owner Telegram ID</strong>
              <p className="text-[11px] text-slate-400">
                Start a private chat with your bot in Telegram and send <code>/myid</code>. The bot will reply with your personal User ID. Paste that ID into <strong>Owner Telegram Chat ID</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block mb-1">5. Webhook Conflict Conflict</strong>
              <p className="text-[11px] text-slate-400">
                If the token was used with another webhook or bot platform previously, click the yellow <strong>"Clear Webhook / Force Polling"</strong> button at the top to clear conflicts instantly!
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-amber-300 block mb-1">6. Commands Ignored for Regular Members</strong>
              <p className="text-[11px] text-slate-400">
                Security enabled: Bot sirf <strong>Owner</strong> aur <strong>Admins</strong> ke commands ka response deta hai. Agar koi command reply nahi mil raha, ensure your Telegram ID is saved in <strong>Owner Telegram Chat ID</strong> or registered in the <strong>Admins</strong> tab.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-300">
            <span className="font-bold flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3 h-3" /> Built-in Sandbox Testing
            </span>
            Want to test join requests, rejoins, and member exits right now without setting up Telegram? Use the <strong>Test Simulator</strong> button in the top bar!
          </div>

          {/* GitHub & Render Deployment Guide */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                GitHub & Render Deployment Guide
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                render.yaml Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deploy this bot 24/7 online using your own GitHub repository and Render.com free web service:
            </p>
            <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <li>Export project via <strong>Settings &rarr; Export to GitHub/ZIP</strong></li>
              <li>Push the code into your GitHub repository</li>
              <li>On <strong>Render.com</strong>, click <em>New + &rarr; Web Service</em> and link your repository</li>
              <li>Render automatically reads <code>render.yaml</code> (Build: <code>npm install && npm run build</code>, Start: <code>npm start</code>)</li>
              <li>Set Environment Variables: <code>TELEGRAM_BOT_TOKEN</code>, <code>TELEGRAM_GROUP_ID</code>, <code>TELEGRAM_OWNER_ID</code>, <code>TZ=Asia/Kolkata</code></li>
            </ol>
          </div>

          {/* Database Maintenance & Clear Data */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Database Clean Up & Maintenance
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Remove old join requests, wipe inactive member logs, or perform a full system reset.
            </p>
            {onOpenClearModal && (
              <button
                type="button"
                onClick={onOpenClearModal}
                className="w-full py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Open Clear Data Manager</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
