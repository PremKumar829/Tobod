import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Repeat,
  Sparkles,
  Send,
  User,
  Clock,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { OwnerNotification } from '../types';

interface OwnerNotificationFeedProps {
  notifications: OwnerNotification[];
  ownerId?: string;
  ownerUsername?: string;
}

export const OwnerNotificationFeed: React.FC<OwnerNotificationFeedProps> = ({
  notifications,
  ownerId,
  ownerUsername,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Owner Alert Stream</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                Direct to Owner
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Audit log of stats sent directly to Group Owner (Chat ID: {ownerId || 'Configured'})
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {notifications.length} alerts logged
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
          <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No join request alerts sent yet.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            When a user requests to join, a detailed history report is sent to the owner.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {notifications.map((notif) => {
            const isRejoin = notif.isRejoin;
            return (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  isRejoin
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isRejoin
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {isRejoin ? <Repeat className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      {isRejoin ? `Rejoined (Join #${notif.joinCount})` : 'New Applicant'}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {notif.fullName}
                    </span>
                    {notif.username && (
                      <span className="text-slate-400 font-mono">@{notif.username}</span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Member History Stats Box */}
                <div className="bg-slate-950/60 rounded-lg p-2.5 font-mono text-[11px] border border-slate-800/80 space-y-1 mb-2 text-slate-300">
                  <div className="flex justify-between text-slate-400">
                    <span>Telegram ID:</span>
                    <span className="text-slate-200">{notif.telegramId}</span>
                  </div>
                  {isRejoin && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">First Seen:</span>
                        <span className="text-amber-400">
                          {notif.firstSeenAt ? new Date(notif.firstSeenAt).toLocaleDateString() : 'Previous member'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Past Exits Count:</span>
                        <span className="text-rose-400 font-bold">{notif.previousExitsCount} exit(s)</span>
                      </div>
                      {notif.previousTenure && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">History:</span>
                          <span className="text-slate-300">{notif.previousTenure}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Group At Request:</span>
                    <span className={notif.groupStatus === 'open' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {notif.groupStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <span className="text-slate-500">Action:</span>
                    <span className="text-slate-300 font-medium">{notif.actionTaken}</span>
                  </span>

                  <span className="flex items-center space-x-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Telegram Dispatched</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
