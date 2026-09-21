import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Shield,
  MessageSquare,
  Lock,
  Unlock,
  CheckCheck,
  Save,
  Bell,
  Sparkles,
  Info,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  Power
} from 'lucide-react';
import { BotConfig, AutoApproveMode, ScheduleSlot } from '../types';

interface ScheduleAutomationTabProps {
  config: BotConfig;
  onSaveConfig: (updates: Partial<BotConfig>) => void;
  canEditSchedule?: boolean;
}

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30) - Indian Standard Time (Default)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
];

const DAYS = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

export const ScheduleAutomationTab: React.FC<ScheduleAutomationTabProps> = ({
  config,
  onSaveConfig,
  canEditSchedule = true,
}) => {
  const [scheduleEnabled, setScheduleEnabled] = useState(config.scheduleEnabled);
  const [openTime, setOpenTime] = useState(config.openTime || '08:00');
  const [closeTime, setCloseTime] = useState(config.closeTime || '22:00');
  const [timezone, setTimezone] = useState(config.timezone || 'Asia/Kolkata');
  const [activeDays, setActiveDays] = useState<number[]>(config.activeDays || [0, 1, 2, 3, 4, 5, 6]);
  const [autoApproveMode, setAutoApproveMode] = useState<AutoApproveMode>(config.autoApproveMode || 'only_when_open');
  const [closedNoticeMessage, setClosedNoticeMessage] = useState(config.closedNoticeMessage || '');
  const [openedNoticeMessage, setOpenedNoticeMessage] = useState(config.openedNoticeMessage || '');
  const [lockChatWhenClosed, setLockChatWhenClosed] = useState(config.lockChatWhenClosed);
  const [notifyOwnerOnJoinRequest, setNotifyOwnerOnJoinRequest] = useState(config.notifyOwnerOnJoinRequest);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Multiple Schedule Slots (User request: "multiple times add kro jisse on off krne ka Time add kr sake")
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>(
    config.scheduleSlots && config.scheduleSlots.length > 0
      ? config.scheduleSlots
      : [
          { id: 'slot-1', label: 'Morning Opening', name: 'Morning Opening', openTime: '08:00', closeTime: '13:00', enabled: true },
          { id: 'slot-2', label: 'Evening Opening', name: 'Evening Opening', openTime: '16:00', closeTime: '22:00', enabled: true },
        ]
  );
  const [useMultiSlots, setUseMultiSlots] = useState<boolean>(
    (config.scheduleSlots && config.scheduleSlots.length > 0) || false
  );

  const toggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter(d => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day].sort());
    }
  };

  const addSlot = (label = 'New Slot', open = '09:00', close = '17:00') => {
    const newSlot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      label,
      name: label,
      openTime: open,
      closeTime: close,
      enabled: true,
    };
    setScheduleSlots([...scheduleSlots, newSlot]);
  };

  const updateSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setScheduleSlots(slots =>
      slots.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const removeSlot = (id: string) => {
    setScheduleSlots(slots => slots.filter(s => s.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      scheduleEnabled,
      openTime,
      closeTime,
      timezone,
      activeDays,
      autoApproveMode,
      closedNoticeMessage,
      openedNoticeMessage,
      lockChatWhenClosed,
      notifyOwnerOnJoinRequest,
      scheduleSlots: useMultiSlots ? scheduleSlots : [],
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">
                Group Schedule & Automatic Join Approval
              </h2>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                IST Midnight 12:00 AM Reset Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure multiple daily on/off time intervals, automated request batching, and custom broadcast notices
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {savedSuccess && (
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings Saved!</span>
              </span>
            )}
            <button
              type="submit"
              disabled={!canEditSchedule}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Automation Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Card 1: Operating Hours & Schedule Slots */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">Operating Schedule</h3>
            </div>

            <label className="flex items-center cursor-pointer space-x-2">
              <span className="text-xs text-slate-400">Enable Schedule</span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Mode toggle: Single vs Multiple Schedule Windows */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Multiple Time Slots (Multiple On/Off Times per Day)
              </span>
              <span className="text-[11px] text-slate-500">
                Allows configuring multiple separate open & close windows (e.g. morning + evening)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setUseMultiSlots(!useMultiSlots)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                useMultiSlots
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {useMultiSlots ? 'Multi-Slot ON' : 'Single Slot'}
            </button>
          </div>

          {/* Multiple Slots Manager */}
          {useMultiSlots ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Active Time Slots ({scheduleSlots.length})
                </span>
                <button
                  type="button"
                  onClick={() => addSlot(`Slot ${scheduleSlots.length + 1}`, '14:00', '18:00')}
                  className="flex items-center space-x-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Time Slot</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {scheduleSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border transition-all ${
                      slot.enabled
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={slot.label || slot.name || `Slot ${index + 1}`}
                          onChange={(e) => updateSlot(slot.id, { label: e.target.value, name: e.target.value })}
                          className="bg-transparent text-xs font-semibold text-slate-200 border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => updateSlot(slot.id, { enabled: !slot.enabled })}
                          className={`p-1 rounded-md text-xs font-semibold ${
                            slot.enabled ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-slate-500 hover:bg-slate-800'
                          }`}
                          title={slot.enabled ? 'Slot is Active' : 'Slot is Disabled'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          🟢 Open Time (Start)
                        </label>
                        <input
                          type="time"
                          value={slot.openTime}
                          onChange={(e) => updateSlot(slot.id, { openTime: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          🔴 Close Time (End)
                        </label>
                        <input
                          type="time"
                          value={slot.closeTime}
                          onChange={(e) => updateSlot(slot.id, { closeTime: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preset quick buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => addSlot('Morning Session', '08:00', '12:00')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  + Morning (08:00 - 12:00)
                </button>
                <button
                  type="button"
                  onClick={() => addSlot('Afternoon Session', '14:00', '18:00')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  + Afternoon (14:00 - 18:00)
                </button>
                <button
                  type="button"
                  onClick={() => addSlot('Evening Session', '19:00', '23:00')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  + Evening (19:00 - 23:00)
                </button>
              </div>
            </div>
          ) : (
            /* Single Time Picker Row */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Group Open Time (Daily)
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Auto-approves pending join requests upon opening.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Group Close Time (Daily)
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Holds all new join requests in pending queue.
                </span>
              </div>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Operating Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Days */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Active Days of the Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(({ day, label }) => {
                const isSelected = activeDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-9 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat lock toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Lock Member Chat While Closed
              </span>
              <span className="text-[11px] text-slate-500">
                Restricts regular members from messaging in group during closed hours
              </span>
            </div>
            <input
              type="checkbox"
              checked={lockChatWhenClosed}
              onChange={(e) => setLockChatWhenClosed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Card 2: Auto-Approval & Owner Alerting Policy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Auto-Approval & Owner Alerts</h3>
          </div>

          {/* Policy Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Join Request Auto-Approval Policy
            </label>
            <div className="space-y-2.5">
              {[
                {
                  mode: 'only_when_open' as AutoApproveMode,
                  title: 'Auto-Approve Only When Group is OPEN (Recommended)',
                  desc: 'When group is closed: incoming requests are held in pending queue. As soon as the group opens, the bot auto-approves all pending applicants in bulk.',
                  badge: 'Standard Flow',
                },
                {
                  mode: 'always' as AutoApproveMode,
                  title: 'Always Auto-Approve (24/7 Instant)',
                  desc: 'Every incoming join request is approved instantaneously regardless of group opening or closing hours.',
                  badge: 'Instant',
                },
                {
                  mode: 'manual' as AutoApproveMode,
                  title: 'Manual Admin Review Only',
                  desc: 'Bot never automatically approves. Admins must approve via the web dashboard or owner telegram commands.',
                  badge: 'Strict',
                },
              ].map(opt => (
                <label
                  key={opt.mode}
                  className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    autoApproveMode === opt.mode
                      ? 'bg-indigo-950/40 border-indigo-500/40 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="radio"
                        name="autoApproveMode"
                        value={opt.mode}
                        checked={autoApproveMode === opt.mode}
                        onChange={() => setAutoApproveMode(opt.mode)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-200">{opt.title}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">
                    {opt.desc}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Owner notification toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Send Member History Stats to Owner Chat
              </span>
              <span className="text-[11px] text-slate-500">
                Dispatches a private Telegram message to Owner with applicant history, rejoin count, and tenure
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifyOwnerOnJoinRequest}
              onChange={(e) => setNotifyOwnerOnJoinRequest(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

      </div>

      {/* Card 3: Broadcast Messages */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Automated State Transition Messages (Sent to Group)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Group Closed Notice Message</span>
              <span className="text-[10px] text-slate-500">Sent to Telegram group when closed</span>
            </label>
            <textarea
              rows={4}
              value={closedNoticeMessage}
              onChange={(e) => setClosedNoticeMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              placeholder="e.g. 🔒 The group is now closed for the night..."
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Informs members that joining requests are queued until the next opening window.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Group Opened Notice Message</span>
              <span className="text-[10px] text-slate-500">Sent to Telegram group when opened</span>
            </label>
            <textarea
              rows={4}
              value={openedNoticeMessage}
              onChange={(e) => setOpenedNoticeMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              placeholder="e.g. 🟢 The group is now open! Welcome new members..."
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              The bot automatically attaches the count of auto-approved applicants!
            </span>
          </div>
        </div>
      </div>
    </form>
  );
};
