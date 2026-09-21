import React, { useState } from 'react';
import {
  Sparkles,
  UserPlus,
  UserMinus,
  Repeat,
  Lock,
  Unlock,
  CheckCheck,
  Play,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (eventType: string) => Promise<any>;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [runningEvent, setRunningEvent] = useState<string | null>(null);
  const [log, setLog] = useState<{ msg: string; type: 'success' | 'info' | 'error' }[]>([]);

  if (!isOpen) return null;

  const handleRun = async (eventType: string, label: string) => {
    setRunningEvent(eventType);
    try {
      const res = await onSimulate(eventType);
      setLog(prev => [
        {
          msg: `Executed: ${label} - ${res.success ? 'Success!' : 'Failed'}`,
          type: res.success ? 'success' : 'error'
        },
        ...prev.slice(0, 10)
      ]);
    } catch (err: any) {
      setLog(prev => [{ msg: `Error: ${err.message}`, type: 'error' }, ...prev]);
    } finally {
      setRunningEvent(null);
    }
  };

  const simulationActions = [
    {
      id: 'new_join_request',
      title: 'Simulate New Join Request (First-Time)',
      desc: 'Simulates a brand new applicant requesting to join. Tests Owner Alert dispatch and auto-approval rule.',
      icon: UserPlus,
      color: 'emerald',
      btnText: 'Simulate New Join',
    },
    {
      id: 'rejoin_request',
      title: 'Simulate Rejoin Request (Returnee with History)',
      desc: 'Simulates a user who previously joined or left. Tests Owner Rejoined alert with prior tenure & join counts.',
      icon: Repeat,
      color: 'amber',
      btnText: 'Simulate Rejoin',
    },
    {
      id: 'member_exit',
      title: 'Simulate Member Departure / Exit',
      desc: 'Simulates an active member leaving the group. Tests today exit count and status transition.',
      icon: UserMinus,
      color: 'rose',
      btnText: 'Simulate Member Exit',
    },
    {
      id: 'trigger_open',
      title: 'Trigger Group OPEN Transition',
      desc: 'Simulates scheduled group opening. Tests automatic bulk approval of ALL pending requests by the bot!',
      icon: Unlock,
      color: 'sky',
      btnText: 'Trigger Opening & Bulk Approval',
    },
    {
      id: 'trigger_close',
      title: 'Trigger Group CLOSE Transition',
      desc: 'Simulates scheduled group closing. Tests chat locking notice and incoming request queueing.',
      icon: Lock,
      color: 'purple',
      btnText: 'Trigger Group Closure',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Interactive Telegram Event Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Test join requests, rejoin alerts, member exits, and open/close bulk approvals in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-2.5">
            {simulationActions.map((act) => {
              const Icon = act.icon;
              const isRunning = runningEvent === act.id;

              return (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {act.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isRunning}
                    onClick={() => handleRun(act.id, act.title)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors whitespace-nowrap self-end sm:self-center cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                    <span>{isRunning ? 'Processing...' : act.btnText}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Simulator log */}
          {log.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-wider">
                Simulation Live Output Log:
              </span>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                {log.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center space-x-1.5 ${
                      item.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.type === 'success' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                    <span>{item.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Done Testing
          </button>
        </div>

      </div>
    </div>
  );
};
