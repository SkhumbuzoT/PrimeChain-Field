import React, { useState } from 'react';
import {
  Shield,
  Lock,
  UserCheck,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Monitor,
  Smartphone,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PlatformUser } from '../types';

interface LoginGateViewProps {
  users: PlatformUser[];
  initialIdentifier?: string;
  onAuthenticated: (user: PlatformUser) => void;
}

export const LoginGateView: React.FC<LoginGateViewProps> = ({
  users,
  initialIdentifier = '',
  onAuthenticated,
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickAccounts, setShowQuickAccounts] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pinOrPassword.trim();

    if (!cleanId || !cleanPin) {
      setError('Please enter both your Email / Employee Code and Access PIN.');
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.emailOrCode.trim().toLowerCase() === cleanId ||
        u.name.trim().toLowerCase() === cleanId
    );

    if (!matchedUser) {
      setError(
        'No authorized user account found for this Email or Employee Code. Contact your Operations Administrator.'
      );
      return;
    }

    if (matchedUser.status === 'Suspended') {
      setError(
        'Access Revoked: Your user account has been suspended by an Operations Administrator.'
      );
      return;
    }

    if (matchedUser.pinOrPassword !== cleanPin) {
      setError('Invalid Access PIN / Password. Please try again.');
      return;
    }

    onAuthenticated(matchedUser);
  };

  const handleQuickFill = (user: PlatformUser) => {
    setIdentifier(user.emailOrCode);
    setPinOrPassword(user.pinOrPassword);
    setError(null);
  };

  const activeUsers = users.filter((u) => u.status === 'Active');

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brand Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-white leading-none">
              PRIMECHAIN
            </div>
            <div className="text-[11px] text-slate-400 mt-1 leading-none">
              Municipal Chain-of-Custody &amp; Field Operations Platform
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>LightUp Enterprise · City Power JHB</span>
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="my-auto py-8 w-full max-w-md mx-auto">
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                Controlled Operator Access
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Sign in to PrimeChain
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your authorized email address or employee code to access
                your assigned workspace.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address or Employee Code
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. skhumbuzo@lightup.co.za or SN-0042"
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Access PIN / Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={pinOrPassword}
                    onChange={(e) => setPinOrPassword(e.target.value)}
                    placeholder="Enter your 4-digit PIN or password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showSecret ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Authorized Profiles Directory (For Pilot Testing & Role Verification) */}
          <div className="bg-slate-50 border-t border-slate-200/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                Authorized Accounts ({activeUsers.length})
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAccounts((prev) => !prev)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {showQuickAccounts ? 'Hide list' : 'Show accounts'}
              </button>
            </div>

            {showQuickAccounts && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {activeUsers.map((u) => {
                  const isSelected =
                    identifier.trim().toLowerCase() ===
                    u.emailOrCode.trim().toLowerCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-300 text-slate-900'
                          : 'bg-white hover:bg-slate-100/80 border-slate-200/90 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-slate-900 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <Monitor className="w-3.5 h-3.5" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            {u.emailOrCode} · PIN: {u.pinOrPassword}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Tech'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        Role-Based Access Control enforced · Administrators manage user accounts
        in Settings
      </footer>
    </div>
  );
};
