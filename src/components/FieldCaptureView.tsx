import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Bell,
  MapPin,
  ArrowLeft,
  Check,
  Camera,
  ListTodo,
  BarChart3,
  User,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Columns,
  Eye,
  Cloud,
  Upload,
  Package,
  LogOut,
  Lock,
} from 'lucide-react';
import {
  Technician,
  WorkOrder,
  MeterDevice,
  JobCardRecord,
} from '../types';
import { DEFAULT_PHOTOS } from '../data/initialData';
import { PWAInstallButton } from './PWAInstallButton';

interface FieldCaptureViewProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  devices: MeterDevice[];
  jobCards?: JobCardRecord[];
  initialHint?: string;
  userRole?: 'admin' | 'technician';
  loggedInTechId?: string;
  onSelectTechId?: (techId: string) => void;
  onSwitchRoleModal?: () => void;
  isAndroidPilotMode?: boolean;
  onExitAndroidPilotMode?: () => void;
  onEnterAndroidPilotMode?: () => void;
  isCloudSynced?: boolean;
  onSubmitInstallation: (payload: {
    technicianId: string;
    workOrderNumber: string;
    newDeviceSerial: string;
    oldDeviceSerialConfirmed: string;
    oldMeterReading: number;
    newMeterReading: number;
    installationStatus:
      | 'Completed'
      | 'Audit Verified'
      | 'Cut-Off Executed'
      | 'Exception';
    gpsCoordinates: string;
    fieldNotes: string;
    photos: {
      oldMeterUrl: string;
      newMeterUrl: string;
      installationSiteUrl: string;
    };
  }) => JobCardRecord;
  onLivePhotoCapture?: (
    workOrderNumber: string,
    which: 'old' | 'new',
    dataUrl: string,
    context?: {
      technicianId?: string;
      newDeviceSerial?: string;
      oldDeviceSerial?: string;
      oldMeterReading?: number;
      newMeterReading?: number;
      fieldNotes?: string;
      gpsCoordinates?: string;
    }
  ) => JobCardRecord | undefined;
  onInspectJobCard: (jobCardId: string) => void;
}

export const FieldCaptureView: React.FC<FieldCaptureViewProps> = ({
  technicians,
  workOrders,
  devices,
  jobCards = [],
  initialHint,
  userRole = 'technician',
  loggedInTechId = 'TECH-01',
  onSelectTechId,
  onSwitchRoleModal,
  isAndroidPilotMode = false,
  onExitAndroidPilotMode,
  isCloudSynced = false,
  onSubmitInstallation,
  onLivePhotoCapture,
  onInspectJobCard,
}) => {
  const isTechnicianOnly = userRole === 'technician' || isAndroidPilotMode;

  const [viewMode, setViewMode] = useState<'storyboard' | 'single'>(
    isTechnicianOnly ? 'single' : 'single'
  );
  // In normal Technician operating mode, start directly on Screen 2 (My Jobs) after login, or Screen 1 if signing in
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(
    isTechnicianOnly ? 2 : 2
  );

  // Technician & Login state
  const [selectedTechId, setSelectedTechId] = useState<string>(loggedInTechId);
  const [passwordInput, setPasswordInput] = useState<string>('•••••••••');

  // Bottom navigation tab state inside the mobile app
  const [phoneTab, setPhoneTab] = useState<'jobs' | 'stock' | 'stats' | 'profile'>('jobs');
  const [jobScopeFilter, setJobScopeFilter] = useState<'mine' | 'all'>('mine');

  // Selected Work Order & Meter state
  const [selectedWONumber, setSelectedWONumber] = useState<string>('WO-2264');
  const [oldSerialInput, setOldSerialInput] = useState<string>('MPT-004482');
  const [oldReadingInput, setOldReadingInput] = useState<string>('4821.3');
  const [newSerialInput, setNewSerialInput] = useState<string>('987654');
  const [newReadingInput, setNewReadingInput] = useState<string>('0.00');
  const [fieldNotesInput, setFieldNotesInput] = useState<string>(
    'New smart meter installed and commissioned. Old meter removed intact.'
  );
  const [oldPhotoCaptured, setOldPhotoCaptured] = useState<boolean>(false);
  const [newPhotoCaptured, setNewPhotoCaptured] = useState<boolean>(false);

  // Custom photos captured via native Android camera (<input type="file" capture="environment">)
  const [customOldPhotoUrl, setCustomOldPhotoUrl] = useState<string | null>(
    null
  );
  const [customNewPhotoUrl, setCustomNewPhotoUrl] = useState<string | null>(
    null
  );
  const oldCameraInputRef = useRef<HTMLInputElement | null>(null);
  const newCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Live Android GPS state
  const [liveGpsCoords, setLiveGpsCoords] = useState<string>(
    '-26.2485° S, 27.8540° E'
  );
  const [gpsStatus, setGpsStatus] = useState<'default' | 'locating' | 'locked'>(
    'default'
  );

  const [showPhotoPreview, setShowPhotoPreview] = useState<
    'old' | 'new' | 'site' | null
  >(null);

  // Guardrail & Submission state
  const [custodyError, setCustodyError] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [lastSubmittedCard, setLastSubmittedCard] =
    useState<JobCardRecord | null>(null);

  useEffect(() => {
    if (loggedInTechId && loggedInTechId !== selectedTechId) {
      setSelectedTechId(loggedInTechId);
    }
  }, [loggedInTechId]);

  useEffect(() => {
    if (isTechnicianOnly) {
      setViewMode('single');
    }
  }, [isTechnicianOnly]);

  const activeTech =
    technicians.find((t) => t.id === selectedTechId) || technicians[0];

  const isNewlyCreatedWO = (w: WorkOrder) => {
    const match = w.workOrderNumber.match(/WO-2026-(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return num > 8846 || w.dateAllocated.includes('Live Dispatch');
  };

  const sortNewestFirst = (list: WorkOrder[]) =>
    [...list].sort((a, b) => {
      const aNew = isNewlyCreatedWO(a) ? 1 : 0;
      const bNew = isNewlyCreatedWO(b) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return b.workOrderNumber.localeCompare(a.workOrderNumber);
    });

  const techWOs = workOrders.filter(
    (w) => w.assignedTechnicianId === activeTech.id
  );
  const outstandingWOs = sortNewestFirst(
    techWOs.filter((w) => w.status === 'Assigned')
  );
  const allActiveWOs = sortNewestFirst(
    workOrders.filter((w) => w.status === 'Assigned' || w.status === 'Received')
  );
  const displayedWOs = jobScopeFilter === 'mine' ? outstandingWOs : allActiveWOs;

  const completedWOs = techWOs.filter(
    (w) => w.status === 'Completed' || w.status === 'Submitted'
  );

  const techAllocatedDevices = devices.filter(
    (d) => d.assignedTechnicianId === activeTech.id && d.status === 'Allocated'
  );

  const activeWO =
    workOrders.find((w) => w.workOrderNumber === selectedWONumber) ||
    outstandingWOs[0] ||
    workOrders[0];

  // Whenever the active Work Order has an existing Job Card with real captured photos (data:image/...), keep them loaded in state
  useEffect(() => {
    if (!activeWO) return;
    const existingJC = jobCards.find(
      (jc) => jc.workOrderNumber === activeWO.workOrderNumber
    );
    if (existingJC) {
      if (
        existingJC.photos.oldMeterUrl?.startsWith('data:') &&
        !customOldPhotoUrl
      ) {
        setCustomOldPhotoUrl(existingJC.photos.oldMeterUrl);
        setOldPhotoCaptured(true);
      }
      if (
        existingJC.photos.newMeterUrl?.startsWith('data:') &&
        !customNewPhotoUrl
      ) {
        setCustomNewPhotoUrl(existingJC.photos.newMeterUrl);
        setNewPhotoCaptured(true);
      }
    }
  }, [activeWO?.workOrderNumber, jobCards]);

  // Acquire real device GPS when available
  const acquireDeviceGps = () => {
    if (!('geolocation' in navigator)) return;
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLiveGpsCoords(`${lat}°, ${lng}° (±${Math.round(pos.coords.accuracy)}m)`);
        setGpsStatus('locked');
      },
      () => {
        setGpsStatus('default');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Compress mobile camera photo via HTML5 Canvas so it stores & syncs reliably across Server, Firestore & LocalStorage
  const compressCameraImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!rawDataUrl) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 720;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.68);
          resolve(compressed);
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });

  // Handle native camera file input change — immediately saves photo to Job Card (Page 2 or Page 3) & syncs to database
  const handleCameraFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    which: 'old' | 'new'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedDataUrl = await compressCameraImage(file);
    if (compressedDataUrl) {
      if (which === 'old') {
        setCustomOldPhotoUrl(compressedDataUrl);
        setOldPhotoCaptured(true);
      } else {
        setCustomNewPhotoUrl(compressedDataUrl);
        setNewPhotoCaptured(true);
      }

      if (activeWO && onLivePhotoCapture) {
        const parsedOldReading =
          parseFloat(oldReadingInput.replace(/\s+/g, '')) ||
          activeWO.existingReading;
        const parsedNewReading =
          parseFloat(newReadingInput.replace(/[^\d.]/g, '')) || 0.0;
        const syncedCard = onLivePhotoCapture(
          activeWO.workOrderNumber,
          which,
          compressedDataUrl,
          {
            technicianId: activeTech.id,
            newDeviceSerial: newSerialInput.trim(),
            oldDeviceSerial: oldSerialInput.trim() || activeWO.oldDeviceSerial,
            oldMeterReading: parsedOldReading,
            newMeterReading: parsedNewReading,
            fieldNotes: fieldNotesInput.trim(),
            gpsCoordinates: liveGpsCoords,
          }
        );
        if (syncedCard) {
          setLastSubmittedCard(syncedCard);
        }
      }
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (!initialHint) return;

    if (initialHint === '987654') {
      setSelectedTechId('TECH-01');
      const wo8841 = workOrders.find(
        (w) => w.workOrderNumber === 'WO-2026-8841' && w.status === 'Assigned'
      );
      const wo2264 = workOrders.find(
        (w) => w.workOrderNumber === 'WO-2264' && w.status === 'Assigned'
      );
      const targetWO = wo2264 || wo8841;
      if (targetWO) {
        setSelectedWONumber(targetWO.workOrderNumber);
        setOldSerialInput(targetWO.oldDeviceSerial);
        setOldReadingInput(String(targetWO.existingReading));
      }
      const hasMet = devices.some(
        (d) => d.serialNumber === 'MET-88421' && d.status === 'Allocated'
      );
      setNewSerialInput(hasMet ? 'MET-88421' : '987654');
      return;
    }

    const matchedDev = devices.find((d) => d.serialNumber === initialHint);
    if (matchedDev) {
      if (matchedDev.assignedTechnicianId) {
        setSelectedTechId(matchedDev.assignedTechnicianId);
      }
      setNewSerialInput(matchedDev.serialNumber);
      return;
    }

    const matchedWO = workOrders.find((w) => w.workOrderNumber === initialHint);
    if (matchedWO) {
      if (matchedWO.assignedTechnicianId) {
        setSelectedTechId(matchedWO.assignedTechnicianId);
      }
      setSelectedWONumber(matchedWO.workOrderNumber);
      setOldSerialInput(matchedWO.oldDeviceSerial);
      setOldReadingInput(String(matchedWO.existingReading));
    }
  }, [initialHint, devices, workOrders]);

  const handleSelectJob = (wo: WorkOrder) => {
    setSelectedWONumber(wo.workOrderNumber);
    setOldSerialInput(wo.oldDeviceSerial);
    setOldReadingInput(String(wo.existingReading));
    setNewReadingInput('0.00');
    const existingJC = jobCards.find(
      (jc) => jc.workOrderNumber === wo.workOrderNumber
    );
    const existingOldPhoto = existingJC?.photos.oldMeterUrl?.startsWith('data:')
      ? existingJC.photos.oldMeterUrl
      : null;
    const existingNewPhoto = existingJC?.photos.newMeterUrl?.startsWith('data:')
      ? existingJC.photos.newMeterUrl
      : null;
    setCustomOldPhotoUrl(existingOldPhoto);
    setCustomNewPhotoUrl(existingNewPhoto);
    setOldPhotoCaptured(Boolean(existingOldPhoto));
    setNewPhotoCaptured(Boolean(existingNewPhoto));
    if (techAllocatedDevices[0]) {
      setNewSerialInput(techAllocatedDevices[0].serialNumber);
    }
    setFieldNotesInput(
      `New meter installed and commissioned. Old ${wo.oldDeviceMake} meter (#${wo.oldDeviceSerial}) removed.`
    );
    setCustodyError(null);
    setActiveStep(3);
  };

  const handleTechSwitch = (techId: string) => {
    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return;
    setSelectedTechId(tech.id);
    if (onSelectTechId) {
      onSelectTechId(tech.id);
    }
    setCustodyError(null);

    const firstOpen = workOrders.find(
      (w) => w.assignedTechnicianId === tech.id && w.status === 'Assigned'
    );
    if (firstOpen) {
      setSelectedWONumber(firstOpen.workOrderNumber);
      setOldSerialInput(firstOpen.oldDeviceSerial);
      setOldReadingInput(String(firstOpen.existingReading));
    }
    const firstDev = devices.find(
      (d) => d.assignedTechnicianId === tech.id && d.status === 'Allocated'
    );
    if (firstDev) {
      setNewSerialInput(firstDev.serialNumber);
    }
  };

  const handleCaptureSubmit = () => {
    if (!activeWO) return;

    const cleanSerial = newSerialInput.trim();
    const targetDevice =
      devices.find(
        (d) => d.serialNumber.toLowerCase() === cleanSerial.toLowerCase()
      ) || techAllocatedDevices[0];

    if (!targetDevice) {
      setCustodyError(
        `Serial "${cleanSerial}" is not registered in PrimeChain Stock Control.`
      );
      return;
    }

    const isAlreadyInstalledOnThisJob =
      targetDevice.status === 'Installed' &&
      (targetDevice.installedWorkOrderNumber === activeWO.workOrderNumber ||
        targetDevice.assignedTechnicianId === activeTech.id);

    if (
      (targetDevice.status !== 'Allocated' && !isAlreadyInstalledOnThisJob) ||
      targetDevice.assignedTechnicianId !== activeTech.id
    ) {
      const holderInfo =
        targetDevice.status === 'Available'
          ? 'in Central Store (Unallocated)'
          : targetDevice.status === 'Installed'
          ? `already installed on ${targetDevice.installedWorkOrderNumber}`
          : `allocated to ${targetDevice.assignedTechnicianName}`;
      setCustodyError(
        `Custody Restriction: ${targetDevice.serialNumber} is ${holderInfo}. ${
          activeTech.name.split(' ')[0]
        } is only authorised to install meters allocated to ${activeTech.vehicleReg}.`
      );
      return;
    }

    setCustodyError(null);

    const parsedOldReading =
      parseFloat(oldReadingInput.replace(/\s+/g, '')) ||
      activeWO.existingReading;
    const parsedNewReading =
      parseFloat(newReadingInput.replace(/[^\d.]/g, '')) || 0.0;
    const confirmedOldSerial =
      oldSerialInput.trim() || activeWO.oldDeviceSerial;

    const existingJC = jobCards.find(
      (jc) => jc.workOrderNumber === activeWO.workOrderNumber
    );
    const resolvedOldPhoto =
      customOldPhotoUrl ||
      (existingJC?.photos.oldMeterUrl?.startsWith('data:')
        ? existingJC.photos.oldMeterUrl
        : DEFAULT_PHOTOS.oldMeterUrl);
    const resolvedNewPhoto =
      customNewPhotoUrl ||
      (existingJC?.photos.newMeterUrl?.startsWith('data:')
        ? existingJC.photos.newMeterUrl
        : DEFAULT_PHOTOS.newMeterUrl);

    const generated = onSubmitInstallation({
      technicianId: activeTech.id,
      workOrderNumber: activeWO.workOrderNumber,
      newDeviceSerial: targetDevice.serialNumber,
      oldDeviceSerialConfirmed: confirmedOldSerial,
      oldMeterReading: parsedOldReading,
      newMeterReading: parsedNewReading,
      installationStatus: 'Completed',
      gpsCoordinates: liveGpsCoords,
      fieldNotes:
        fieldNotesInput.trim() ||
        `New ${targetDevice.model} (#${targetDevice.serialNumber}) installed. Old ${activeWO.oldDeviceMake} (#${confirmedOldSerial}) removed at ${parsedOldReading} kWh.`,
      photos: {
        oldMeterUrl: resolvedOldPhoto,
        newMeterUrl: resolvedNewPhoto,
        installationSiteUrl:
          customNewPhotoUrl ||
          customOldPhotoUrl ||
          existingJC?.photos.installationSiteUrl ||
          DEFAULT_PHOTOS.installationSiteUrl,
      },
    });

    setLastSubmittedCard(generated);
    setPdfGenerating(true);
    setActiveStep(5);
    setTimeout(() => {
      setPdfGenerating(false);
    }, 600);
  };

  const nextJobInQueue =
    outstandingWOs.find((w) => w.workOrderNumber !== activeWO?.workOrderNumber) ||
    outstandingWOs[0];

  const currentCaptureStepCount = newPhotoCaptured ? 3 : 2;

  return (
    <div className="space-y-5">
      {/* Hidden Native Android Camera File Inputs */}
      <input
        ref={oldCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleCameraFileChange(e, 'old')}
        className="hidden"
      />
      <input
        ref={newCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleCameraFileChange(e, 'new')}
        className="hidden"
      />

      {/* When in Admin Mode, show a clean supervisor toolbar above the mobile simulator */}
      {!isTechnicianOnly && (
        <section className="border border-slate-200 bg-white rounded-md p-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Field Operations Console</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-emerald-700 font-medium flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>
                    {isCloudSynced ? 'Firestore Live Sync' : 'Offline-Ready PWA'}
                  </span>
                </span>
              </div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
                PrimeChain Field — Handheld Point-of-Work Terminal
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTechId}
                onChange={(e) => handleTechSwitch(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-slate-50 text-slate-900"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.employeeCode} · {t.name} ({t.vehicleReg})
                  </option>
                ))}
              </select>

              {/* View Mode Switcher for Admin inspection */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('single')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === 'single'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Handheld Terminal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('storyboard')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === 'storyboard'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Workflow Screens</span>
                </button>
              </div>

              {onSwitchRoleModal && (
                <button
                  type="button"
                  onClick={onSwitchRoleModal}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Switch Role</span>
                </button>
              )}
            </div>
          </div>

          {/* Custody & Hardware Bar */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 flex-wrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                <strong className="text-slate-900">
                  Authorised Vehicle Stock ({activeTech.vehicleReg}):
                </strong>{' '}
                <span className="font-mono">
                  {techAllocatedDevices.length > 0
                    ? techAllocatedDevices.map((d) => d.serialNumber).join(' · ')
                    : '0 units held'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={acquireDeviceGps}
                className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded font-mono hover:bg-slate-200 flex items-center gap-1 cursor-pointer text-[11px]"
              >
                <MapPin className="w-3 h-3 text-blue-700" />
                <span>
                  {gpsStatus === 'locating'
                    ? 'Locating GPS...'
                    : gpsStatus === 'locked'
                    ? `GPS: ${liveGpsCoords}`
                    : 'Acquire GPS'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewSerialInput('987659');
                  setCustodyError(
                    'Custody Restriction: Meter 987659 is in Central Store (Unallocated). Technicians can only install devices allocated to their vehicle.'
                  );
                  setActiveStep(4);
                }}
                className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded font-mono hover:bg-red-100 cursor-pointer whitespace-nowrap text-[11px]"
              >
                Test Custody Lock (#987659)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Photo Inspection Lightbox Modal */}
      {showPhotoPreview && (
        <div className="max-w-[420px] mx-auto border border-neutral-700 bg-[#1E1E1E] text-white p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={
                showPhotoPreview === 'old'
                  ? customOldPhotoUrl || DEFAULT_PHOTOS.oldMeterUrl
                  : showPhotoPreview === 'new'
                  ? customNewPhotoUrl || DEFAULT_PHOTOS.newMeterUrl
                  : DEFAULT_PHOTOS.installationSiteUrl
              }
              alt="Captured field meter evidence"
              referrerPolicy="no-referrer"
              className="w-24 h-20 object-cover rounded-lg border border-neutral-600 shrink-0"
            />
            <div className="space-y-1 text-xs">
              <div className="font-mono text-emerald-400">
                ✓ FIELD EVIDENCE VERIFIED
              </div>
              <div className="text-sm font-semibold">
                {showPhotoPreview === 'old'
                  ? `Old Meter (${activeWO?.oldDeviceMake}) · ${oldReadingInput} kWh`
                  : `New Meter (${newSerialInput}) · 0.00 kWh`}
              </div>
              <div className="text-neutral-400 font-mono text-[11px]">
                GPS: {liveGpsCoords}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => {
                if (showPhotoPreview === 'old') {
                  oldCameraInputRef.current?.click();
                } else {
                  newCameraInputRef.current?.click();
                }
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Retake with Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPhotoPreview(null)}
              className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-600 cursor-pointer whitespace-nowrap"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          PRIMECHAIN FIELD MOBILE APPLICATION WORKSPACE
         ===================================================================== */}
      <section
        className={
          isTechnicianOnly
            ? 'flex flex-col items-center justify-start py-2 sm:py-4'
            : 'bg-[#14171F] border border-[#262B38] rounded-2xl p-4 sm:p-7 overflow-x-auto'
        }
      >
        <div
          className={
            viewMode === 'storyboard' && !isTechnicianOnly
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 min-w-[320px]'
              : 'flex justify-center w-full'
          }
        >
          {/* ===============================================================
              SCREEN 1 · PRIMECHAIN FIELD LOGIN
             =============================================================== */}
          {(viewMode === 'storyboard' || activeStep === 1) && (
            <div
              className={`flex flex-col items-center w-full ${
                isTechnicianOnly
                  ? 'max-w-[400px]'
                  : 'max-w-[340px] xl:max-w-[280px]'
              } mx-auto`}
            >
              {!isTechnicianOnly && (
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={`mb-3 text-xs tracking-[0.14em] font-mono uppercase cursor-pointer transition-colors ${
                    activeStep === 1
                      ? 'text-white font-semibold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  1 · SIGN IN
                </button>
              )}

              <div
                className={`w-full ${
                  isTechnicianOnly ? 'min-h-[640px]' : 'h-[580px]'
                } bg-[#1C1F26] rounded-[32px] border-2 transition-colors flex flex-col justify-between p-6 text-[#E5E5E5] shadow-2xl ${
                  activeStep === 1 ? 'border-[#3B82F6]/60' : 'border-[#2E3440]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#9E9E9E] pb-3 border-b border-[#2E3440]">
                    <span className="font-mono text-[11px] text-[#94A3B8]">
                      PRIMECHAIN FIELD
                    </span>
                    <span className="font-mono text-[12px] text-[#CBD5E1]">
                      08:14
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="pt-9 pb-7 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A] border border-blue-500/30 flex items-center justify-center mb-4">
                      <Shield className="w-7 h-7 text-[#60A5FA]" />
                    </div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">
                      PrimeChain Field
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Technician Mobile Terminal
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1.5">
                        Technician Employee ID
                      </label>
                      <select
                        value={selectedTechId}
                        onChange={(e) => handleTechSwitch(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#13161C] border border-[#2E3440] text-sm font-mono text-white focus:outline-none focus:border-[#3B82F6]"
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.employeeCode} · {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1.5">
                        PIN / Password
                      </label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#13161C] border border-[#2E3440] text-sm text-[#CBD5E1] tracking-widest focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneTab('jobs');
                          setActiveStep(2);
                        }}
                        className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors cursor-pointer"
                      >
                        Sign in to Shift
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center pb-2 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#13161C] border border-[#2E3440] text-[11px] font-mono text-[#94A3B8]">
                    <Lock className="w-3 h-3 text-blue-400" />
                    <span>Role: Field Technician (Assigned Stock Only)</span>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Offline-first storage · Auto-syncs to PrimeChain Cloud
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SCREEN 2 · MY JOBS / MY STOCK / STATS / PROFILE
             =============================================================== */}
          {(viewMode === 'storyboard' || activeStep === 2) && (
            <div
              className={`flex flex-col items-center w-full ${
                isTechnicianOnly
                  ? 'max-w-[400px]'
                  : 'max-w-[340px] xl:max-w-[280px]'
              } mx-auto`}
            >
              {!isTechnicianOnly && (
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className={`mb-3 text-xs tracking-[0.14em] font-mono uppercase cursor-pointer transition-colors ${
                    activeStep === 2
                      ? 'text-white font-semibold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  2 · MY JOBS
                </button>
              )}

              <div
                className={`w-full ${
                  isTechnicianOnly ? 'min-h-[640px]' : 'h-[580px]'
                } bg-[#1C1F26] rounded-[32px] border-2 transition-colors flex flex-col justify-between p-5 text-[#E5E5E5] shadow-2xl ${
                  activeStep === 2 ? 'border-[#3B82F6]/60' : 'border-[#2E3440]'
                }`}
              >
                {/* Mobile Status & Brand Bar */}
                <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-3 border-b border-[#2E3440] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
                    <span className="font-semibold text-white tracking-tight">
                      PrimeChain
                    </span>
                    <span className="font-mono text-[10px] text-[#60A5FA] bg-[#1E3A8A]/50 px-1.5 py-0.5 rounded">
                      FIELD
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[#CBD5E1]">{activeTech.employeeCode}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Synced" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-0.5">
                  {phoneTab === 'jobs' && (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-white">
                            Good morning, {activeTech.name.split(' ')[0]}
                          </h2>
                          <p className="text-xs text-[#94A3B8]">
                            {activeTech.region} · Vehicle {activeTech.vehicleReg}
                          </p>
                        </div>
                        <Bell className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 pt-1 pb-3 border-b border-[#2E3440]">
                        <div className="bg-[#13161C] border border-[#2E3440] rounded-xl p-2.5">
                          <div className="text-xl font-semibold font-mono tabular-nums text-[#FACC15]">
                            {outstandingWOs.length}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Pending
                          </div>
                        </div>
                        <div className="bg-[#13161C] border border-[#2E3440] rounded-xl p-2.5">
                          <div className="text-xl font-semibold font-mono tabular-nums text-[#4ADE80]">
                            {completedWOs.length}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Done Today
                          </div>
                        </div>
                        <div className="bg-[#13161C] border border-[#2E3440] rounded-xl p-2.5">
                          <div className="text-xl font-semibold font-mono tabular-nums text-[#60A5FA]">
                            {techAllocatedDevices.length}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Van Stock
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex rounded-lg bg-[#13161C] border border-[#2E3440] p-0.5 text-[11px] font-mono">
                            <button
                              type="button"
                              onClick={() => setJobScopeFilter('mine')}
                              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                                jobScopeFilter === 'mine'
                                  ? 'bg-[#2563EB] text-white font-semibold'
                                  : 'text-[#94A3B8] hover:text-white'
                              }`}
                            >
                              My Queue ({outstandingWOs.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setJobScopeFilter('all')}
                              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                                jobScopeFilter === 'all'
                                  ? 'bg-[#2563EB] text-white font-semibold'
                                  : 'text-[#94A3B8] hover:text-white'
                              }`}
                            >
                              All Active ({allActiveWOs.length})
                            </button>
                          </div>
                          <span className="text-[10px] font-mono tracking-wider text-[#94A3B8] uppercase">
                            TAP TO START
                          </span>
                        </div>

                        {displayedWOs.map((wo) => {
                          const isCurrent =
                            activeWO?.workOrderNumber === wo.workOrderNumber;
                          const isNew = isNewlyCreatedWO(wo);
                          const timeSlot = wo.dateAllocated.includes('·')
                            ? wo.dateAllocated.split('·')[1].trim()
                            : '08:30 – 10:00';

                          return (
                            <button
                              key={wo.workOrderNumber}
                              type="button"
                              onClick={() => {
                                if (
                                  wo.assignedTechnicianId &&
                                  wo.assignedTechnicianId !== activeTech.id
                                ) {
                                  handleTechSwitch(wo.assignedTechnicianId);
                                }
                                handleSelectJob(wo);
                              }}
                              className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                                isCurrent
                                  ? 'bg-[#232936] border-[#3B82F6]'
                                  : isNew
                                  ? 'bg-[#172334] border-emerald-500/60 hover:border-emerald-400'
                                  : 'bg-[#161920] border-[#2E3440] hover:border-[#475569]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isNew && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                      NEW
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold text-white truncate">
                                    {wo.customerName}
                                  </span>
                                </div>
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                                    wo.workType === 'Audit'
                                      ? 'bg-[#3D2E0A] text-[#FACC15]'
                                      : 'bg-[#1E3A8A] text-[#93C5FD]'
                                  }`}
                                >
                                  {wo.workType}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                                <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                <span className="truncate">
                                  {wo.address}, {wo.suburb}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] pt-1">
                                <span className="text-[#93C5FD]">
                                  {wo.workOrderNumber}
                                </span>
                                <span className="text-[#CBD5E1] truncate max-w-[170px]">
                                  {jobScopeFilter === 'all' &&
                                  wo.assignedTechnicianName
                                    ? `${wo.assignedTechnicianName} · ${timeSlot}`
                                    : timeSlot}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div className="text-[11px] font-mono tracking-wider text-[#94A3B8] uppercase">
                          COMPLETED TODAY ({completedWOs.length})
                        </div>

                        {completedWOs.map((wo) => (
                          <div
                            key={wo.workOrderNumber}
                            className="w-full text-left p-3 rounded-xl bg-[#161920] border border-[#2E3440] space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-[#CBD5E1] truncate">
                                {wo.customerName}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#143321] text-[#4ADE80] shrink-0">
                                Synced ✓
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-[#64748B]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{wo.address}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                              <span className="text-[#64748B]">
                                {wo.workOrderNumber} · Meter #{wo.installedDeviceSerial}
                              </span>
                              <span className="text-[#4ADE80]">
                                {wo.completedDate?.startsWith('Submitted')
                                  ? wo.completedDate
                                  : 'Submitted'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {phoneTab === 'stock' && (
                    <div className="space-y-3 py-1">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          My Allocated Vehicle Stock
                        </h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Meters signed out to {activeTech.name} ({activeTech.vehicleReg}). You can only install serials listed below.
                        </p>
                      </div>

                      {techAllocatedDevices.length > 0 ? (
                        <div className="space-y-2">
                          {techAllocatedDevices.map((d) => (
                            <div
                              key={d.serialNumber}
                              className="p-3 rounded-xl bg-[#13161C] border border-[#2E3440] space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-sm font-semibold text-[#60A5FA]">
                                  #{d.serialNumber}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                                  IN VEHICLE CUSTODY
                                </span>
                              </div>
                              <div className="text-xs text-white font-medium">
                                {d.manufacturer} {d.model}
                              </div>
                              <div className="text-[11px] font-mono text-[#64748B]">
                                Seal: {d.sealNumber} · Issued {d.dateIssued}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#13161C] border border-[#2E3440] text-xs text-[#94A3B8] text-center">
                          No allocated meters remaining in vehicle. Return to depot for stock issue.
                        </div>
                      )}
                    </div>
                  )}

                  {phoneTab === 'stats' && (
                    <div className="space-y-4 py-1">
                      <h3 className="text-sm font-semibold text-white">
                        Shift Performance · {activeTech.name.split(' ')[0]}
                      </h3>
                      <div className="p-4 rounded-xl bg-[#13161C] border border-[#2E3440] space-y-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Daily Target</span>
                          <span className="font-mono font-semibold text-white">
                            {activeTech.dailyTarget} installations
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Completed Today</span>
                          <span className="font-mono font-semibold text-[#4ADE80]">
                            {completedWOs.length} installations
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Remaining Queue</span>
                          <span className="font-mono font-semibold text-[#FACC15]">
                            {outstandingWOs.length} jobs
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#2E3440]">
                          <span className="text-[#94A3B8]">PrimeChain Sync</span>
                          <span className="font-mono text-[#60A5FA]">
                            {isCloudSynced ? 'Live Cloud Connected' : 'Local + Offline Ready'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {phoneTab === 'profile' && (
                    <div className="space-y-4 py-1">
                      <h3 className="text-sm font-semibold text-white">
                        Technician Identity & Access Rights
                      </h3>
                      <div className="p-4 rounded-xl bg-[#13161C] border border-[#2E3440] space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Technician</span>
                          <span className="font-semibold text-white">
                            {activeTech.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Employee Code</span>
                          <span className="font-mono text-white">
                            {activeTech.employeeCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Assigned Vehicle</span>
                          <span className="font-mono text-white">
                            {activeTech.vehicleReg}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Access Level</span>
                          <span className="font-mono text-blue-400">
                            Field Technician (Mobile Only)
                          </span>
                        </div>
                        <div className="pt-2.5 border-t border-[#2E3440] text-[11px] text-[#94A3B8] leading-relaxed">
                          Your account is restricted to assigned work orders and meters allocated to {activeTech.vehicleReg}. Desktop administration modules are disabled for field accounts.
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <PWAInstallButton />
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#262B38] hover:bg-[#32394A] text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out of Technician Terminal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Bar */}
                <div className="pt-2.5 border-t border-[#2E3440] grid grid-cols-4 text-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setPhoneTab('jobs')}
                    className={`flex flex-col items-center gap-1 text-[11px] cursor-pointer ${
                      phoneTab === 'jobs' ? 'text-[#60A5FA] font-medium' : 'text-[#8A8A8A]'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>My Jobs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneTab('stock')}
                    className={`flex flex-col items-center gap-1 text-[11px] cursor-pointer ${
                      phoneTab === 'stock' ? 'text-[#60A5FA] font-medium' : 'text-[#8A8A8A]'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>My Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneTab('stats')}
                    className={`flex flex-col items-center gap-1 text-[11px] cursor-pointer ${
                      phoneTab === 'stats' ? 'text-[#60A5FA] font-medium' : 'text-[#8A8A8A]'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneTab('profile')}
                    className={`flex flex-col items-center gap-1 text-[11px] cursor-pointer ${
                      phoneTab === 'profile'
                        ? 'text-[#60A5FA] font-medium'
                        : 'text-[#8A8A8A]'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SCREEN 3 · JOB DETAIL
             =============================================================== */}
          {(viewMode === 'storyboard' || activeStep === 3) && (
            <div
              className={`flex flex-col items-center w-full ${
                isTechnicianOnly
                  ? 'max-w-[400px]'
                  : 'max-w-[340px] xl:max-w-[280px]'
              } mx-auto`}
            >
              {!isTechnicianOnly && (
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className={`mb-3 text-xs tracking-[0.14em] font-mono uppercase cursor-pointer transition-colors ${
                    activeStep === 3
                      ? 'text-white font-semibold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  3 · JOB DETAIL
                </button>
              )}

              <div
                className={`w-full ${
                  isTechnicianOnly ? 'min-h-[640px]' : 'h-[580px]'
                } bg-[#1C1F26] rounded-[32px] border-2 transition-colors flex flex-col justify-between p-5 text-[#E5E5E5] shadow-2xl ${
                  activeStep === 3 ? 'border-[#3B82F6]/60' : 'border-[#2E3440]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-3 border-b border-[#2E3440]">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
                      <span className="font-semibold text-white">PrimeChain</span>
                    </div>
                    <span className="font-mono text-[12px] text-[#CBD5E1]">
                      08:27
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="py-3.5 border-b border-[#2E3440] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="flex items-center gap-1.5 text-base font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-[#94A3B8]" />
                        <span>{activeWO?.workOrderNumber || 'WO-2264'}</span>
                      </button>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#1E3A8A] text-[#93C5FD]">
                        {activeWO?.workType || 'Installation'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Dispatched by PrimeChain Control · Read-only instruction
                    </p>
                  </div>

                  <div className="divide-y divide-[#2E3440] text-xs">
                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Customer</span>
                      <span className="font-semibold text-white text-right">
                        {activeWO?.customerName || 'Thabo Molefe'}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Site Address</span>
                      <span className="font-semibold text-white text-right">
                        {activeWO?.address || '14 Elm St, Soweto'}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Meter Point / Acc</span>
                      <span className="font-mono font-semibold text-white text-right">
                        {activeWO?.accountNumber || 'MPT-004482'}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Existing Device</span>
                      <span className="font-semibold text-white text-right">
                        {activeWO?.oldDeviceMake || 'Landis+Gyr E110'}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Municipality Ref.</span>
                      <span className="font-mono font-semibold text-white text-right">
                        {activeWO?.municipalBatchId || 'JHB-2026-0441'}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#94A3B8]">Scheduled Slot</span>
                      <span className="font-semibold text-white text-right">
                        17 Sep · 08:30
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-[#3D2E0A] border border-[#5C4510] text-xs text-[#FBBF24] leading-relaxed">
                    ⚠ Safety & Verification: Confirm existing meter serial and closing reading before disconnection.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      acquireDeviceGps();
                      setActiveStep(4);
                    }}
                    className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    Start Installation Capture
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SCREEN 4 · POINT-OF-WORK CAPTURE
             =============================================================== */}
          {(viewMode === 'storyboard' || activeStep === 4) && (
            <div
              className={`flex flex-col items-center w-full ${
                isTechnicianOnly
                  ? 'max-w-[400px]'
                  : 'max-w-[340px] xl:max-w-[280px]'
              } mx-auto`}
            >
              {!isTechnicianOnly && (
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className={`mb-3 text-xs tracking-[0.14em] font-mono uppercase cursor-pointer transition-colors ${
                    activeStep === 4
                      ? 'text-white font-semibold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  4 · CAPTURE
                </button>
              )}

              <div
                className={`w-full ${
                  isTechnicianOnly ? 'min-h-[640px]' : 'h-[580px]'
                } bg-[#1C1F26] rounded-[32px] border-2 transition-colors flex flex-col justify-between p-5 text-[#E5E5E5] shadow-2xl ${
                  activeStep === 4 ? 'border-[#3B82F6]/60' : 'border-[#2E3440]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-3 border-b border-[#2E3440] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
                    <span className="font-semibold text-white">PrimeChain</span>
                  </div>
                  <span className="font-mono text-[12px] text-[#CBD5E1]">
                    09:04
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="flex-1 overflow-y-auto py-2.5 space-y-3 pr-0.5">
                  <div className="space-y-2 pb-2 border-b border-[#2E3440]">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white cursor-pointer hover:text-blue-400"
                      >
                        <ArrowLeft className="w-4 h-4 text-[#94A3B8]" />
                        <span>
                          Capture — {activeWO?.workOrderNumber || 'WO-2264'}
                        </span>
                      </button>
                      <span className="font-mono text-[10px] text-[#94A3B8]">
                        {liveGpsCoords.split('(')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          customOldPhotoUrl || oldPhotoCaptured
                            ? 'bg-[#4ADE80]'
                            : 'bg-[#3B82F6]'
                        }`}
                      />
                      <div className="h-1.5 rounded-full bg-[#4ADE80]" />
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          customNewPhotoUrl || newPhotoCaptured
                            ? 'bg-[#4ADE80]'
                            : 'bg-[#2E3440]'
                        }`}
                      />
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      {customOldPhotoUrl && customNewPhotoUrl
                        ? '✓ Both real camera photos attached & ready'
                        : 'Capture old & new meter photos with camera'}
                    </div>
                  </div>

                  {/* Old meter serial & closing reading */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">
                        Old meter serial
                      </label>
                      <input
                        type="text"
                        value={oldSerialInput}
                        onChange={(e) => setOldSerialInput(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#13161C] border border-[#2E3440] text-xs font-mono text-white focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">
                        Old reading (kWh)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={oldReadingInput}
                        onChange={(e) => setOldReadingInput(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#13161C] border border-[#2E3440] text-xs font-mono text-white focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>

                  {/* Old meter photo */}
                  <div className="pb-2 border-b border-[#2E3440]">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>1. Old meter photo (Page 2 of PDF)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => oldCameraInputRef.current?.click()}
                          className="text-[#60A5FA] hover:underline cursor-pointer font-medium"
                        >
                          {customOldPhotoUrl ? 'Retake' : 'Open Camera'}
                        </button>
                        {customOldPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPhotoPreview(
                                showPhotoPreview === 'old' ? null : 'old'
                              )
                            }
                            className="text-[#94A3B8] hover:text-white flex items-center gap-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Zoom</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {customOldPhotoUrl ? (
                      <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#143321] border border-[#2E6230]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={customOldPhotoUrl}
                            alt="Captured old meter"
                            className="w-12 h-10 object-cover rounded border border-emerald-500/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#4ADE80] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Old meter photo saved</span>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-200/80">
                               Attached to Job Card Page 2
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => oldCameraInputRef.current?.click()}
                          className="px-2 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[10px] font-mono text-white shrink-0 cursor-pointer"
                        >
                          Retake
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => oldCameraInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#13161C] border border-dashed border-[#475569] hover:border-[#60A5FA] text-xs text-[#CBD5E1] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Tap to photograph old meter</span>
                      </button>
                    )}
                  </div>

                  {/* New meter serial number (with quick selector from technician's vehicle custody) */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>New meter serial number</span>
                      <span className="font-mono text-[10px] text-[#60A5FA]">
                        Vehicle {activeTech.vehicleReg} Stock
                      </span>
                    </div>
                    <input
                      type="text"
                      value={newSerialInput}
                      onChange={(e) => {
                        setNewSerialInput(e.target.value);
                        setCustodyError(null);
                      }}
                      className={`w-full px-3 py-2 rounded-xl bg-[#13161C] border text-sm font-mono text-white focus:outline-none ${
                        custodyError
                          ? 'border-red-500'
                          : 'border-[#2E3440] focus:border-[#3B82F6]'
                      }`}
                    />
                    {techAllocatedDevices.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[10px] text-[#64748B]">
                          Allocated to you:
                        </span>
                        {techAllocatedDevices.map((dev) => (
                          <button
                            key={dev.serialNumber}
                            type="button"
                            onClick={() => {
                              setNewSerialInput(dev.serialNumber);
                              setCustodyError(null);
                            }}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer ${
                              newSerialInput === dev.serialNumber
                                ? 'bg-blue-950 border-blue-500 text-blue-300 font-semibold'
                                : 'bg-[#13161C] border-[#2E3440] text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            {dev.serialNumber}
                          </button>
                        ))}
                      </div>
                    )}
                    {custodyError && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-red-950/90 border border-red-700 text-[11px] text-red-200 flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{custodyError}</span>
                      </div>
                    )}
                  </div>

                  {/* New meter reading */}
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                      New meter opening reading (kWh)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newReadingInput}
                      onChange={(e) => setNewReadingInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13161C] border border-[#2E3440] text-xs font-mono text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>

                  {/* New meter photo */}
                  <div className="pb-2 border-b border-[#2E3440]">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>2. New meter photo (Page 3 of PDF)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => newCameraInputRef.current?.click()}
                          className="text-[#60A5FA] hover:underline cursor-pointer font-medium"
                        >
                          {customNewPhotoUrl ? 'Retake' : 'Open Camera'}
                        </button>
                        {customNewPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPhotoPreview(
                                showPhotoPreview === 'new' ? null : 'new'
                              )
                            }
                            className="text-[#94A3B8] hover:text-white flex items-center gap-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Zoom</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {customNewPhotoUrl ? (
                      <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#143321] border border-[#2E6230]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={customNewPhotoUrl}
                            alt="Captured new meter"
                            className="w-12 h-10 object-cover rounded border border-emerald-500/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#4ADE80] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">New meter photo saved</span>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-200/80">
                              Attached to Job Card Page 3
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => newCameraInputRef.current?.click()}
                          className="px-2 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[10px] font-mono text-white shrink-0 cursor-pointer"
                        >
                          Retake
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => newCameraInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#13161C] border border-dashed border-[#475569] hover:border-[#60A5FA] text-xs text-[#CBD5E1] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Tap to photograph new meter</span>
                      </button>
                    )}
                  </div>

                  {/* Field Notes / Commissioning Sheet Comment */}
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                      Installer Comment (prints on Commissioning Sheet)
                    </label>
                    <input
                      type="text"
                      value={fieldNotesInput}
                      onChange={(e) => setFieldNotesInput(e.target.value)}
                      placeholder="e.g. New 1ph smart meter installed. Old meter removed."
                      className="w-full px-3 py-2 rounded-xl bg-[#13161C] border border-[#2E3440] text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="pt-2 shrink-0 space-y-1.5">
                  <button
                    type="button"
                    onClick={handleCaptureSubmit}
                    className="w-full py-3 px-3 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors cursor-pointer leading-snug"
                  >
                    Submit Installation & Save to Database
                  </button>
                  {(customOldPhotoUrl || customNewPhotoUrl) && !isTechnicianOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const existingJC =
                          lastSubmittedCard ||
                          jobCards.find(
                            (jc) =>
                              jc.workOrderNumber === activeWO?.workOrderNumber
                          );
                        if (existingJC) {
                          if (onExitAndroidPilotMode) {
                            onExitAndroidPilotMode();
                          }
                          onInspectJobCard(existingJC.jobCardId);
                        } else {
                          handleCaptureSubmit();
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl text-[11px] font-semibold bg-[#143321] hover:bg-[#1B432C] border border-[#2E6230] text-[#4ADE80] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Job Card PDF (Pages 2 & 3 Live Photos)</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SCREEN 5 · CONFIRMED
             =============================================================== */}
          {(viewMode === 'storyboard' || activeStep === 5) && (
            <div
              className={`flex flex-col items-center w-full ${
                isTechnicianOnly
                  ? 'max-w-[400px]'
                  : 'max-w-[340px] xl:max-w-[280px]'
              } mx-auto`}
            >
              {!isTechnicianOnly && (
                <button
                  type="button"
                  onClick={() => setActiveStep(5)}
                  className={`mb-3 text-xs tracking-[0.14em] font-mono uppercase cursor-pointer transition-colors ${
                    activeStep === 5
                      ? 'text-white font-semibold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  5 · CONFIRMED
                </button>
              )}

              <div
                className={`w-full ${
                  isTechnicianOnly ? 'min-h-[640px]' : 'h-[580px]'
                } bg-[#1C1F26] rounded-[32px] border-2 transition-colors flex flex-col justify-between p-5 text-[#E5E5E5] shadow-2xl ${
                  activeStep === 5 ? 'border-[#4ADE80]/60' : 'border-[#2E3440]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-3 border-b border-[#2E3440]">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
                      <span className="font-semibold text-white">PrimeChain</span>
                    </div>
                    <span className="font-mono text-[12px] text-[#CBD5E1]">
                      09:11
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="pt-6 pb-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-[#143321] border border-[#2E6230] flex items-center justify-center mb-3">
                      <Check className="w-7 h-7 text-[#4ADE80]" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      Installation Submitted
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {lastSubmittedCard?.workOrderNumber ||
                        activeWO?.workOrderNumber ||
                        'WO-2264'}{' '}
                      ·{' '}
                      {lastSubmittedCard?.customerName ||
                        activeWO?.customerName ||
                        'Thabo Molefe'}
                    </p>
                    <p className="text-[11px] font-mono text-[#4ADE80] mt-1">
                      {isCloudSynced
                        ? '✓ Synced to PrimeChain Cloud · 09:11:34'
                        : '✓ Recorded & Synced · 09:11:34'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#13161C] border border-[#2E3440] space-y-2.5 text-xs">
                    <div className="text-[11px] font-mono tracking-wider text-[#94A3B8] uppercase">
                      INSTALLATION RECEIPT
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Old reading</span>
                      <span className="font-mono font-semibold text-white">
                        {lastSubmittedCard
                          ? `${lastSubmittedCard.oldMeterReading} kWh`
                          : `${oldReadingInput.replace(/\s+/g, '')} kWh`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Installed meter</span>
                      <span className="font-mono font-semibold text-[#60A5FA]">
                        #{lastSubmittedCard?.newDeviceSerial || newSerialInput}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Opening reading</span>
                      <span className="font-mono font-semibold text-white">
                        0.00 kWh
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2E3440]">
                      <span className="text-[#94A3B8]">Job Card Record</span>
                      <span className="font-mono text-[#4ADE80]">
                        {pdfGenerating
                          ? 'Generating...'
                          : lastSubmittedCard
                          ? `${lastSubmittedCard.jobCardId} (Saved)`
                          : 'Generated ✓'}
                      </span>
                    </div>

                    {lastSubmittedCard && (
                      <div className="pt-2 border-t border-[#2E3440] grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono text-[#94A3B8]">
                            OLD METER PHOTO
                          </div>
                          <img
                            src={lastSubmittedCard.photos.oldMeterUrl}
                            alt="Old meter evidence"
                            className="w-full h-14 object-cover rounded border border-[#2E3440]"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono text-[#94A3B8]">
                            NEW METER PHOTO
                          </div>
                          <img
                            src={lastSubmittedCard.photos.newMeterUrl}
                            alt="New meter evidence"
                            className="w-full h-14 object-cover rounded border border-[#2E3440]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneTab('jobs');
                        setActiveStep(2);
                      }}
                      className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Return to My Jobs Queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (lastSubmittedCard) {
                          if (onExitAndroidPilotMode) {
                            onExitAndroidPilotMode();
                          }
                          onInspectJobCard(lastSubmittedCard.jobCardId);
                        } else {
                          handleCaptureSubmit();
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#143321] hover:bg-[#1B432C] border border-[#2E6230] text-xs font-semibold text-[#4ADE80] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Inspect Generated Job Card (Pages 1–3)</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center pt-3">
                    <p className="text-xs text-[#94A3B8]">
                      Next assigned job:{' '}
                      <span className="text-white font-medium">
                        {nextJobInQueue?.customerName || 'Priya Naidoo'}
                      </span>{' '}
                      · 10:30
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#2E3440] grid grid-cols-4 text-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneTab('jobs');
                      setActiveStep(2);
                    }}
                    className="flex flex-col items-center gap-1 text-[11px] text-[#60A5FA] font-medium cursor-pointer"
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>My Jobs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneTab('stock');
                      setActiveStep(2);
                    }}
                    className="flex flex-col items-center gap-1 text-[11px] text-[#8A8A8A] cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>My Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneTab('stats');
                      setActiveStep(2);
                    }}
                    className="flex flex-col items-center gap-1 text-[11px] text-[#8A8A8A] cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneTab('profile');
                      setActiveStep(2);
                    }}
                    className="flex flex-col items-center gap-1 text-[11px] text-[#8A8A8A] cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
