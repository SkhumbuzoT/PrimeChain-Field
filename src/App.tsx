/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  FileCheck2,
  Smartphone,
  Shield,
  SlidersHorizontal,
  RotateCcw,
  ChevronRight,
  Building2,
  UserCheck,
  BarChart3,
  Settings,
  Users,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import {
  ActiveModule,
  MeterDevice,
  WorkOrder,
  Technician,
  JobCardRecord,
} from './types';
import {
  INITIAL_DEVICES,
  INITIAL_WORK_ORDERS,
  INITIAL_TECHNICIANS,
  INITIAL_JOB_CARDS,
  DEFAULT_PHOTOS,
  DEMO_STAGES,
} from './data/initialData';
import { ControlTowerView } from './components/ControlTowerView';
import { WorkOrdersView } from './components/WorkOrdersView';
import { StockControlView } from './components/StockControlView';
import { TechAllocationView } from './components/TechAllocationView';
import { FieldCaptureView } from './components/FieldCaptureView';
import { JobCardsView } from './components/JobCardsView';
import { DemoWalkthroughBar } from './components/DemoWalkthroughBar';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { PilotLaunchModal } from './components/PilotLaunchModal';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  signInForPilot,
  signOutFromPilot,
  syncDeviceToCloud,
  updateDeviceStatusInCloud,
  syncWorkOrderToCloud,
  updateWorkOrderInCloud,
  syncJobCardToCloud,
  updateJobCardInCloud,
  updateJobCardPhotosInCloud,
} from './firebase';

const STORAGE_KEYS = {
  DEVICES: 'primechain_devices_v3',
  WORK_ORDERS: 'primechain_workorders_v3',
  TECHNICIANS: 'primechain_technicians_v3',
  JOB_CARDS: 'primechain_jobcards_v3',
  CAPTURED_PHOTOS: 'primechain_captured_photos_v3',
};

export default function App() {
  // Detect initial role from URL (?role=technician or ?mode=android -> 'technician', else 'admin')
  const [userRole, setUserRole] = useState<'admin' | 'technician'>(() => {
    if (typeof window === 'undefined') return 'admin';
    const params = new URLSearchParams(window.location.search);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (
      params.get('role') === 'technician' ||
      params.get('mode') === 'android' ||
      isStandalone
    ) {
      return 'technician';
    }
    return 'admin';
  });

  const [loggedInTechId, setLoggedInTechId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'TECH-01';
    const params = new URLSearchParams(window.location.search);
    return params.get('tech') || 'TECH-01';
  });

  const [activeModule, setActiveModule] = useState<ActiveModule>(() =>
    userRole === 'technician' ? 'field-capture' : 'control-tower'
  );
  const [navigationHint, setNavigationHint] = useState<string | undefined>(
    undefined
  );
  const [selectedJobCardId, setSelectedJobCardId] =
    useState<string>('JC-401930557');

  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(5);
  const [showPilotModal, setShowPilotModal] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Firebase Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Operational state with localStorage fallback
  const [devices, setDevices] = useState<MeterDevice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVICES);
      return saved ? JSON.parse(saved) : INITIAL_DEVICES;
    } catch {
      return INITIAL_DEVICES;
    }
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_WORK_ORDERS;
    } catch {
      return INITIAL_WORK_ORDERS;
    }
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      return saved ? JSON.parse(saved) : INITIAL_TECHNICIANS;
    } catch {
      return INITIAL_TECHNICIANS;
    }
  });

  const [jobCards, setJobCards] = useState<JobCardRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOB_CARDS);
      return saved ? JSON.parse(saved) : INITIAL_JOB_CARDS;
    } catch {
      return INITIAL_JOB_CARDS;
    }
  });

  const [capturedPhotos, setCapturedPhotos] = useState<{
    oldMeterUrl?: string;
    newMeterUrl?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAPTURED_PHOTOS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const capturedPhotosRef = useRef(capturedPhotos);
  useEffect(() => {
    capturedPhotosRef.current = capturedPhotos;
    try {
      localStorage.setItem(
        STORAGE_KEYS.CAPTURED_PHOTOS,
        JSON.stringify(capturedPhotos)
      );
    } catch {
      // ignore quota errors
    }
  }, [capturedPhotos]);

  const lastServerVersionRef = useRef<number>(-1);
  const isPushingRef = useRef<number>(0);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Preserve real camera photos (data:image/...) and union of JobCardRecords whenever merging from Firestore or Server
  const preserveRealJobCardPhotos = (
    incomingList: JobCardRecord[],
    existingList: JobCardRecord[],
    explicitCaptured?: { oldMeterUrl?: string; newMeterUrl?: string }
  ): JobCardRecord[] => {
    const byId = new Map<string, JobCardRecord>();
    const byWo = new Map<string, JobCardRecord>();
    let fallbackOld =
      explicitCaptured?.oldMeterUrl ||
      capturedPhotosRef.current?.oldMeterUrl ||
      '';
    let fallbackNew =
      explicitCaptured?.newMeterUrl ||
      capturedPhotosRef.current?.newMeterUrl ||
      '';

    existingList.forEach((jc) => {
      byId.set(jc.jobCardId, jc);
      if (jc.workOrderNumber) byWo.set(jc.workOrderNumber, jc);
      if (!fallbackOld && jc.photos?.oldMeterUrl?.startsWith('data:')) {
        fallbackOld = jc.photos.oldMeterUrl;
      }
      if (!fallbackNew && jc.photos?.newMeterUrl?.startsWith('data:')) {
        fallbackNew = jc.photos.newMeterUrl;
      }
    });

    incomingList.forEach((jc) => {
      if (!fallbackOld && jc.photos?.oldMeterUrl?.startsWith('data:')) {
        fallbackOld = jc.photos.oldMeterUrl;
      }
      if (!fallbackNew && jc.photos?.newMeterUrl?.startsWith('data:')) {
        fallbackNew = jc.photos.newMeterUrl;
      }
    });

    if (
      (fallbackOld && fallbackOld !== capturedPhotosRef.current?.oldMeterUrl) ||
      (fallbackNew && fallbackNew !== capturedPhotosRef.current?.newMeterUrl)
    ) {
      const nextCap = {
        oldMeterUrl: fallbackOld || capturedPhotosRef.current?.oldMeterUrl,
        newMeterUrl: fallbackNew || capturedPhotosRef.current?.newMeterUrl,
      };
      capturedPhotosRef.current = nextCap;
      setCapturedPhotos(nextCap);
    }

    const seenIds = new Set<string>();
    const seenWos = new Set<string>();

    const mergedIncoming = incomingList.map((jc) => {
      seenIds.add(jc.jobCardId);
      if (jc.workOrderNumber) seenWos.add(jc.workOrderNumber);
      const prev = byId.get(jc.jobCardId) || byWo.get(jc.workOrderNumber);
      const incOld = jc.photos?.oldMeterUrl || '';
      const incNew = jc.photos?.newMeterUrl || '';
      const incSite = jc.photos?.installationSiteUrl || '';

      const prevOld = prev?.photos?.oldMeterUrl || '';
      const prevNew = prev?.photos?.newMeterUrl || '';
      const prevSite = prev?.photos?.installationSiteUrl || '';

      const oldMeterUrl = incOld.startsWith('data:')
        ? incOld
        : prevOld.startsWith('data:')
        ? prevOld
        : fallbackOld.startsWith('data:')
        ? fallbackOld
        : incOld || prevOld || DEFAULT_PHOTOS.oldMeterUrl;

      const newMeterUrl = incNew.startsWith('data:')
        ? incNew
        : prevNew.startsWith('data:')
        ? prevNew
        : fallbackNew.startsWith('data:')
        ? fallbackNew
        : incNew || prevNew || DEFAULT_PHOTOS.newMeterUrl;

      const installationSiteUrl = incSite.startsWith('data:')
        ? incSite
        : prevSite.startsWith('data:')
        ? prevSite
        : newMeterUrl.startsWith('data:')
        ? newMeterUrl
        : oldMeterUrl.startsWith('data:')
        ? oldMeterUrl
        : incSite || prevSite || DEFAULT_PHOTOS.installationSiteUrl;

      return {
        ...jc,
        photos: {
          oldMeterUrl,
          newMeterUrl,
          installationSiteUrl,
        },
      };
    });

    const missingExisting = existingList
      .filter(
        (jc) =>
          !seenIds.has(jc.jobCardId) &&
          (!jc.workOrderNumber || !seenWos.has(jc.workOrderNumber))
      )
      .map((jc) => {
        const prevOld = jc.photos?.oldMeterUrl || '';
        const prevNew = jc.photos?.newMeterUrl || '';
        const oldMeterUrl = prevOld.startsWith('data:')
          ? prevOld
          : fallbackOld.startsWith('data:')
          ? fallbackOld
          : prevOld || DEFAULT_PHOTOS.oldMeterUrl;
        const newMeterUrl = prevNew.startsWith('data:')
          ? prevNew
          : fallbackNew.startsWith('data:')
          ? fallbackNew
          : prevNew || DEFAULT_PHOTOS.newMeterUrl;
        return {
          ...jc,
          photos: {
            oldMeterUrl,
            newMeterUrl,
            installationSiteUrl: newMeterUrl.startsWith('data:')
              ? newMeterUrl
              : oldMeterUrl.startsWith('data:')
              ? oldMeterUrl
              : jc.photos?.installationSiteUrl ||
                DEFAULT_PHOTOS.installationSiteUrl,
          },
        };
      });

    const combined = [...missingExisting, ...mergedIncoming];

    // Sort job cards so cards with real camera photos or newly generated IDs appear first
    return [...combined].sort((a, b) => {
      const aMatch = a.jobCardId.match(/JC-2026-0(\d+)/);
      const bMatch = b.jobCardId.match(/JC-2026-0(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
      if (aNum > 903 || bNum > 903) return bNum - aNum;
      const aHasCamera =
        a.photos?.oldMeterUrl?.startsWith('data:') ||
        a.photos?.newMeterUrl?.startsWith('data:')
          ? 1
          : 0;
      const bHasCamera =
        b.photos?.oldMeterUrl?.startsWith('data:') ||
        b.photos?.newMeterUrl?.startsWith('data:')
          ? 1
          : 0;
      if (aHasCamera !== bHasCamera) return bHasCamera - aHasCamera;
      return 0;
    });
  };

  // Auto-select the latest Job Card that has real captured camera photos or was newly generated
  useEffect(() => {
    const defaultIds = new Set([
      'JC-401930557',
      'JC-2026-0901',
      'JC-2026-0902',
      'JC-2026-0903',
    ]);
    if (defaultIds.has(selectedJobCardId)) {
      const cardWithCamera = jobCards.find(
        (jc) =>
          jc.photos?.oldMeterUrl?.startsWith('data:image') ||
          jc.photos?.newMeterUrl?.startsWith('data:image') ||
          !defaultIds.has(jc.jobCardId)
      );
      if (cardWithCamera && cardWithCamera.jobCardId !== selectedJobCardId) {
        setSelectedJobCardId(cardWithCamera.jobCardId);
      }
    }
  }, [jobCards, selectedJobCardId]);

  const mergeByKey = <T,>(
    remoteList: T[],
    localList: T[],
    getKey: (item: T) => string
  ): { merged: T[]; localOnly: T[] } => {
    const remoteMap = new Map<string, T>();
    remoteList.forEach((item) => remoteMap.set(getKey(item), item));
    const localOnly: T[] = [];
    localList.forEach((item) => {
      const k = getKey(item);
      if (!remoteMap.has(k)) {
        localOnly.push(item);
      }
    });
    return {
      merged: [...localOnly, ...remoteList],
      localOnly,
    };
  };

  // Push state updates to the shared real-time Express server (/api/sync)
  const pushStateToServer = async (payload: {
    devices?: MeterDevice[];
    workOrders?: WorkOrder[];
    technicians?: Technician[];
    jobCards?: JobCardRecord[];
    capturedPhotos?: { oldMeterUrl?: string; newMeterUrl?: string };
    reset?: boolean;
  }) => {
    isPushingRef.current += 1;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          capturedPhotos: payload.reset
            ? {}
            : payload.capturedPhotos || capturedPhotosRef.current,
        }),
      });
      if (res.ok) {
        setIsCloudSynced(true);
        const data = await res.json();
        if (typeof data?.version === 'number') {
          lastServerVersionRef.current = Math.max(
            lastServerVersionRef.current,
            data.version
          );
        }
      }
    } catch {
      // Offline or static host fallback
    } finally {
      isPushingRef.current = Math.max(0, isPushingRef.current - 1);
    }
  };

  // Real-time Server-Sent Events (/api/events) + Polling (/api/state) for zero-login Desktop <-> Phone sync
  useEffect(() => {
    let isMounted = true;

    const syncFromServer = async (isInitialBoot = false) => {
      if (!isInitialBoot && isPushingRef.current > 0) return;
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok || !isMounted) return;
        if (!isInitialBoot && isPushingRef.current > 0) return;
        const data = await res.json();
        setIsCloudSynced(true);

        const serverCaptured =
          data.capturedPhotos && typeof data.capturedPhotos === 'object'
            ? (data.capturedPhotos as {
                oldMeterUrl?: string;
                newMeterUrl?: string;
              })
            : undefined;

        if (isInitialBoot) {
          const remoteDevs: MeterDevice[] = Array.isArray(data.devices)
            ? data.devices
            : [];
          const remoteWOs: WorkOrder[] = Array.isArray(data.workOrders)
            ? data.workOrders
            : [];
          const remoteTechs: Technician[] = Array.isArray(data.technicians)
            ? data.technicians
            : [];
          const remoteJCs: JobCardRecord[] = Array.isArray(data.jobCards)
            ? data.jobCards
            : [];

          if (data.version === 0 || remoteWOs.length === 0) {
            await pushStateToServer({
              devices,
              workOrders,
              technicians,
              jobCards,
            });
            return;
          }

          const devMerge = mergeByKey(
            remoteDevs,
            devices,
            (d) => d.serialNumber
          );
          const woMerge = mergeByKey(
            remoteWOs,
            workOrders,
            (w) => w.workOrderNumber
          );
          const techMerge = mergeByKey(
            remoteTechs,
            technicians,
            (t) => t.id
          );
          const jcMerge = mergeByKey(
            remoteJCs,
            jobCards,
            (j) => j.jobCardId
          );
          const mergedJCsWithPhotos = preserveRealJobCardPhotos(
            jcMerge.merged,
            jobCards,
            serverCaptured
          );

          lastServerVersionRef.current = data.version;
          setDevices(devMerge.merged);
          setWorkOrders(woMerge.merged);
          setTechnicians(techMerge.merged);
          setJobCards(mergedJCsWithPhotos);

          if (
            devMerge.localOnly.length > 0 ||
            woMerge.localOnly.length > 0 ||
            techMerge.localOnly.length > 0 ||
            jcMerge.localOnly.length > 0
          ) {
            await pushStateToServer({
              devices: devMerge.merged,
              workOrders: woMerge.merged,
              technicians: techMerge.merged,
              jobCards: mergedJCsWithPhotos,
            });
          }
          return;
        }

        if (
          typeof data.version === 'number' &&
          data.version > lastServerVersionRef.current &&
          isPushingRef.current === 0
        ) {
          lastServerVersionRef.current = data.version;
          if (Array.isArray(data.devices)) setDevices(data.devices);
          if (Array.isArray(data.workOrders)) setWorkOrders(data.workOrders);
          if (Array.isArray(data.technicians)) setTechnicians(data.technicians);
          if (Array.isArray(data.jobCards)) {
            setJobCards((prev) =>
              preserveRealJobCardPhotos(data.jobCards, prev, serverCaptured)
            );
          }
        }
      } catch {
        // Ignore network errors when offline
      }
    };

    syncFromServer(true);

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (event) => {
        if (!isMounted || isPushingRef.current > 0) return;
        try {
          const data = JSON.parse(event.data);
          setIsCloudSynced(true);
          const serverCaptured =
            data.capturedPhotos && typeof data.capturedPhotos === 'object'
              ? (data.capturedPhotos as {
                  oldMeterUrl?: string;
                  newMeterUrl?: string;
                })
              : undefined;
          if (
            typeof data.version === 'number' &&
            data.version > lastServerVersionRef.current &&
            lastServerVersionRef.current !== -1
          ) {
            lastServerVersionRef.current = data.version;
            if (Array.isArray(data.devices)) setDevices(data.devices);
            if (Array.isArray(data.workOrders)) setWorkOrders(data.workOrders);
            if (Array.isArray(data.technicians)) setTechnicians(data.technicians);
            if (Array.isArray(data.jobCards)) {
              setJobCards((prev) =>
                preserveRealJobCardPhotos(data.jobCards, prev, serverCaptured)
              );
            }
          }
        } catch {
          // ignore malformed event
        }
      };
    } catch {
      // fallback to polling
    }

    const pollTimer = setInterval(() => {
      syncFromServer(false);
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      es?.close();
    };
  }, []);

  // Seed / Push current pilot data to Firestore & Live Server
  const handlePushSeedDataToCloud = async (uidOverride?: string) => {
    setIsSyncing(true);
    try {
      await pushStateToServer({
        devices,
        workOrders,
        technicians,
        jobCards,
      });
      const uid = uidOverride || currentUser?.uid;
      if (uid) {
        for (const dev of devices) {
          await syncDeviceToCloud(dev, uid);
        }
        for (const wo of workOrders) {
          await syncWorkOrderToCloud(wo, uid);
        }
        for (const jc of jobCards) {
          await syncJobCardToCloud(jc, uid);
        }
      }
      setIsCloudSynced(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Firestore onSnapshot listeners when authenticated
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = currentUser.uid;
    const devicesQ = query(
      collection(db, 'pilot_devices'),
      where('ownerUid', '==', uid)
    );
    const workOrdersQ = query(
      collection(db, 'pilot_work_orders'),
      where('ownerUid', '==', uid)
    );
    const jobCardsQ = query(
      collection(db, 'pilot_job_cards'),
      where('ownerUid', '==', uid)
    );

    const unsubDevices = onSnapshot(
      devicesQ,
      (snap) => {
        if (snap.empty) {
          handlePushSeedDataToCloud(uid);
          return;
        }
        setIsCloudSynced(true);
        const cloudDevices: MeterDevice[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const existingLocal = INITIAL_DEVICES.find(
            (item) => item.serialNumber === d.serialNumber
          );
          return {
            serialNumber: d.serialNumber,
            model: d.model,
            deviceType: d.deviceType,
            manufacturer: d.manufacturer,
            dateReceived: d.dateReceived,
            batchNumber: d.batchNumber,
            status: d.status,
            assignedTechnicianId: d.assignedTechnicianId || undefined,
            assignedTechnicianName: d.assignedTechnicianName || undefined,
            dateIssued: d.dateIssued || undefined,
            installedWorkOrderNumber: d.installedWorkOrderNumber || undefined,
            installedDate: d.installedDate || undefined,
            sealNumber: d.sealNumber,
            custodyHistory: existingLocal?.custodyHistory || [
              {
                id: `EVT-${d.serialNumber}-1`,
                timestamp: d.dateReceived,
                status: d.status,
                actor: 'Cloud Pilot Sync',
                locationOrHolder:
                  d.assignedTechnicianName || 'Central Municipal Cage',
                note: `Live Firestore custody state: ${d.status}.`,
              },
            ],
          };
        });
        setDevices((prev) => {
          const { merged, localOnly } = mergeByKey(
            cloudDevices,
            prev,
            (item) => item.serialNumber
          );
          if (localOnly.length > 0) {
            localOnly.forEach((dev) => syncDeviceToCloud(dev, uid));
          }
          pushStateToServer({ devices: merged });
          return merged;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pilot_devices');
      }
    );

    const unsubWorkOrders = onSnapshot(
      workOrdersQ,
      (snap) => {
        if (snap.empty) return;
        const cloudWOs: WorkOrder[] = snap.docs.map((docSnap) => {
          const w = docSnap.data();
          return {
            workOrderNumber: w.workOrderNumber,
            municipalBatchId: w.municipalBatchId,
            customerName: w.customerName,
            accountNumber: w.accountNumber,
            address: w.address,
            suburb: w.suburb,
            ward: w.ward,
            oldDeviceSerial: w.oldDeviceSerial,
            oldDeviceMake: w.oldDeviceMake,
            existingReading: Number(w.existingReading) || 0,
            workType: w.workType,
            status: w.status,
            assignedTechnicianId: w.assignedTechnicianId || undefined,
            assignedTechnicianName: w.assignedTechnicianName || undefined,
            dateAllocated: w.dateAllocated,
            completedDate: w.completedDate || undefined,
            installedDeviceSerial: w.installedDeviceSerial || undefined,
            jobCardId: w.jobCardId || undefined,
            exceptionReason: w.exceptionReason || undefined,
            municipalNotes: w.municipalNotes || '',
          };
        });
        setWorkOrders((prev) => {
          const { merged, localOnly } = mergeByKey(
            cloudWOs,
            prev,
            (item) => item.workOrderNumber
          );
          if (localOnly.length > 0) {
            localOnly.forEach((wo) => syncWorkOrderToCloud(wo, uid));
          }
          pushStateToServer({ workOrders: merged });
          return merged;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pilot_work_orders');
      }
    );

    const unsubJobCards = onSnapshot(
      jobCardsQ,
      (snap) => {
        if (snap.empty) return;
        const cloudJCs: JobCardRecord[] = snap.docs.map((docSnap) => {
          const j = docSnap.data();
          const oldMeterUrl =
            typeof j.oldMeterPhotoUrl === 'string' && j.oldMeterPhotoUrl.trim()
              ? j.oldMeterPhotoUrl
              : DEFAULT_PHOTOS.oldMeterUrl;
          const newMeterUrl =
            typeof j.newMeterPhotoUrl === 'string' && j.newMeterPhotoUrl.trim()
              ? j.newMeterPhotoUrl
              : DEFAULT_PHOTOS.newMeterUrl;
          return {
            jobCardId: j.jobCardId,
            workOrderNumber: j.workOrderNumber,
            customerName: j.customerName,
            accountNumber: j.accountNumber,
            address: j.address,
            suburb: j.suburb,
            ward: j.ward,
            workType: j.workType,
            technicianId: j.technicianId,
            technicianName: j.technicianName,
            employeeCode: j.employeeCode,
            oldDeviceSerial: j.oldDeviceSerial,
            oldDeviceMake: j.oldDeviceMake,
            oldMeterReading: Number(j.oldMeterReading) || 0,
            newDeviceSerial: j.newDeviceSerial,
            newDeviceModel: j.newDeviceModel,
            newDeviceManufacturer: j.newDeviceManufacturer,
            newMeterReading: Number(j.newMeterReading) || 0,
            sealNumber: j.sealNumber,
            installationStatus: j.installationStatus,
            installationDate: j.installationDate,
            gpsCoordinates: j.gpsCoordinates,
            fieldNotes: j.fieldNotes,
            photos: {
              oldMeterUrl,
              newMeterUrl,
              installationSiteUrl: newMeterUrl.startsWith('data:image')
                ? newMeterUrl
                : oldMeterUrl.startsWith('data:image')
                ? oldMeterUrl
                : DEFAULT_PHOTOS.installationSiteUrl,
            },
            reviewStatus: j.reviewStatus,
            generatedAt: j.generatedAt,
            submittedAt: j.submittedAt || undefined,
          };
        });
        setJobCards((prev) => {
          const { merged, localOnly } = mergeByKey(
            cloudJCs,
            prev,
            (item) => item.jobCardId
          );
          const withPreservedPhotos = preserveRealJobCardPhotos(merged, prev);
          if (localOnly.length > 0) {
            localOnly.forEach((jc) => syncJobCardToCloud(jc, uid));
          }
          // Also upgrade any cloud job card that was missing camera photos in Firestore
          const cloudMap = new Map(cloudJCs.map((c) => [c.jobCardId, c]));
          withPreservedPhotos.forEach((jc) => {
            const c = cloudMap.get(jc.jobCardId);
            if (
              c &&
              ((jc.photos.oldMeterUrl.startsWith('data:image') &&
                !c.photos.oldMeterUrl.startsWith('data:image')) ||
                (jc.photos.newMeterUrl.startsWith('data:image') &&
                  !c.photos.newMeterUrl.startsWith('data:image')))
            ) {
              updateJobCardPhotosInCloud(
                jc.jobCardId,
                jc.photos.oldMeterUrl,
                jc.photos.newMeterUrl
              );
            }
          });
          pushStateToServer({ jobCards: withPreservedPhotos });
          return withPreservedPhotos;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pilot_job_cards');
      }
    );

    return () => {
      unsubDevices();
      unsubWorkOrders();
      unsubJobCards();
    };
  }, [authReady, currentUser]);

  // Keep localStorage synced for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    } catch {
      // ignore
    }
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.WORK_ORDERS,
        JSON.stringify(workOrders)
      );
    } catch {
      // ignore
    }
  }, [workOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.TECHNICIANS,
        JSON.stringify(technicians)
      );
    } catch {
      // ignore
    }
  }, [technicians]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOB_CARDS, JSON.stringify(jobCards));
    } catch {
      // ignore
    }
  }, [jobCards]);

  const handleResetDemoData = async () => {
    setDevices(INITIAL_DEVICES);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setTechnicians(INITIAL_TECHNICIANS);
    setJobCards(INITIAL_JOB_CARDS);
    setCapturedPhotos({});
    capturedPhotosRef.current = {};
    try {
      localStorage.removeItem(STORAGE_KEYS.CAPTURED_PHOTOS);
    } catch {
      // ignore
    }
    setSelectedJobCardId('JC-2026-0901');
    setNavigationHint(undefined);
    await pushStateToServer({
      devices: INITIAL_DEVICES,
      workOrders: INITIAL_WORK_ORDERS,
      technicians: INITIAL_TECHNICIANS,
      jobCards: INITIAL_JOB_CARDS,
      reset: true,
    });
    if (currentUser) {
      setIsSyncing(true);
      try {
        for (const dev of INITIAL_DEVICES) {
          await syncDeviceToCloud(dev, currentUser.uid);
        }
        for (const wo of INITIAL_WORK_ORDERS) {
          await syncWorkOrderToCloud(wo, currentUser.uid);
        }
        for (const jc of INITIAL_JOB_CARDS) {
          await syncJobCardToCloud(jc, currentUser.uid);
        }
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleNavigate = (module: ActiveModule, hint?: string) => {
    setActiveModule(module);
    setNavigationHint(hint);
    const matchingStageIdx = DEMO_STAGES.findIndex(
      (s) => s.targetModule === module
    );
    if (matchingStageIdx !== -1) {
      setActiveStageIndex(matchingStageIdx);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectJobCard = (jobCardId: string) => {
    setSelectedJobCardId(jobCardId);
    setUserRole('admin');
    handleNavigate('job-cards');
  };

  const handleImportWorkOrderBatch = (): number => {
    const maxWoNum = workOrders.reduce((max, w) => {
      const match = w.workOrderNumber.match(/WO-2026-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return !isNaN(n) && n > max ? n : max;
    }, 8846);
    const baseNum = maxWoNum + 1;
    const importedBatch: WorkOrder[] = [
      {
        workOrderNumber: `WO-2026-${baseNum}`,
        municipalBatchId: 'JHB-CITYPOWER-0926B',
        customerName: 'L.M. Khumalo',
        accountNumber: `ACC-55019${baseNum}`,
        address: '74B Braam Fischer Drive, Blairgowrie',
        suburb: 'Randburg',
        ward: 'Ward 102',
        oldDeviceSerial: '443109',
        oldDeviceMake: 'AEG Mechanical Disc',
        existingReading: 51420.0,
        workType: 'Installation',
        status: 'Assigned',
        assignedTechnicianId: 'TECH-01',
        assignedTechnicianName: 'Sipho Ndlovu',
        dateAllocated: '28 September 2026 · Live Dispatch',
        municipalNotes:
          'Imported via municipal CSV batch. Assigned to Sipho Ndlovu.',
      },
      {
        workOrderNumber: `WO-2026-${baseNum + 1}`,
        municipalBatchId: 'JHB-CITYPOWER-0926B',
        customerName: 'P. Naidoo',
        accountNumber: `ACC-55019${baseNum + 1}`,
        address: '15 Rivonia Boulevard, Edenburg',
        suburb: 'Sandton',
        ward: 'Ward 106',
        oldDeviceSerial: '520194',
        oldDeviceMake: 'Landis+Gyr Gemini',
        existingReading: 18930.4,
        workType: 'Audit',
        status: 'Received',
        dateAllocated: '28 September 2026 · Live Dispatch',
        municipalNotes:
          'Imported via municipal CSV batch. Tamper inspection required.',
      },
      {
        workOrderNumber: `WO-2026-${baseNum + 2}`,
        municipalBatchId: 'JHB-CITYPOWER-0926B',
        customerName: 'B.J. Botha',
        accountNumber: `ACC-55019${baseNum + 2}`,
        address: '92 Hendrik Potgieter Rd, Little Falls',
        suburb: 'Roodepoort',
        ward: 'Ward 85',
        oldDeviceSerial: '390812',
        oldDeviceMake: 'Itron ACE9000',
        existingReading: 41205.8,
        workType: 'Installation',
        status: 'Received',
        dateAllocated: '28 September 2026 · Live Dispatch',
        municipalNotes:
          'Imported via municipal CSV batch. Smart meter replacement.',
      },
    ];
    const nextWOs = [...importedBatch, ...workOrders];
    setWorkOrders(nextWOs);
    pushStateToServer({ workOrders: nextWOs });
    if (currentUser) {
      importedBatch.forEach((wo) => syncWorkOrderToCloud(wo, currentUser.uid));
    }
    return importedBatch.length;
  };

  const handleAddWorkOrder = (wo: WorkOrder) => {
    const nextWOs = [
      wo,
      ...workOrders.filter((item) => item.workOrderNumber !== wo.workOrderNumber),
    ];
    setWorkOrders(nextWOs);
    pushStateToServer({ workOrders: nextWOs });
    if (currentUser) {
      syncWorkOrderToCloud(wo, currentUser.uid);
    }
  };

  const handleAssignTechnicianToWO = (
    workOrderNumber: string,
    technicianId: string
  ) => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech) return;
    const nextWOs: WorkOrder[] = workOrders.map((w) =>
      w.workOrderNumber === workOrderNumber
        ? {
            ...w,
            status: w.status === 'Received' ? 'Assigned' : w.status,
            assignedTechnicianId: tech.id,
            assignedTechnicianName: tech.name,
          }
        : w
    );
    setWorkOrders(nextWOs);
    pushStateToServer({ workOrders: nextWOs });
    if (currentUser) {
      updateWorkOrderInCloud(workOrderNumber, {
        status: 'Assigned',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
      });
    }
  };

  const handleRegisterSingleDevice = (device: MeterDevice) => {
    const nextDevs = [
      device,
      ...devices.filter((d) => d.serialNumber !== device.serialNumber),
    ];
    setDevices(nextDevs);
    pushStateToServer({ devices: nextDevs });
    if (currentUser) {
      syncDeviceToCloud(device, currentUser.uid);
    }
  };

  const handleRegisterStockBatch = (): number => {
    const maxSerial = devices.reduce((max, d) => {
      const n = parseInt(d.serialNumber, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 987662);

    const newBatch: MeterDevice[] = [1, 2, 3].map((offset) => {
      const s = String(maxSerial + offset);
      return {
        serialNumber: s,
        model: offset === 3 ? 'CASHPOWER Gemini PLC' : 'BEC23 Smart Split Prepaid',
        deviceType: 'Single-Phase Smart Prepaid',
        manufacturer: offset === 3 ? 'Landis+Gyr' : 'Conlog',
        dateReceived: '26 September 2026',
        batchNumber: 'MUN-BATCH-09D',
        status: 'Available',
        sealNumber: `SL-${90420 + offset}`,
        custodyHistory: [
          {
            id: `EVT-${s}-1`,
            timestamp: '26 September 2026 · 15:30',
            status: 'Available',
            actor: 'Depot Stores Clerk (K. Mahlangu)',
            locationOrHolder: 'Central Municipal Cage · Midrand',
            note: 'Scanned into contractor store from Municipal Delivery MUN-BATCH-09D.',
          },
        ],
      };
    });

    const nextDevs = [...newBatch, ...devices];
    setDevices(nextDevs);
    pushStateToServer({ devices: nextDevs });
    if (currentUser) {
      newBatch.forEach((dev) => syncDeviceToCloud(dev, currentUser.uid));
    }
    return newBatch.length;
  };

  const handleAllocateDevice = (serialNumber: string, technicianId: string) => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech) return;
    const nextDevs: MeterDevice[] = devices.map((d) => {
      if (d.serialNumber !== serialNumber) return d;
      return {
        ...d,
        status: 'Allocated',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
        dateIssued: '26 September 2026',
        custodyHistory: [
          ...d.custodyHistory,
          {
            id: `EVT-${serialNumber}-${d.custodyHistory.length + 1}`,
            timestamp: '26 September 2026 · 15:32',
            status: 'Allocated',
            actor: 'Dispatch Supervisor (R. Naidoo)',
            locationOrHolder: `${tech.name} (${tech.employeeCode} · Vehicle ${tech.vehicleReg})`,
            note: `Digitally issued to technician ${tech.name}.`,
          },
        ],
      };
    });
    setDevices(nextDevs);
    pushStateToServer({ devices: nextDevs });
    if (currentUser) {
      updateDeviceStatusInCloud(serialNumber, {
        status: 'Allocated',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
        dateIssued: '26 September 2026',
      });
    }
  };

  const handleReturnDeviceToStore = (serialNumber: string, note: string) => {
    const nextDevs: MeterDevice[] = devices.map((d) => {
      if (d.serialNumber !== serialNumber) return d;
      return {
        ...d,
        status: 'Available',
        assignedTechnicianId: undefined,
        assignedTechnicianName: undefined,
        dateIssued: undefined,
        custodyHistory: [
          ...d.custodyHistory,
          {
            id: `EVT-${serialNumber}-${d.custodyHistory.length + 1}`,
            timestamp: '26 September 2026 · 15:35',
            status: 'Available',
            actor: 'Depot Stores Clerk (K. Mahlangu)',
            locationOrHolder: 'Central Municipal Cage · Midrand',
            note,
          },
        ],
      };
    });
    setDevices(nextDevs);
    pushStateToServer({ devices: nextDevs });
    if (currentUser) {
      updateDeviceStatusInCloud(serialNumber, {
        status: 'Available',
        assignedTechnicianId: '',
        assignedTechnicianName: '',
        dateIssued: '',
      });
    }
  };

  const handleAddTechnician = (tech: Technician) => {
    const nextTechs = [...technicians, tech];
    setTechnicians(nextTechs);
    pushStateToServer({ technicians: nextTechs });
  };

  const handleSubmitFieldInstallation = (payload: {
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
  }): JobCardRecord => {
    const tech =
      technicians.find((t) => t.id === payload.technicianId) || technicians[0];
    const wo =
      workOrders.find((w) => w.workOrderNumber === payload.workOrderNumber) ||
      workOrders[0];
    const dev =
      devices.find((d) => d.serialNumber === payload.newDeviceSerial) ||
      devices[0];

    const existingCardForWO = jobCards.find(
      (jc) => jc.workOrderNumber === wo.workOrderNumber
    );
    const maxJcNum = jobCards.reduce((max, jc) => {
      const match = jc.jobCardId.match(/JC-2026-0(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return !isNaN(n) && n > max ? n : max;
    }, 903);
    const nextJcNum = maxJcNum + 1;
    const newJobCardId = existingCardForWO
      ? existingCardForWO.jobCardId
      : `JC-2026-0${nextJcNum}`;
    const now = new Date();
    const datePart = now.toLocaleDateString('en-GB');
    const timePart = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const nowStamp = `${datePart} · ${timePart}`;

    const newJobCard: JobCardRecord = {
      jobCardId: newJobCardId,
      workOrderNumber: wo.workOrderNumber,
      customerName: wo.customerName,
      accountNumber: wo.accountNumber,
      address: wo.address,
      suburb: wo.suburb,
      ward: wo.ward,
      workType: wo.workType,
      technicianId: tech.id,
      technicianName: tech.name,
      employeeCode: tech.employeeCode,
      oldDeviceSerial: payload.oldDeviceSerialConfirmed,
      oldDeviceMake: wo.oldDeviceMake,
      oldMeterReading: payload.oldMeterReading,
      newDeviceSerial: dev.serialNumber,
      newDeviceModel: dev.model,
      newDeviceManufacturer: dev.manufacturer,
      newMeterReading: payload.newMeterReading,
      sealNumber: dev.sealNumber || 'SL-90412',
      installationStatus: payload.installationStatus,
      installationDate: nowStamp,
      gpsCoordinates: payload.gpsCoordinates,
      fieldNotes: payload.fieldNotes,
      photos: payload.photos,
      reviewStatus: 'Ready for Review',
      generatedAt: `${nowStamp}:34`,
    };

    const nextDevs: MeterDevice[] = devices.map((d) => {
      if (d.serialNumber !== dev.serialNumber) return d;
      return {
        ...d,
        status: 'Installed',
        installedWorkOrderNumber: wo.workOrderNumber,
        installedDate: '26 September 2026',
        custodyHistory: [
          ...d.custodyHistory,
          {
            id: `EVT-${d.serialNumber}-${d.custodyHistory.length + 1}`,
            timestamp: nowStamp,
            status: 'Installed',
            actor: `${tech.name} (Voltex Field App)`,
            locationOrHolder: `${wo.address}, ${wo.suburb} · ${wo.workOrderNumber}`,
            workOrderNumber: wo.workOrderNumber,
            note: `Installed on site. Old meter #${payload.oldDeviceSerialConfirmed} removed (${payload.oldMeterReading} kWh). Job Card ${newJobCardId} auto-generated.`,
          },
        ],
      };
    });

    const nextWOs: WorkOrder[] = workOrders.map((w) => {
      if (w.workOrderNumber !== wo.workOrderNumber) return w;
      return {
        ...w,
        status:
          payload.installationStatus === 'Exception'
            ? 'Exception'
            : 'Completed',
        completedDate: 'Submitted 09:11',
        installedDeviceSerial: dev.serialNumber,
        jobCardId: newJobCardId,
      };
    });

    const nextCaptured = {
      oldMeterUrl: payload.photos.oldMeterUrl?.startsWith('data:')
        ? payload.photos.oldMeterUrl
        : capturedPhotosRef.current?.oldMeterUrl,
      newMeterUrl: payload.photos.newMeterUrl?.startsWith('data:')
        ? payload.photos.newMeterUrl
        : capturedPhotosRef.current?.newMeterUrl,
    };
    capturedPhotosRef.current = nextCaptured;
    setCapturedPhotos(nextCaptured);

    const nextJCs = [
      newJobCard,
      ...jobCards
        .filter(
          (jc) =>
            jc.jobCardId !== newJobCardId &&
            jc.workOrderNumber !== wo.workOrderNumber
        )
        .map((jc) => ({
          ...jc,
          photos: {
            oldMeterUrl: jc.photos.oldMeterUrl.startsWith('data:')
              ? jc.photos.oldMeterUrl
              : nextCaptured.oldMeterUrl || jc.photos.oldMeterUrl,
            newMeterUrl: jc.photos.newMeterUrl.startsWith('data:')
              ? jc.photos.newMeterUrl
              : nextCaptured.newMeterUrl || jc.photos.newMeterUrl,
            installationSiteUrl: jc.photos.installationSiteUrl.startsWith(
              'data:'
            )
              ? jc.photos.installationSiteUrl
              : nextCaptured.newMeterUrl ||
                nextCaptured.oldMeterUrl ||
                jc.photos.installationSiteUrl,
          },
        })),
    ];

    setDevices(nextDevs);
    setWorkOrders(nextWOs);
    setJobCards(nextJCs);
    setSelectedJobCardId(newJobCardId);

    pushStateToServer({
      devices: nextDevs,
      workOrders: nextWOs,
      jobCards: nextJCs,
      capturedPhotos: nextCaptured,
    });

    if (currentUser) {
      updateDeviceStatusInCloud(dev.serialNumber, {
        status: 'Installed',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
        dateIssued: dev.dateIssued || '17 September 2026',
        installedWorkOrderNumber: wo.workOrderNumber,
        installedDate: '26 September 2026',
      });
      updateWorkOrderInCloud(wo.workOrderNumber, {
        status:
          payload.installationStatus === 'Exception'
            ? 'Exception'
            : 'Completed',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
        completedDate: 'Submitted 09:11',
        installedDeviceSerial: dev.serialNumber,
        jobCardId: newJobCardId,
      });
      syncJobCardToCloud(newJobCard, currentUser.uid);
    }

    return newJobCard;
  };

  const handleUpdateJobCardPhoto = (
    jobCardId: string,
    which: 'old' | 'new',
    dataUrl: string
  ) => {
    const nextCaptured = {
      ...capturedPhotosRef.current,
      oldMeterUrl:
        which === 'old' ? dataUrl : capturedPhotosRef.current?.oldMeterUrl,
      newMeterUrl:
        which === 'new' ? dataUrl : capturedPhotosRef.current?.newMeterUrl,
    };
    capturedPhotosRef.current = nextCaptured;
    setCapturedPhotos(nextCaptured);

    let updatedCard: JobCardRecord | undefined;
    const nextJCs: JobCardRecord[] = jobCards.map((jc) => {
      if (jc.jobCardId === jobCardId) {
        const nextPhotos = {
          ...jc.photos,
          oldMeterUrl: which === 'old' ? dataUrl : jc.photos.oldMeterUrl,
          newMeterUrl: which === 'new' ? dataUrl : jc.photos.newMeterUrl,
          installationSiteUrl:
            which === 'new' ? dataUrl : jc.photos.installationSiteUrl,
        };
        updatedCard = { ...jc, photos: nextPhotos };
        return updatedCard;
      }
      // Also replace any generic placeholder photo on other cards so no card displays stock images once real photos are captured
      return {
        ...jc,
        photos: {
          oldMeterUrl:
            which === 'old' && !jc.photos.oldMeterUrl.startsWith('data:')
              ? dataUrl
              : jc.photos.oldMeterUrl,
          newMeterUrl:
            which === 'new' && !jc.photos.newMeterUrl.startsWith('data:')
              ? dataUrl
              : jc.photos.newMeterUrl,
          installationSiteUrl: !jc.photos.installationSiteUrl.startsWith('data:')
            ? dataUrl
            : jc.photos.installationSiteUrl,
        },
      };
    });
    setJobCards(nextJCs);
    pushStateToServer({ jobCards: nextJCs, capturedPhotos: nextCaptured });
    if (currentUser && updatedCard) {
      syncJobCardToCloud(updatedCard, currentUser.uid);
    }
  };

  // Immediately attach captured field camera photo (1 or 2) to the Work Order's Job Card so Pages 2 & 3 always show real photos
  const handleLiveFieldPhotoCapture = (
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
  ): JobCardRecord | undefined => {
    const nextCaptured = {
      ...capturedPhotosRef.current,
      oldMeterUrl:
        which === 'old' ? dataUrl : capturedPhotosRef.current?.oldMeterUrl,
      newMeterUrl:
        which === 'new' ? dataUrl : capturedPhotosRef.current?.newMeterUrl,
    };
    capturedPhotosRef.current = nextCaptured;
    setCapturedPhotos(nextCaptured);

    const wo =
      workOrders.find((w) => w.workOrderNumber === workOrderNumber) ||
      workOrders[0];
    const tech =
      technicians.find(
        (t) =>
          t.id ===
          (context?.technicianId || wo.assignedTechnicianId || loggedInTechId)
      ) || technicians[0];
    const dev =
      devices.find((d) => d.serialNumber === context?.newDeviceSerial) ||
      devices.find(
        (d) => d.assignedTechnicianId === tech.id && d.status === 'Allocated'
      ) ||
      devices[0];

    const existingCard = jobCards.find(
      (jc) => jc.workOrderNumber === wo.workOrderNumber
    );

    if (existingCard) {
      const updatedCard: JobCardRecord = {
        ...existingCard,
        oldDeviceSerial:
          context?.oldDeviceSerial || existingCard.oldDeviceSerial,
        oldMeterReading:
          context?.oldMeterReading !== undefined
            ? context.oldMeterReading
            : existingCard.oldMeterReading,
        newMeterReading:
          context?.newMeterReading !== undefined
            ? context.newMeterReading
            : existingCard.newMeterReading,
        fieldNotes: context?.fieldNotes || existingCard.fieldNotes,
        photos: {
          ...existingCard.photos,
          oldMeterUrl:
            which === 'old'
              ? dataUrl
              : existingCard.photos.oldMeterUrl.startsWith('data:')
              ? existingCard.photos.oldMeterUrl
              : nextCaptured.oldMeterUrl || existingCard.photos.oldMeterUrl,
          newMeterUrl:
            which === 'new'
              ? dataUrl
              : existingCard.photos.newMeterUrl.startsWith('data:')
              ? existingCard.photos.newMeterUrl
              : nextCaptured.newMeterUrl || existingCard.photos.newMeterUrl,
          installationSiteUrl:
            which === 'new'
              ? dataUrl
              : existingCard.photos.installationSiteUrl.startsWith('data:')
              ? existingCard.photos.installationSiteUrl
              : dataUrl,
        },
      };
      const otherCards = jobCards
        .filter((jc) => jc.jobCardId !== existingCard.jobCardId)
        .map((jc) => ({
          ...jc,
          photos: {
            oldMeterUrl: jc.photos.oldMeterUrl.startsWith('data:')
              ? jc.photos.oldMeterUrl
              : nextCaptured.oldMeterUrl || jc.photos.oldMeterUrl,
            newMeterUrl: jc.photos.newMeterUrl.startsWith('data:')
              ? jc.photos.newMeterUrl
              : nextCaptured.newMeterUrl || jc.photos.newMeterUrl,
            installationSiteUrl: jc.photos.installationSiteUrl.startsWith(
              'data:'
            )
              ? jc.photos.installationSiteUrl
              : dataUrl,
          },
        }));
      const nextJCs = [updatedCard, ...otherCards];
      setJobCards(nextJCs);
      setSelectedJobCardId(existingCard.jobCardId);
      pushStateToServer({ jobCards: nextJCs, capturedPhotos: nextCaptured });
      if (currentUser) {
        syncJobCardToCloud(updatedCard, currentUser.uid);
      }
      return updatedCard;
    }

    // Create a live Job Card record for this Work Order immediately so Pages 2 & 3 have the captured photo right away
    const maxJcNum = jobCards.reduce((max, jc) => {
      const match = jc.jobCardId.match(/JC-2026-0(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return !isNaN(n) && n > max ? n : max;
    }, 903);
    const newJobCardId = `JC-2026-0${maxJcNum + 1}`;
    const now = new Date();
    const nowStamp = `${now.toLocaleDateString('en-GB')} · ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    const newCard: JobCardRecord = {
      jobCardId: newJobCardId,
      workOrderNumber: wo.workOrderNumber,
      customerName: wo.customerName,
      accountNumber: wo.accountNumber,
      address: wo.address,
      suburb: wo.suburb,
      ward: wo.ward,
      workType: wo.workType,
      technicianId: tech.id,
      technicianName: tech.name,
      employeeCode: tech.employeeCode,
      oldDeviceSerial: context?.oldDeviceSerial || wo.oldDeviceSerial,
      oldDeviceMake: wo.oldDeviceMake,
      oldMeterReading:
        context?.oldMeterReading !== undefined
          ? context.oldMeterReading
          : wo.existingReading,
      newDeviceSerial: context?.newDeviceSerial || dev.serialNumber,
      newDeviceModel: dev.model,
      newDeviceManufacturer: dev.manufacturer,
      newMeterReading: context?.newMeterReading || 0,
      sealNumber: dev.sealNumber || 'SL-90412',
      installationStatus: 'Completed',
      installationDate: nowStamp,
      gpsCoordinates: context?.gpsCoordinates || '-26.2485° S, 27.8540° E',
      fieldNotes:
        context?.fieldNotes ||
        `New ${dev.model} (#${dev.serialNumber}) installed. Old ${wo.oldDeviceMake} removed.`,
      photos: {
        oldMeterUrl:
          which === 'old'
            ? dataUrl
            : nextCaptured.oldMeterUrl || DEFAULT_PHOTOS.oldMeterUrl,
        newMeterUrl:
          which === 'new'
            ? dataUrl
            : nextCaptured.newMeterUrl || DEFAULT_PHOTOS.newMeterUrl,
        installationSiteUrl: dataUrl,
      },
      reviewStatus: 'Ready for Review',
      generatedAt: `${nowStamp}:00`,
    };

    const updatedExistingCards = jobCards.map((jc) => ({
      ...jc,
      photos: {
        oldMeterUrl: jc.photos.oldMeterUrl.startsWith('data:')
          ? jc.photos.oldMeterUrl
          : nextCaptured.oldMeterUrl || jc.photos.oldMeterUrl,
        newMeterUrl: jc.photos.newMeterUrl.startsWith('data:')
          ? jc.photos.newMeterUrl
          : nextCaptured.newMeterUrl || jc.photos.newMeterUrl,
        installationSiteUrl: jc.photos.installationSiteUrl.startsWith('data:')
          ? jc.photos.installationSiteUrl
          : dataUrl,
      },
    }));

    const nextJCs = [newCard, ...updatedExistingCards];
    setJobCards(nextJCs);
    setSelectedJobCardId(newJobCardId);
    pushStateToServer({ jobCards: nextJCs, capturedPhotos: nextCaptured });
    if (currentUser) {
      syncJobCardToCloud(newCard, currentUser.uid);
    }
    return newCard;
  };

  const handleSubmitJobCardToMunicipality = (jobCardId: string) => {
    const targetCard = jobCards.find((j) => j.jobCardId === jobCardId);
    const submittedStamp = '26 September 2026 · 15:45:00';
    const nextJCs: JobCardRecord[] = jobCards.map((j) =>
      j.jobCardId === jobCardId
        ? {
            ...j,
            reviewStatus: 'Submitted to Municipality',
            submittedAt: submittedStamp,
          }
        : j
    );
    setJobCards(nextJCs);
    if (targetCard) {
      const nextWOs: WorkOrder[] = workOrders.map((w) =>
        w.workOrderNumber === targetCard.workOrderNumber
          ? { ...w, status: 'Submitted' }
          : w
      );
      setWorkOrders(nextWOs);
      pushStateToServer({ workOrders: nextWOs, jobCards: nextJCs });
      if (currentUser) {
        updateJobCardInCloud(
          jobCardId,
          'Submitted to Municipality',
          submittedStamp
        );
        updateWorkOrderInCloud(targetCard.workOrderNumber, {
          status: 'Submitted',
          assignedTechnicianId: targetCard.technicianId,
          assignedTechnicianName: targetCard.technicianName,
          completedDate: 'Submitted 09:11',
          installedDeviceSerial: targetCard.newDeviceSerial,
          jobCardId: targetCard.jobCardId,
        });
      }
    } else {
      pushStateToServer({ jobCards: nextJCs });
    }
  };

  const handleBatchSubmitAllJobCards = (): number => {
    const readyCards = jobCards.filter(
      (j) => j.reviewStatus === 'Ready for Review'
    );
    const readyWONums = new Set(readyCards.map((c) => c.workOrderNumber));
    const submittedStamp = '26 September 2026 · 15:45:00';

    const nextJCs: JobCardRecord[] = jobCards.map((j) =>
      j.reviewStatus === 'Ready for Review'
        ? {
            ...j,
            reviewStatus: 'Submitted to Municipality',
            submittedAt: submittedStamp,
          }
        : j
    );

    const nextWOs: WorkOrder[] = workOrders.map((w) =>
      readyWONums.has(w.workOrderNumber) ? { ...w, status: 'Submitted' } : w
    );

    setJobCards(nextJCs);
    setWorkOrders(nextWOs);
    pushStateToServer({ workOrders: nextWOs, jobCards: nextJCs });

    if (currentUser) {
      readyCards.forEach((c) => {
        updateJobCardInCloud(
          c.jobCardId,
          'Submitted to Municipality',
          submittedStamp
        );
      });
    }

    return readyCards.length;
  };

  // Desktop navigation items strictly structured per user specification:
  // Overview -> Control Tower
  // Operations -> Work Orders, Devices, Technicians
  // Intelligence -> Reports
  // Administration -> Settings
  const adminNavItems: {
    id: ActiveModule;
    label: string;
    group: 'Overview' | 'Operations' | 'Intelligence';
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'control-tower',
      label: 'Control Tower',
      group: 'Overview',
      count:
        devices.filter((d) => d.status === 'Investigation').length +
        workOrders.filter((w) => w.status === 'Exception').length,
      icon: LayoutDashboard,
    },
    {
      id: 'work-orders',
      label: 'Work Orders',
      group: 'Operations',
      count: workOrders.length,
      icon: ClipboardList,
    },
    {
      id: 'stock-control',
      label: 'Devices',
      group: 'Operations',
      count: devices.length,
      icon: Package,
    },
    {
      id: 'tech-allocation',
      label: 'Technicians',
      group: 'Operations',
      count: technicians.length,
      icon: Users,
    },
    {
      id: 'job-cards',
      label: 'Reports',
      group: 'Intelligence',
      count: jobCards.length,
      icon: FileCheck2,
    },
  ];

  const activeNavMeta = adminNavItems.find((i) => i.id === activeModule) || {
    id: 'control-tower' as ActiveModule,
    label: 'Control Tower',
    group: 'Overview',
  };

  const renderSidebarNavContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <a
            href="#control-tower"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('control-tower');
              if (isMobile) setMobileNavOpen(false);
            }}
            className="flex items-center gap-3 text-white font-semibold tracking-tight text-base"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide text-white leading-none">
                PRIMECHAIN
              </span>
              <span className="text-[11px] font-normal text-slate-400 mt-1 leading-none">
                Operations Platform
              </span>
            </div>
          </a>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Organization Context */}
        <div className="p-4 border-b border-slate-800/70">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">LightUp Enterprise</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              City Power JHB · SDC Randburg
            </div>
          </div>
        </div>

        {/* Structured Platform Navigation */}
        <div className="p-3.5 space-y-6">
          {/* Group 1: Overview */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Overview
            </div>
            {adminNavItems
              .filter((i) => i.group === 'Overview')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleNavigate(item.id);
                      if (isMobile) setMobileNavOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Group 2: Operations */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Operations
            </div>
            {adminNavItems
              .filter((i) => i.group === 'Operations')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleNavigate(item.id);
                      if (isMobile) setMobileNavOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Group 3: Intelligence */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Intelligence
            </div>
            {adminNavItems
              .filter((i) => i.group === 'Intelligence')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleNavigate(item.id);
                      if (isMobile) setMobileNavOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Group 4: Administration */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Administration
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPilotModal(true);
                if (isMobile) setMobileNavOpen(false);
              }}
              className="w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3 truncate">
                <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">Settings</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Operator Session */}
      <div className="p-4 border-t border-slate-800/80 bg-[#070B14]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser?.displayName || 'Skhumbuzo'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Operations Administrator
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDemoData}
            title="Reset Operational Shift Data"
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  const handleSelectRoleAndUser = (
    nextRole: 'admin' | 'technician',
    techId?: string
  ) => {
    setUserRole(nextRole);
    if (techId) {
      setLoggedInTechId(techId);
    }
    if (nextRole === 'technician') {
      setActiveModule('field-capture');
    } else if (activeModule === 'field-capture') {
      setActiveModule('control-tower');
    }
  };

  const activeTechObj =
    technicians.find((t) => t.id === loggedInTechId) || technicians[0];

  // =========================================================================
  // ROLE 1: FIELD TECHNICIAN OPERATING VIEW (MOBILE FIELD SCREEN ONLY)
  // Under normal operating rights, technicians only have access to PrimeChain Field.
  // =========================================================================
  if (userRole === 'technician') {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex flex-col">
        <OfflineIndicator />

        <PilotLaunchModal
          isOpen={showPilotModal}
          onClose={() => setShowPilotModal(false)}
          user={currentUser}
          isCloudSynced={isCloudSynced}
          syncError={syncError}
          onSignIn={async () => {
            setSyncError(null);
            const res = await signInForPilot();
            if (!res) {
              setSyncError(
                'Google sign-in popup was closed or blocked. Local & offline persistence remains active.'
              );
            }
          }}
          onSignOut={async () => {
            await signOutFromPilot();
          }}
          onResetCloudData={() => handlePushSeedDataToCloud()}
          userRole={userRole}
          loggedInTechId={loggedInTechId}
          technicians={technicians}
          onSelectRoleAndUser={handleSelectRoleAndUser}
        />

        {/* Enterprise Mobile Operator Bar */}
        <header className="bg-[#0F172A] border-b border-slate-800 px-3 sm:px-4 h-14 flex items-center justify-between no-print shrink-0">
          <div className="max-w-lg w-full mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold tracking-tight text-white truncate">
                    PrimeChain Field
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-700/60 text-[10px] font-mono text-emerald-300"
                    title="Real-Time Desktop & Mobile Sync Active"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>LIVE</span>
                  </span>
                </div>
                <select
                  value={loggedInTechId}
                  onChange={(e) => setLoggedInTechId(e.target.value)}
                  aria-label="Select active technician crew"
                  className="bg-transparent text-[11px] font-mono text-blue-300 focus:outline-none cursor-pointer truncate max-w-[190px]"
                >
                  {technicians.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-slate-900 text-white"
                    >
                      {t.employeeCode} · {t.name} ({t.vehicleReg})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowDemoGuide((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded border text-xs font-medium cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  showDemoGuide
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Guide</span>
              </button>
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => setShowPilotModal(true)}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </div>
        </header>

        {showDemoGuide && (
          <DemoWalkthroughBar
            activeStageIndex={activeStageIndex}
            onSelectStage={(idx, mod) => {
              setActiveStageIndex(idx);
              if (mod === 'field-capture') {
                handleSelectRoleAndUser('technician', loggedInTechId);
              } else {
                handleSelectRoleAndUser('admin');
                setActiveModule(mod);
              }
            }}
            onClose={() => setShowDemoGuide(false)}
            onResetDemoData={handleResetDemoData}
          />
        )}

        {/* Locked-Down Technician Mobile Field Screen */}
        <main className="flex-1 w-full max-w-lg mx-auto px-2 sm:px-4 py-3">
          <FieldCaptureView
            technicians={technicians}
            workOrders={workOrders}
            devices={devices}
            jobCards={jobCards}
            capturedPhotos={capturedPhotos}
            initialHint={navigationHint}
            userRole="technician"
            loggedInTechId={loggedInTechId}
            onSelectTechId={(id) => setLoggedInTechId(id)}
            onSwitchRoleModal={() => setShowPilotModal(true)}
            isAndroidPilotMode={true}
            isCloudSynced={isCloudSynced}
            onExitAndroidPilotMode={() => handleSelectRoleAndUser('admin')}
            onSubmitInstallation={handleSubmitFieldInstallation}
            onLivePhotoCapture={handleLiveFieldPhotoCapture}
            onInspectJobCard={handleInspectJobCard}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // ROLE 2: OPERATIONS ADMINISTRATOR OPERATING VIEW (SAAS PLATFORM WORKSPACE)
  // Sidebar Navigation (256px) + Context Breadcrumb Top Bar + High-Density Canvas
  // =========================================================================
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#F8FAFC] text-slate-900">
      <OfflineIndicator />

      <PilotLaunchModal
        isOpen={showPilotModal}
        onClose={() => setShowPilotModal(false)}
        user={currentUser}
        isCloudSynced={isCloudSynced}
        syncError={syncError}
        onSignIn={async () => {
          setSyncError(null);
          const res = await signInForPilot();
          if (!res) {
            setSyncError(
              'Google sign-in popup was closed or blocked. Local & offline persistence remains active.'
            );
          }
        }}
        onSignOut={async () => {
          await signOutFromPilot();
        }}
        onResetCloudData={() => handlePushSeedDataToCloud()}
        userRole={userRole}
        loggedInTechId={loggedInTechId}
        technicians={technicians}
        onSelectRoleAndUser={handleSelectRoleAndUser}
      />

      {/* Mobile / Tablet Slide-Over Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#0B1120] text-slate-300 h-full z-10 shadow-2xl select-none">
            {renderSidebarNavContent(true)}
          </aside>
        </div>
      )}

      {/* =====================================================================
          ENTERPRISE LEFT SIDEBAR NAVIGATION (256px Fixed on Desktop)
         ===================================================================== */}
      <aside className="hidden lg:flex lg:w-64 bg-[#0B1120] text-slate-300 border-r border-slate-800/80 flex-col justify-between shrink-0 select-none no-print">
        {renderSidebarNavContent(false)}
      </aside>

      {/* =====================================================================
          MAIN SAAS WORKSPACE COLUMN
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        {/* Top Bar Contract: Strict 1-row, 3-zone header */}
        <header className="bg-white border-b border-slate-200/80 h-16 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 no-print">
          {/* Zone 1: Mobile Menu Trigger + Breadcrumb Trail */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-900 whitespace-nowrap">
              PrimeChain
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
              {activeNavMeta.group}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
            <span className="font-semibold text-slate-900 truncate">
              {activeNavMeta.label}
            </span>
          </div>

          {/* Zone 2: Horizontal Quick Switcher for Tablet Viewports */}
          <nav className="hidden md:flex lg:hidden items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
            {adminNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  activeModule === item.id
                    ? 'text-blue-600 font-semibold underline'
                    : 'hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Walkthrough Guide & Settings Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowDemoGuide((prev) => !prev)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs border ${
                showDemoGuide
                  ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                  : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Compass
                className={`w-3.5 h-3.5 ${
                  showDemoGuide ? 'text-blue-600' : 'text-slate-500'
                }`}
              />
              <span>Walkthrough Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPilotModal(true)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </button>
          </div>
        </header>

        {showDemoGuide && (
          <DemoWalkthroughBar
            activeStageIndex={activeStageIndex}
            onSelectStage={(idx, mod) => {
              setActiveStageIndex(idx);
              if (mod === 'field-capture') {
                handleSelectRoleAndUser('technician', loggedInTechId);
              } else {
                handleSelectRoleAndUser('admin');
                setActiveModule(mod);
              }
            }}
            onClose={() => setShowDemoGuide(false)}
            onResetDemoData={handleResetDemoData}
          />
        )}

        {/* Scrollable SaaS Content Viewport */}
        <main className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto">
            {activeModule === 'control-tower' && (
              <ControlTowerView
                devices={devices}
                workOrders={workOrders}
                technicians={technicians}
                jobCards={jobCards}
                onNavigate={(mod, hint) => {
                  if (mod === 'field-capture') {
                    if (hint) setNavigationHint(hint);
                    handleSelectRoleAndUser('technician', loggedInTechId);
                  } else {
                    handleNavigate(mod, hint);
                  }
                }}
                onSelectJobCard={handleInspectJobCard}
              />
            )}

            {activeModule === 'work-orders' && (
              <WorkOrdersView
                workOrders={workOrders}
                technicians={technicians}
                jobCards={jobCards}
                capturedPhotos={capturedPhotos}
                onImportBatch={handleImportWorkOrderBatch}
                onAddWorkOrder={handleAddWorkOrder}
                onAssignTechnician={handleAssignTechnicianToWO}
                onNavigate={(mod, hint) => {
                  if (mod === 'field-capture') {
                    if (hint) setNavigationHint(hint);
                    handleSelectRoleAndUser('technician', loggedInTechId);
                  } else {
                    handleNavigate(mod, hint);
                  }
                }}
                onSelectJobCard={handleInspectJobCard}
              />
            )}

            {activeModule === 'stock-control' && (
              <StockControlView
                devices={devices}
                technicians={technicians}
                initialSearchSerial={navigationHint}
                onRegisterDevice={handleRegisterSingleDevice}
                onRegisterBatch={handleRegisterStockBatch}
                onAllocateDevice={handleAllocateDevice}
                onReturnDeviceToStore={handleReturnDeviceToStore}
                onNavigate={(mod, hint) => {
                  if (mod === 'field-capture') {
                    if (hint) setNavigationHint(hint);
                    handleSelectRoleAndUser('technician', loggedInTechId);
                  } else {
                    handleNavigate(mod, hint);
                  }
                }}
              />
            )}

            {activeModule === 'tech-allocation' && (
              <TechAllocationView
                technicians={technicians}
                devices={devices}
                workOrders={workOrders}
                onAllocateDevice={handleAllocateDevice}
                onTransferDevice={handleAllocateDevice}
                onReturnDeviceToStore={handleReturnDeviceToStore}
                onAssignWorkOrder={handleAssignTechnicianToWO}
                onAddTechnician={handleAddTechnician}
                onNavigate={(mod, hint) => {
                  if (mod === 'field-capture') {
                    if (hint) setNavigationHint(hint);
                    handleSelectRoleAndUser('technician', loggedInTechId);
                  } else {
                    handleNavigate(mod, hint);
                  }
                }}
              />
            )}

            {activeModule === 'field-capture' && (
              <FieldCaptureView
                technicians={technicians}
                workOrders={workOrders}
                devices={devices}
                jobCards={jobCards}
                capturedPhotos={capturedPhotos}
                initialHint={navigationHint}
                userRole="admin"
                loggedInTechId={loggedInTechId}
                onSelectTechId={(id) => setLoggedInTechId(id)}
                onSwitchRoleModal={() => setShowPilotModal(true)}
                isAndroidPilotMode={false}
                isCloudSynced={isCloudSynced}
                onEnterAndroidPilotMode={() =>
                  handleSelectRoleAndUser('technician', loggedInTechId)
                }
                onSubmitInstallation={handleSubmitFieldInstallation}
                onLivePhotoCapture={handleLiveFieldPhotoCapture}
                onInspectJobCard={handleInspectJobCard}
              />
            )}

            {activeModule === 'job-cards' && (
              <JobCardsView
                jobCards={jobCards}
                capturedPhotos={capturedPhotos}
                selectedJobCardId={selectedJobCardId}
                onSelectJobCard={(id) => setSelectedJobCardId(id)}
                onSubmitToMunicipality={handleSubmitJobCardToMunicipality}
                onBatchSubmitAll={handleBatchSubmitAllJobCards}
                onUpdateJobCardPhoto={handleUpdateJobCardPhoto}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
