import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Cloud,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  RefreshCw,
  LogIn,
  LogOut,
  Lock,
  UserCheck,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Technician } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface PilotLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isCloudSynced: boolean;
  syncError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetCloudData: () => void;
  userRole: 'admin' | 'technician';
  loggedInTechId: string;
  technicians: Technician[];
  onSelectRoleAndUser: (role: 'admin' | 'technician', techId?: string) => void;
}

export const PilotLaunchModal: React.FC<PilotLaunchModalProps> = ({
  isOpen,
  onClose,
  user,
  isCloudSynced,
  syncError,
  onSignIn,
  onSignOut,
  onResetCloudData,
  userRole,
  loggedInTechId,
  technicians,
  onSelectRoleAndUser,
}) => {
  const [copiedTech, setCopiedTech] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const techPilotUrl = `${baseUrl}?role=technician&tech=${loggedInTechId}`;
  const adminPilotUrl = `${baseUrl}?role=admin`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    techPilotUrl
  )}`;

  const handleCopyTech = async () => {
    try {
      await navigator.clipboard.writeText(techPilotUrl);
      setCopiedTech(true);
      setTimeout(() => setCopiedTech(false), 2500);
    } catch {
      setCopiedTech(false);
    }
  };

  const handleCopyAdmin = async () => {
    try {
      await navigator.clipboard.writeText(adminPilotUrl);
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2500);
    } catch {
      setCopiedAdmin(false);
    }
  };

  const selectedTech =
    technicians.find((t) => t.id === loggedInTechId) || technicians[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
              <Lock className="w-3.5 h-3.5" />
              <span>ADMINISTRATION &amp; PLATFORM SETTINGS</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Settings — User Roles, Technician Mobile App &amp; Cloud Sync
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Section 1: Role Switcher Cards (Admin Desktop vs Field Technician) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Role Card A: Operations Administrator (Desktop View) */}
            <div
              className={`border-2 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                userRole === 'admin'
                  ? 'border-slate-900 bg-slate-50/80'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-500 uppercase">
                        ROLE LEVEL 02 · FULL DESKTOP ACCESS
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Operations Administrator
                      </h3>
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-900 text-white rounded-md">
                      ACTIVE SESSION
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Full desktop view for dispatch supervisors, store controllers, and
                  municipal billing managers.
                </p>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs">
                  <div className="font-mono text-[11px] text-slate-500 uppercase">
                    PERMITTED MODULES:
                  </div>
                  <ul className="space-y-1 text-slate-700">
                    <li>• Control Tower & Chain-of-Custody Search</li>
                    <li>• Municipal Work Order Batch Import & Dispatch</li>
                    <li>• Central Store Meter Registration & Stock Audit</li>
                    <li>• Technician Vehicle Stock Issue & Return</li>
                    <li>• Official Job Card Review & Municipal Sign-Off</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRoleAndUser('admin');
                    onClose();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    userRole === 'admin'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {userRole === 'admin'
                      ? 'Continue as Operations Admin (Desktop View)'
                      : 'Switch to Operations Admin (Desktop View)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAdmin}
                  className="w-full py-1.5 px-3 rounded-lg text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedAdmin ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700 font-semibold">
                        Admin Desktop URL Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Admin Desktop Link (?role=admin)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Role Card B: Field Technician (Mobile App View Only) */}
            <div
              className={`border-2 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                userRole === 'technician'
                  ? 'border-blue-600 bg-blue-50/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-blue-700 uppercase">
                        ROLE LEVEL 01 · FIELD SCREEN ONLY
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Field Technician (PrimeChain Field)
                      </h3>
                    </div>
                  </div>
                  {userRole === 'technician' && (
                    <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-blue-600 text-white rounded-md">
                      ACTIVE SESSION
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Restricted strictly to the mobile field screen. Technicians only
                  see their own assigned work orders and meters allocated to their
                  vehicle.
                </p>

                {/* Select which technician account to log in as */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-600 uppercase">
                    SELECT TECHNICIAN ACCOUNT:
                  </label>
                  <select
                    value={loggedInTechId}
                    onChange={(e) =>
                      onSelectRoleAndUser(userRole, e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.employeeCode} · {t.name} ({t.vehicleReg})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 text-xs">
                  <div className="font-mono text-[11px] text-slate-500 uppercase">
                    ENFORCED FIELD RESTRICTIONS:
                  </div>
                  <ul className="space-y-1 text-slate-700">
                    <li>• Only displays PrimeChain Field mobile interface</li>
                    <li>
                      • Only shows jobs dispatched to{' '}
                      <strong>{selectedTech.name}</strong>
                    </li>
                    <li>
                      • Blocks installation of any meter not in{' '}
                      <strong>{selectedTech.vehicleReg}</strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRoleAndUser('technician', loggedInTechId);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    Launch as {selectedTech.name} (Technician Field Screen Only)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTech}
                  className="w-full py-1.5 px-3 rounded-lg text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedTech ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700 font-semibold">
                        Technician Field URL Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>
                        Copy Technician Android Link (?role=technician)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: QR Code for Android Field Phones + Cloud Sync */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-slate-200">
            {/* Android QR Code (5 cols) */}
            <div className="md:col-span-5 border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center gap-4">
              <img
                src={qrImageUrl}
                alt="Scan on Android to open PrimeChain Field"
                className="w-24 h-24 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
              />
              <div className="space-y-1.5 text-xs">
                <div className="font-mono text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>ANDROID FIELD HANDHELD</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Scan with any Android phone to open{' '}
                  <strong>PrimeChain Field</strong> locked to{' '}
                  <strong>{selectedTech.name}</strong>’s account.
                </p>
                <div className="pt-1">
                  <PWAInstallButton />
                </div>
              </div>
            </div>

            {/* Real-Time Cloud Sync between Field Phone & Admin Desktop (7 cols) */}
            <div className="md:col-span-7 border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700">
                    <Cloud className="w-4 h-4" />
                    <span>REAL-TIME CLOUD FIRESTORE SYNC</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When a technician submits an installation on their phone, the
                    Admin Desktop Control Tower and Job Cards update in real time.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold shrink-0 ${
                    isCloudSynced
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isCloudSynced ? '● CLOUD LIVE' : 'LOCAL STORAGE'}
                </span>
              </div>

              {syncError && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {syncError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                {user ? (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>
                      Cloud Auth: <strong>{user.email}</strong>
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    Sign in to sync across multiple physical devices
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {user ? (
                    <>
                      <button
                        type="button"
                        onClick={onResetCloudData}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Pilot Data</span>
                      </button>
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Enable Multi-Device Cloud Sync</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
