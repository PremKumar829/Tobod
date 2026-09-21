import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Type,
  Eye,
  MessageSquare,
  Shield,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { BotConfig, SpecialFontStyle } from '../types';
import { toSpecialFont, formatWelcomeMessage } from '../utils/textStyler';

interface WelcomeMessageTabProps {
  config: BotConfig;
  onSaveConfig: (updates: Partial<BotConfig>) => void;
  onTestSend?: (data: { chatId?: string; groupName?: string; fontStyle: SpecialFontStyle; template: string }) => Promise<any>;
}

export const WelcomeMessageTab: React.FC<WelcomeMessageTabProps> = ({
  config,
  onSaveConfig,
  onTestSend,
}) => {
  const [enabled, setEnabled] = useState(config.welcomeMessageEnabled ?? true);
  const [template, setTemplate] = useState(
    config.welcomeMessageTemplate ||
      '👋 Welcome @{username} to {group_name} 🇮🇳🇮🇳🇮🇳! ✅\n\nWe are delighted to have you here. Please follow group rules and respect members.'
  );
  const [fontStyle, setFontStyle] = useState<SpecialFontStyle>(
    config.welcomeMessageFont || 'bold_serif'
  );
  const [destination, setDestination] = useState<'group' | 'dm' | 'both'>(
    config.welcomeMessageDestination || 'group'
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample user for preview
  const sampleUser = {
    username: 'rohit_kumar',
    firstName: 'Rohit',
    lastName: 'Kumar',
  };

  const currentGroupTitle = config.groupTitle || 'Official Community Group';
  const previewFormatted = formatWelcomeMessage(template, sampleUser, currentGroupTitle, fontStyle);

  const fontOptions: { id: SpecialFontStyle; label: string; sample: string; description: string }[] = [
    {
      id: 'bold_serif',
      label: 'Bold Serif (Royal)',
      sample: toSpecialFont('Welcome to VIP Group', 'bold_serif'),
      description: 'Classic high-contrast thick serif lettering',
    },
    {
      id: 'bold_sans',
      label: 'Bold Sans (Modern)',
      sample: toSpecialFont('Welcome to VIP Group', 'bold_sans'),
      description: 'Clean, bold modern typography',
    },
    {
      id: 'double_struck',
      label: 'Double Struck / Blackboard',
      sample: toSpecialFont('Welcome to VIP Group', 'double_struck'),
      description: 'Distinctive mathematical open font style',
    },
    {
      id: 'script',
      label: 'Script / Cursive',
      sample: toSpecialFont('Welcome to VIP Group', 'script'),
      description: 'Flowing handwriting signature style',
    },
    {
      id: 'monospace',
      label: 'Monospace / Code',
      sample: toSpecialFont('Welcome to VIP Group', 'monospace'),
      description: 'Typewriter tech style',
    },
    {
      id: 'normal',
      label: 'Standard (No special font)',
      sample: 'Welcome to VIP Group',
      description: 'Default telegram text',
    },
  ];

  const handleInsertTag = (tag: string) => {
    setTemplate(prev => prev + tag);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveConfig({
        welcomeMessageEnabled: enabled,
        welcomeMessageTemplate: template,
        welcomeMessageFont: fontStyle,
        welcomeMessageDestination: destination,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSendWelcome = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/welcome/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: config.groupId,
          sampleUsername: sampleUser.username,
          sampleName: sampleUser.firstName,
          groupName: currentGroupTitle,
          fontStyle,
          template,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          ok: true,
          message: config.botToken
            ? `Dispatched test message to ${config.groupTitle || config.groupId}!`
            : 'Simulated successfully (Connect Bot Token to send directly to Telegram).',
        });
      } else {
        setTestResult({ ok: false, message: data.error || 'Failed to dispatch test message' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Automated Welcome Message & Special Font Styler
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🇮🇳 Special Font Enabled
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automatically greet new members upon join or approval. Custom fonts render Unicode stylized characters directly in Telegram!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setEnabled(!enabled)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{enabled ? 'Welcome Greeting ACTIVE' : 'Welcome Greeting DISABLED'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Font Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-4 h-4 text-purple-400" />
                Select Group Name Special Font Style
              </label>
              <span className="text-[11px] text-purple-300 font-mono">Unicode Text Transform</span>
            </div>

            <p className="text-xs text-slate-400">
              Select how <code className="text-amber-300 font-mono">{'{group_name}'}</code> is transformed inside the welcome greeting:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {fontOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFontStyle(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    fontStyle === opt.id
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{opt.label}</span>
                    {fontStyle === opt.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-sm font-bold text-amber-300 mt-1 truncate font-mono">
                    {toSpecialFont(currentGroupTitle, opt.id)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Welcome Message Template
              </label>
              <span className="text-[11px] text-slate-400">Supports Emojis & Markdown</span>
            </div>

            {/* Quick Variable Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 self-center mr-1">Insert Variable:</span>
              {[
                { tag: '@{username}', label: '@Username' },
                { tag: '{name}', label: 'Full Name' },
                { tag: '{group_name}', label: 'Group Name (Styled)' },
                { tag: '🇮🇳🇮🇳🇮🇳! ✅', label: 'Indian Flag + Check' },
                { tag: '{time}', label: 'Current Time' },
              ].map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertTag(item.tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 text-[11px] font-mono transition-colors"
                >
                  +{item.label}
                </button>
              ))}
            </div>

            <textarea
              rows={5}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors leading-relaxed"
              placeholder="e.g. Welcome @{username} to {group_name} 🇮🇳🇮🇳🇮🇳! ✅"
            />

            {/* Destination Selection */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="text-xs font-medium text-slate-300 block mb-2">
                Where should the Welcome Message be sent?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'group', label: 'Group Chat', desc: 'Sent publicly in the group' },
                  { id: 'dm', label: 'Direct Message', desc: 'Sent to member private chat' },
                  { id: 'both', label: 'Both Group & DM', desc: 'Sent to both simultaneously' },
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDestination(d.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      destination === d.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">{d.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Welcome Configuration'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestSendWelcome}
                disabled={testing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{testing ? 'Sending Test...' : 'Send Test Welcome to Telegram'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  testResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telegram Device Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-200">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Live Telegram Preview</h3>
              </div>
              <button
                onClick={handleCopyPreview}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              This represents how new approved members will see your welcome announcement inside Telegram:
            </p>

            {/* Telegram Simulated Chat Box */}
            <div className="bg-[#0e1621] border border-slate-800 rounded-2xl p-4 shadow-inner">
              {/* Telegram chat header */}
              <div className="flex items-center space-x-2.5 pb-3 mb-3 border-b border-[#17212b]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {currentGroupTitle.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight truncate">
                    {currentGroupTitle}
                  </div>
                  <div className="text-[10px] text-sky-400">bot, admins & members</div>
                </div>
              </div>

              {/* Bot chat bubble */}
              <div className="flex items-start space-x-2">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                  BOT
                </div>

                <div className="flex-1 bg-[#182533] border border-[#243447] rounded-2xl rounded-tl-sm p-3.5 shadow-md">
                  <div className="flex items-center justify-between text-[11px] text-purple-300 font-bold mb-1.5">
                    <span>{config.botUsername ? `@${config.botUsername}` : 'Group Automation Bot'}</span>
                    <span className="text-[9px] text-slate-500 font-normal">Just now</span>
                  </div>

                  {/* Rendered welcome content */}
                  <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed font-sans select-text">
                    {previewFormatted}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#233140] flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Auto-greet verified
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Font: {fontStyle.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guide Card */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                Special Font Compatibility
              </div>
              <p>
                The special font is formed using mathematical alphanumeric symbols in Unicode. It renders natively on Android, iOS, Windows, Mac, and Web Telegram without needing any external client font installed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
