import React, { useState } from 'react';
import {
  Megaphone,
  Pin,
  BellOff,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Announcement, AdminUser } from '../types';

interface AnnouncementsTabProps {
  announcements: Announcement[];
  onBroadcast: (announcement: {
    title: string;
    text: string;
    pin: boolean;
    silent: boolean;
    parseMode: 'Markdown' | 'HTML';
  }) => Promise<{ success: boolean; message?: string } | boolean>;
  currentAdmin: AdminUser | null;
  canBroadcast?: boolean;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcements,
  onBroadcast,
  currentAdmin,
  canBroadcast = true,
}) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pin, setPin] = useState(false);
  const [silent, setSilent] = useState(false);
  const [parseMode, setParseMode] = useState<'Markdown' | 'HTML'>('Markdown');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success?: boolean; msg?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSending(true);
    setFeedback(null);
    try {
      const result = await onBroadcast({
        title,
        text,
        pin,
        silent,
        parseMode,
      });

      const isSuccess = typeof result === 'boolean' ? result : !!result?.success;
      const responseMsg = typeof result === 'object' && result?.message ? result.message : undefined;

      if (isSuccess) {
        setTitle('');
        setText('');
        setFeedback({
          success: true,
          msg: responseMsg || 'Announcement broadcasted successfully to the group!',
        });
      } else {
        setFeedback({
          success: false,
          msg: responseMsg || 'Broadcast not delivered to Telegram. Check Bot Token and Group ID configuration.',
        });
      }
    } catch (err: any) {
      setFeedback({ success: false, msg: err.message || 'Broadcast failed' });
    } finally {
      setIsSending(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const sampleTemplates = [
    {
      title: '🚨 Scheduled Group Maintenance Notice',
      text: 'Hello everyone! Please note our services will undergo scheduled maintenance tonight at 00:00 UTC. The group will temporarily remain in read-only mode during this time.',
    },
    {
      title: '🎉 Welcome All New Members!',
      text: 'A warm welcome to all new participants who joined our community today! Please review the pinned guidelines and feel free to introduce yourself.',
    },
    {
      title: '📢 Community Guidelines Reminder',
      text: 'Friendly reminder to all members:\n1. Respect each other\n2. No unauthorized promotional spam\n3. Contact moderators for any issues.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2">
          <Megaphone className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100">
            Group Announcement Broadcast Engine
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Publish official notices and updates directly to your Telegram group with formatting, pinning, and quiet delivery options
        </p>
      </div>

      {/* Composer & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Composer Form */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Compose Announcement</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Posting as: <strong className="text-sky-300">{currentAdmin?.name || 'Admin'}</strong>
            </span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Announcement Title / Headline (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🚀 Important Community Update"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Announcement Message Content
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
                  </button>
                  <select
                    value={parseMode}
                    onChange={(e) => setParseMode(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 rounded px-1.5 py-0.5"
                  >
                    <option value="Markdown">Markdown</option>
                    <option value="HTML">HTML</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={6}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write announcement text here... Markdown formatting like *bold*, _italic_, and bullet points supported."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
              />
            </div>

            {/* Quick Template Chips */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1.5">Quick Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {sampleTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTitle(tpl.title);
                      setText(tpl.text);
                    }}
                    className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors truncate max-w-[200px]"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Options */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pin}
                    onChange={(e) => setPin(e.target.checked)}
                    className="w-4 h-4 text-sky-600 bg-slate-950 border-slate-700 rounded focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pin to Group</span>
                  </span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={silent}
                    onChange={(e) => setSilent(e.target.checked)}
                    className="w-4 h-4 text-sky-600 bg-slate-950 border-slate-700 rounded focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <BellOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Silent (No sound)</span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSending || !text.trim() || !canBroadcast}
                className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending...' : 'Broadcast to Group'}</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  feedback.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.msg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Telegram Bubble Preview */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-slate-400" />
            <span>Telegram Client Preview</span>
          </h3>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between min-h-[260px] relative">
            {/* Telegram simulated message bubble */}
            <div className="max-w-[90%] bg-[#212d3b] text-slate-100 rounded-2xl p-3.5 shadow-md self-start border border-slate-700/50">
              <div className="text-[11px] font-bold text-sky-400 mb-1 flex items-center justify-between">
                <span>Group Bot Announcement</span>
                {pin && <Pin className="w-3 h-3 text-amber-400 ml-2" />}
              </div>

              {title && (
                <div className="font-bold text-xs text-slate-100 mb-1.5">
                  {title}
                </div>
              )}

              <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-200">
                {text || <span className="text-slate-500 italic">Announcement body preview will appear here...</span>}
              </div>

              <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end space-x-1">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <CheckCircle2 className="w-2.5 h-2.5 text-sky-400" />
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-4 text-center">
              Rendered with Telegram client theme simulation
            </div>
          </div>
        </div>

      </div>

      {/* Broadcast History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Broadcast History ({announcements.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Title & Content</th>
                <th className="py-3 px-4">Target Group</th>
                <th className="py-3 px-4">Sender</th>
                <th className="py-3 px-4">Pinned</th>
                <th className="py-3 px-4">Time Sent</th>
                <th className="py-3 px-4">Telegram ID</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No announcements broadcasted yet.
                  </td>
                </tr>
              ) : (
                announcements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-200 truncate">
                        {ann.title || 'Untitled Broadcast'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {ann.text}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {ann.targetChatId}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {ann.sentBy}
                    </td>

                    <td className="py-3 px-4">
                      {ann.pinMessage ? (
                        <span className="inline-flex items-center text-amber-400 font-semibold text-[10px]">
                          <Pin className="w-3 h-3 mr-0.5" /> Pinned
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Standard</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(ann.sentAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {ann.telegramMessageId ? `#${ann.telegramMessageId}` : 'Simulated'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {ann.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
