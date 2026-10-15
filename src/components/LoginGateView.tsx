import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  KeyRound,
  Monitor,
  Smartphone,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  FileCheck2,
  Truck,
  Database,
  ChevronDown,
  UserCheck,
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
  const [showDemoProfiles, setShowDemoProfiles] = useState(false);

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
      setError('Invalid Access PIN / Password. Please verify and try again.');
      return;
    }

    onAuthenticated(matchedUser);
  };

  const handleSelectDemoUser = (user: PlatformUser) => {
    setIdentifier(user.emailOrCode);
    setPinOrPassword(user.pinOrPassword);
    setError(null);
  };

  const activeUsers = users.filter((u) => u.status === 'Active');
  const adminUsers = activeUsers.filter((u) => u.role === 'admin');
  const techUsers = activeUsers.filter((u) => u.role === 'technician');

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-white/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white leading-none">
                PRIMECHAIN
              </div>
              <div className="text-xs text-slate-400 mt-1 leading-none">
                Municipal Utility Custody & Field Operations
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-medium text-slate-300">City Power Johannesburg</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-400">SDC Randburg</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 sm:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 w-full items-center">
          {/* Left Column: Enterprise Platform Overview */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-medium">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Enterprise Custody Grid · Version 3.4</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.15]">
                Complete audit control for municipal meter operations.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Replaces manual carbon-copy job cards and unverified stock allocations with
                end-to-end serial tracking, mobile photo evidence, and instant commissioning sheets.
              </p>
            </div>

            {/* Core Operational Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Database className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Chain-of-Custody Ledger</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time serial reconciliation from depot intake to technician vehicle custody.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Offline Field Capture</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Technicians capture mandatory old and new meter photos with GPS and custody validation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <FileCheck2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Automated Job Cards</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generates verified 3-page City Power commissioning sheets ready for municipal submission.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Vehicle Stock Enforcement</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prevents unauthorized swaps by locking installations strictly to allocated vehicle inventory.
                </p>
              </div>
            </div>

            {/* Tenant Trust Statement */}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                NRS 049 & SABS Compliant
              </span>
              <span aria-hidden="true">·</span>
              <span>256-Bit Cryptographic Audit Trail</span>
              <span aria-hidden="true">·</span>
              <span>Role-Based Access Control</span>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
              <div className="p-7 sm:p-8 space-y-6">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-blue-700 tracking-wide uppercase">
                    Authorized Access
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    Sign in to your account
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your email address or employee code to open your workspace.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                    <span className="font-semibold shrink-0">Notice:</span>
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
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Access PIN / Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecret((prev) => !prev)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        {showSecret ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Show</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={pinOrPassword}
                        onChange={(e) => setPinOrPassword(e.target.value)}
                        placeholder="Enter your assigned PIN or password"
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Pilot Evaluator / Demo Role Quick Switcher */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowDemoProfiles((prev) => !prev)}
                    className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 font-medium py-1 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pilot Evaluator: Quick Account Selector</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showDemoProfiles ? 'rotate-180 text-blue-600' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {showDemoProfiles && (
                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                        Operations Administrators
                      </div>
                      {adminUsers.map((u) => {
                        const isSelected = identifier.trim().toLowerCase() === u.emailOrCode.trim().toLowerCase();
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectDemoUser(u)}
                            className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-slate-900'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                <Monitor className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {u.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {u.title}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              Auto-Fill
                            </span>
                          </button>
                        );
                      })}

                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pt-1">
                        Field Technicians
                      </div>
                      {techUsers.map((u) => {
                        const isSelected = identifier.trim().toLowerCase() === u.emailOrCode.trim().toLowerCase();
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectDemoUser(u)}
                            className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-slate-900'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-emerald-700 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                <Smartphone className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {u.name}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 truncate">
                                  {u.emailOrCode} · {u.title}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              Auto-Fill
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-7 py-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>Managed Tenant: LightUp Enterprise</span>
                <span className="font-mono text-slate-600">ID: JHB-0926</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PrimeChain Operations · City Power Johannesburg Metering Systems</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Security Protocol: TLS 1.3</span>
            <span aria-hidden="true">·</span>
            <span>AES-256 Audit Storage</span>
            <span aria-hidden="true">·</span>
            <span>Authorized Municipal Personnel Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
