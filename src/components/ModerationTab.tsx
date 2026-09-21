import React, { useState } from 'react';
import {
  ShieldAlert,
  Link2,
  AlertTriangle,
  Trash2,
  Plus,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Eye,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { BotConfig, ActivityLog } from '../types';

interface ModerationTabProps {
  config: BotConfig;
  onSaveConfig: (updates: Partial<BotConfig>) => void;
  logs?: ActivityLog[];
}

export const ModerationTab: React.FC<ModerationTabProps> = ({
  config,
  onSaveConfig,
  logs = [],
}) => {
  // Link filter state
  const [linkFilterEnabled, setLinkFilterEnabled] = useState(config.linkFilterEnabled ?? true);
  const [linkFilterAction, setLinkFilterAction] = useState<'delete' | 'delete_warn'>(
    config.linkFilterAction || 'delete_warn'
  );
  const [linkFilterWarnText, setLinkFilterWarnText] = useState(
    config.linkFilterWarnText ||
      '⚠️ @{username}, sharing links is strictly prohibited in this group! Your message has been removed. 🛡️'
  );
  const [linkFilterWhitelistAdmins, setLinkFilterWhitelistAdmins] = useState(
    config.linkFilterWhitelistAdmins ?? true
  );

  // Abuse filter state
  const [abuseFilterEnabled, setAbuseFilterEnabled] = useState(config.abuseFilterEnabled ?? true);
  const [abuseFilterAction, setAbuseFilterAction] = useState<'delete' | 'delete_warn'>(
    config.abuseFilterAction || 'delete_warn'
  );
  const [abuseFilterWarnText, setAbuseFilterWarnText] = useState(
    config.abuseFilterWarnText ||
      '🚫 @{username}, abusive or offensive language is not allowed in this group! Your message was deleted. 🛡️'
  );
  const [abuseWords, setAbuseWords] = useState<string[]>(
    config.abuseFilterWords && config.abuseFilterWords.length > 0
      ? config.abuseFilterWords
      : [
          'mc',
          'bc',
          'bhenchod',
          'madarchod',
          'chutiya',
          'gandu',
          'bhosdike',
          'harami',
          'saala',
          'scam',
          'fraud',
          'fuck',
          'bitch',
          'bastard',
          'asshole',
          'bullshit',
        ]
  );
  const [newWord, setNewWord] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filter automod logs
  const automodLogs = logs.filter(l => l.type === 'automod' || l.action.toLowerCase().includes('filter'));

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed) return;
    if (!abuseWords.includes(trimmed)) {
      setAbuseWords([...abuseWords, trimmed]);
    }
    setNewWord('');
  };

  const handleRemoveWord = (word: string) => {
    setAbuseWords(abuseWords.filter(w => w !== word));
  };

  const handleResetDefaultWords = () => {
    setAbuseWords([
      'mc',
      'bc',
      'bhenchod',
      'madarchod',
      'chutiya',
      'gandu',
      'bhosdike',
      'harami',
      'saala',
      'scam',
      'fraud',
      'fuck',
      'bitch',
      'bastard',
      'asshole',
      'bullshit',
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveConfig({
        linkFilterEnabled,
        linkFilterAction,
        linkFilterWarnText,
        linkFilterWhitelistAdmins,
        abuseFilterEnabled,
        abuseFilterAction,
        abuseFilterWarnText,
        abuseFilterWords: abuseWords,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30 rounded-xl text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Automated Moderation & Content Filters
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Active Guard
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time Telegram message interceptor. Instantly deletes spam links, promotional URLs, and abusive/offensive messages with automated warnings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center space-x-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Filters Saved!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Moderation Rules'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Anti-Link Filter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Anti-Link & URL Filter</h3>
                <p className="text-[11px] text-slate-400">Detects & deletes http/https, t.me, and domain links</p>
              </div>
            </div>

            <button
              onClick={() => setLinkFilterEnabled(!linkFilterEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                linkFilterEnabled
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {linkFilterEnabled ? 'FILTER ON' : 'FILTER OFF'}
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Action on Link Detection:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkFilterAction('delete_warn')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    linkFilterAction === 'delete_warn'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-200 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Delete & Send Warning</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Removes link & pings user with warning</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkFilterAction('delete')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    linkFilterAction === 'delete'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-200 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Silent Delete</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Removes message silently without warning</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Warning Notification Text:</label>
              <textarea
                rows={3}
                value={linkFilterWarnText}
                onChange={e => setLinkFilterWarnText(e.target.value)}
                disabled={!linkFilterEnabled || linkFilterAction === 'delete'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50 transition-colors"
                placeholder="Custom warning text..."
              />
              <div className="text-[10px] text-slate-500 mt-1">
                Tip: <code className="text-sky-400">{'{username}'}</code> will be replaced with user mention.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300">Allow Group Admins / Owner to send links</span>
              <input
                type="checkbox"
                checked={linkFilterWhitelistAdmins}
                onChange={e => setLinkFilterWhitelistAdmins(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Anti-Abuse / Offensive Words Filter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Anti-Abuse & Bad Words Filter</h3>
                <p className="text-[11px] text-slate-400">Scans messages against restricted keywords & abuse</p>
              </div>
            </div>

            <button
              onClick={() => setAbuseFilterEnabled(!abuseFilterEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                abuseFilterEnabled
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {abuseFilterEnabled ? 'FILTER ON' : 'FILTER OFF'}
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Action on Abuse Detection:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAbuseFilterAction('delete_warn')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    abuseFilterAction === 'delete_warn'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-200 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Delete & Send Warning</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Removes abuse & pings user with warning</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAbuseFilterAction('delete')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    abuseFilterAction === 'delete'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-200 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Silent Delete</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Removes message silently</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Blacklisted Words ({abuseWords.length})
                </label>
                <button
                  type="button"
                  onClick={handleResetDefaultWords}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default List
                </button>
              </div>

              {/* Word Chips */}
              <div className="max-h-28 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-wrap gap-1.5">
                {abuseWords.map(word => (
                  <span
                    key={word}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      className="ml-1.5 text-rose-400 hover:text-rose-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Word Input */}
              <form onSubmit={handleAddWord} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  placeholder="Type word to ban..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Abuse Warning Message:</label>
              <textarea
                rows={2}
                value={abuseFilterWarnText}
                onChange={e => setAbuseFilterWarnText(e.target.value)}
                disabled={!abuseFilterEnabled || abuseFilterAction === 'delete'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500 disabled:opacity-50 transition-colors"
                placeholder="Custom abuse warning text..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* AutoMod Audit Logs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Recent AutoMod Enforcement History
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            {automodLogs.length} filter event(s) recorded
          </span>
        </div>

        {automodLogs.length === 0 ? (
          <div className="bg-slate-950/60 rounded-xl p-8 text-center border border-slate-800/80">
            <ShieldCheck className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">Clean Moderation Record</div>
            <p className="text-[11px] text-slate-500 mt-1">
              No link or abusive message violations have been detected yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto bg-slate-950/60 rounded-xl border border-slate-800">
            {automodLogs.slice(0, 15).map((log, idx) => (
              <div key={idx} className="p-3 flex items-start justify-between text-xs gap-3">
                <div className="flex items-start space-x-2.5">
                  <span className="mt-0.5 p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Trash2 className="w-3 h-3" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-200">{log.action}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{log.description}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
