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
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Technician, PlatformUser } from '../types';
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
  adminName?: string;
  adminRoleTitle?: string;
  onUpdateAdminProfile?: (name: string, roleTitle: string) => void;
  platformUsers?: PlatformUser[];
  activeSessionUser?: PlatformUser | null;
  onAddPlatformUser?: (newUser: Omit<PlatformUser, 'id' | 'createdAt'>) => void;
  onToggleUserStatus?: (userId: string) => void;
  onDeletePlatformUser?: (userId: string) => void;
  onSwitchSessionUser?: (targetUser: PlatformUser) => void;
  onLogoutSession?: () => void;
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
  loggedInTechId,
  technicians,
  platformUsers = [],
  activeSessionUser,
  onAddPlatformUser,
  onToggleUserStatus,
  onDeletePlatformUser,
  onSwitchSessionUser,
  onLogoutSession,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'mobile-sync'>('users');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [copiedTech, setCopiedTech] = useState(false);

  // New user creation form state
  const [newName, setNewName] = useState('');
  const [newEmailOrCode, setNewEmailOrCode] = useState('');
  const [newPin, setNewPin] = useState('2026');
  const [newRole, setNewRole] = useState<'admin' | 'technician'>('admin');
  const [newTitle, setNewTitle] = useState('Operations Supervisor');
  const [newTechId, setNewTechId] = useState<string>(
    technicians[0]?.id || 'TECH-01'
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const selectedTech =
    technicians.find((t) => t.id === loggedInTechId) || technicians[0];

  // Build an invite link that encodes the user account so that when opened on any remote Vercel browser/phone,
  // the user account is automatically registered and ready for PIN sign-in.
  const buildUserInviteLink = (u: PlatformUser) => {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify(u)));
      return `${baseUrl}?invite=${encodeURIComponent(
        payload
      )}&login=${encodeURIComponent(u.emailOrCode)}`;
    } catch {
      return `${baseUrl}?login=${encodeURIComponent(u.emailOrCode)}`;
    }
  };

  const handleCopyUserInvite = async (u: PlatformUser) => {
    const inviteUrl = buildUserInviteLink(u);
    const inviteText = `PrimeChain Access Invite for ${u.name} (${
      u.role === 'admin' ? 'Admin Desktop' : 'Field Technician Mobile'
    })\nLogin ID: ${u.emailOrCode}\nAccess PIN: ${
      u.pinOrPassword
    }\nLink: ${inviteUrl}`;
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedUserId(u.id);
      setTimeout(() => setCopiedUserId(null), 2500);
    } catch {
      setCopiedUserId(null);
    }
  };

  const techAccountForSelected =
    platformUsers.find((u) => u.technicianId === selectedTech?.id) ||
    platformUsers.find((u) => u.role === 'technician');

  const techPilotUrl = techAccountForSelected
    ? buildUserInviteLink(techAccountForSelected)
    : `${baseUrl}?role=technician&tech=${loggedInTechId}`;

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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanName = newName.trim();
    const cleanCode = newEmailOrCode.trim();
    const cleanPin = newPin.trim();

    if (!cleanName || !cleanCode || !cleanPin) {
      setFormError(
        'Please enter Full Name, Email / Employee Code, and Access PIN.'
      );
      return;
    }

    const exists = platformUsers.some(
      (u) => u.emailOrCode.toLowerCase() === cleanCode.toLowerCase()
    );
    if (exists) {
      setFormError('A user with this Email or Employee Code already exists.');
      return;
    }

    const assignedTech = technicians.find((t) => t.id === newTechId);
    const computedTitle =
      newRole === 'technician'
        ? `Field Technician · ${assignedTech?.vehicleReg || 'Assigned Van'}`
        : newTitle.trim() || 'Operations Administrator';

    onAddPlatformUser?.({
      name: cleanName,
      emailOrCode: cleanCode,
      pinOrPassword: cleanPin,
      role: newRole,
      title: computedTitle,
      technicianId: newRole === 'technician' ? newTechId : undefined,
      status: 'Active',
    });

    setNewName('');
    setNewEmailOrCode('');
    setNewPin('2026');
    setFormSuccess(
      `User account created for ${cleanName}. Click "Copy Invite" in the table below to send them their login credentials.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl my-8">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
              <Lock className="w-3.5 h-3.5" />
              <span>ADMINISTRATION &amp; CONTROLLED USER ACCESS</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Settings — User Accounts, Access Roles &amp; Device Sync
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activeSessionUser && onLogoutSession && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogoutSession();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({activeSessionUser.name})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Settings */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Access Control ({platformUsers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mobile-sync')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'mobile-sync'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mobile Field App QR &amp; Cloud Sync</span>
            </button>
          </div>

          {activeSessionUser && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Signed in as:</span>
              <span className="font-semibold text-slate-900">
                {activeSessionUser.name}
              </span>
              <span className="font-mono text-slate-600 text-xs">
                ({activeSessionUser.role === 'admin'
                  ? 'Admin Desktop'
                  : 'Field Technician'})
              </span>
            </div>
          )}
        </div>

        {/* ===================================================================
            TAB 1: CONTROLLED USER MANAGEMENT & ACCESS CREDENTIALS
           =================================================================== */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: Add New Controlled User Form */}
              <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/90 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Controlled User Account</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Add New Admin or Field Technician
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Create credentials for anyone you share the Vercel link
                    with. Their account controls their profile name and locks
                    them to their permitted role.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    {formSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Siphiwe Nkosi"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email or Employee Code
                      </label>
                      <input
                        type="text"
                        value={newEmailOrCode}
                        onChange={(e) => setNewEmailOrCode(e.target.value)}
                        placeholder="e.g. siphiwe@lightup.co.za"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Access PIN / Password
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="e.g. 2026"
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Platform Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRole('admin')}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          newRole === 'admin'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Admin (Desktop)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('technician')}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          newRole === 'technician'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Field Tech (Mobile)</span>
                      </button>
                    </div>
                  </div>

                  {newRole === 'admin' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Job Title / Designation
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Dispatch Supervisor or Store Controller"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bind to Technician Vehicle &amp; Crew
                      </label>
                      <select
                        value={newTechId}
                        onChange={(e) => {
                          setNewTechId(e.target.value);
                          const t = technicians.find(
                            (tech) => tech.id === e.target.value
                          );
                          if (t && !newName) {
                            setNewName(t.name);
                            setNewEmailOrCode(t.employeeCode);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.employeeCode} · {t.name} ({t.vehicleReg})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Controlled User Account</span>
                  </button>
                </form>
              </div>

              {/* Right 7 Cols: Controlled Users Directory Table */}
              <div className="lg:col-span-7 border border-slate-200/90 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Authorized User Accounts
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Click &ldquo;Copy Invite&rdquo; to share a user&apos;s
                      credentials and Vercel login link, or &ldquo;Sign In
                      As&rdquo; to switch profile.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-200/80 max-h-[420px] overflow-y-auto">
                  {platformUsers.map((u) => {
                    const isCurrentSession = activeSessionUser?.id === u.id;
                    const isCopied = copiedUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isCurrentSession
                            ? 'bg-blue-50/40'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              u.role === 'admin'
                                ? 'bg-slate-900 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {u.role === 'admin' ? (
                              <Monitor className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span className="text-sm font-semibold text-slate-900">
                                {u.name}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-slate-700">
                                {u.role === 'admin' ? 'Admin Desktop' : 'Field Technician'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-medium ${
                                  u.status === 'Active'
                                    ? 'text-emerald-700'
                                    : 'text-rose-600'
                                }`}
                              >
                                {u.status}
                              </span>
                              {isCurrentSession && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-blue-600">
                                    Current Session
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {u.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 flex items-center gap-3 pt-0.5">
                              <span>
                                Login ID: <strong>{u.emailOrCode}</strong>
                              </span>
                              <span>·</span>
                              <span>
                                PIN: <strong>{u.pinOrPassword}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyUserInvite(u)}
                            title="Copy login credentials and Vercel invite link for this user"
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">
                                  Invite Copied
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Invite</span>
                              </>
                            )}
                          </button>

                          {!isCurrentSession && u.status === 'Active' && (
                            <button
                              type="button"
                              onClick={() => {
                                onSwitchSessionUser?.(u);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Sign In As</span>
                            </button>
                          )}

                          {u.id !== 'USR-ADMIN-01' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onToggleUserStatus?.(u.id)}
                                title={
                                  u.status === 'Active'
                                    ? 'Suspend user access'
                                    : 'Reactivate user access'
                                }
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  u.status === 'Active'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {u.status === 'Active' ? (
                                  <Ban className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePlatformUser?.(u.id)}
                                title="Delete user account"
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: MOBILE FIELD APP QR & REAL-TIME CLOUD SYNC
           =================================================================== */}
        {activeTab === 'mobile-sync' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Android QR Code (5 cols) */}
              <div className="md:col-span-5 border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={qrImageUrl}
                    alt="Scan on Android to open PrimeChain Field"
                    className="w-24 h-24 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                  />
                  <div className="space-y-1.5 text-xs">
                    <div className="font-mono text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Android Field Handheld</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Scan with any mobile phone to open{' '}
                      <strong>PrimeChain Field</strong> for{' '}
                      <strong>{selectedTech.name}</strong>.
                    </p>
                    <div className="pt-1">
                      <PWAInstallButton />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyTech}
                  className="w-full py-2 px-3 rounded-lg text-xs font-mono text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
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
                      <span>Copy Technician Field Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-Time Cloud Sync between Field Phone & Admin Desktop (7 cols) */}
              <div className="md:col-span-7 border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700">
                      <Cloud className="w-4 h-4" />
                      <span>REAL-TIME CLOUD FIRESTORE SYNC</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      When a technician submits an installation on their phone,
                      the Admin Desktop Control Tower and Reports update in real
                      time.
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

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
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
        )}
      </div>
    </div>
  );
};
