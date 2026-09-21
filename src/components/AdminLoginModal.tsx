import React, { useState } from 'react';
import { Shield, Key, Lock, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminUser } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  currentAdmin: AdminUser | null;
  onLogin: (username: string, pin: string) => Promise<boolean>;
  onFastSwitch: (admin: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  admins,
  currentAdmin,
  onLogin,
  onFastSwitch,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const ok = await onLogin(username, pin);
      if (ok) {
        onClose();
      } else {
        setError('Invalid username or PIN code');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Admin Authentication & Role Switcher
              </h3>
              <p className="text-xs text-slate-400">
                Level 1: Owner (Root) • Level 2: Moderator (Operations)
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
        <div className="p-5 space-y-5">
          
          {/* Fast Switcher (One-click demo switcher for development ease) */}
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Quick Role Switch (Demo Mode):
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {admins.map((adm) => {
                const isCurrent = currentAdmin?.id === adm.id;
                const isOwner = adm.role === 'level_1_owner';

                return (
                  <button
                    key={adm.id}
                    type="button"
                    onClick={() => {
                      onFastSwitch(adm);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-amber-950/40 border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {adm.name}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isOwner ? 'text-amber-400' : 'text-sky-400'}`}>
                      {isOwner ? 'Level 1: Owner' : 'Level 2: Moderator'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      PIN: {adm.pin}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form manual login */}
          <div className="pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block mb-3">
              Or Login with Username & PIN:
            </span>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. owner or alex_mod"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Security PIN (e.g. 1234 or 5678)
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono tracking-widest focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-md"
              >
                {loading ? 'Authenticating...' : 'Sign In as Admin'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
