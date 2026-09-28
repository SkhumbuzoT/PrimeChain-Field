/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
} from './firebase';

const STORAGE_KEYS = {
  DEVICES: 'primechain_devices_v3',
  WORK_ORDERS: 'primechain_workorders_v3',
  TECHNICIANS: 'primechain_technicians_v3',
  JOB_CARDS: 'primechain_jobcards_v3',
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setIsCloudSynced(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Seed / Push current pilot data to Firestore
  const handlePushSeedDataToCloud = async (uidOverride?: string) => {
    const uid = uidOverride || currentUser?.uid;
    if (!uid) return;
    setIsSyncing(true);
    try {
      for (const dev of devices) {
        await syncDeviceToCloud(dev, uid);
      }
      for (const wo of workOrders) {
        await syncWorkOrderToCloud(wo, uid);
      }
      for (const jc of jobCards) {
        await syncJobCardToCloud(jc, uid);
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
          // Auto-seed initial pilot batch on first cloud login
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
        setDevices(cloudDevices);
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
        setWorkOrders(cloudWOs);
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
            photos: DEFAULT_PHOTOS,
            reviewStatus: j.reviewStatus,
            generatedAt: j.generatedAt,
            submittedAt: j.submittedAt || undefined,
          };
        });
        setJobCards(cloudJCs);
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
    setSelectedJobCardId('JC-2026-0901');
    setNavigationHint(undefined);
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
    const baseNum = 8840 + workOrders.length + 1;
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
        dateAllocated: '26 September 2026',
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
        dateAllocated: '26 September 2026',
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
        dateAllocated: '26 September 2026',
        municipalNotes:
          'Imported via municipal CSV batch. Smart meter replacement.',
      },
    ];
    setWorkOrders((prev) => [...importedBatch, ...prev]);
    if (currentUser) {
      importedBatch.forEach((wo) => syncWorkOrderToCloud(wo, currentUser.uid));
    }
    return importedBatch.length;
  };

  const handleAddWorkOrder = (wo: WorkOrder) => {
    setWorkOrders((prev) => [wo, ...prev]);
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
    setWorkOrders((prev) =>
      prev.map((w) =>
        w.workOrderNumber === workOrderNumber
          ? {
              ...w,
              status: w.status === 'Received' ? 'Assigned' : w.status,
              assignedTechnicianId: tech.id,
              assignedTechnicianName: tech.name,
            }
          : w
      )
    );
    if (currentUser) {
      updateWorkOrderInCloud(workOrderNumber, {
        status: 'Assigned',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name,
      });
    }
  };

  const handleRegisterSingleDevice = (device: MeterDevice) => {
    setDevices((prev) => [device, ...prev]);
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

    setDevices((prev) => [...newBatch, ...prev]);
    if (currentUser) {
      newBatch.forEach((dev) => syncDeviceToCloud(dev, currentUser.uid));
    }
    return newBatch.length;
  };

  const handleAllocateDevice = (serialNumber: string, technicianId: string) => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech) return;
    setDevices((prev) =>
      prev.map((d) => {
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
      })
    );
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
    setDevices((prev) =>
      prev.map((d) => {
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
      })
    );
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
    setTechnicians((prev) => [...prev, tech]);
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

    const nextJcNum = 900 + jobCards.length + 1;
    const newJobCardId = `JC-2026-0${nextJcNum}`;
    const nowStamp = '26 September 2026 · 09:11';

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

    setDevices((prev) =>
      prev.map((d) => {
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
      })
    );

    setWorkOrders((prev) =>
      prev.map((w) => {
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
      })
    );

    setJobCards((prev) => [newJobCard, ...prev]);
    setSelectedJobCardId(newJobCardId);

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

  const handleSubmitJobCardToMunicipality = (jobCardId: string) => {
    const targetCard = jobCards.find((j) => j.jobCardId === jobCardId);
    const submittedStamp = '26 September 2026 · 15:45:00';
    setJobCards((prev) =>
      prev.map((j) =>
        j.jobCardId === jobCardId
          ? {
              ...j,
              reviewStatus: 'Submitted to Municipality',
              submittedAt: submittedStamp,
            }
          : j
      )
    );
    if (targetCard) {
      setWorkOrders((prev) =>
        prev.map((w) =>
          w.workOrderNumber === targetCard.workOrderNumber
            ? { ...w, status: 'Submitted' }
            : w
        )
      );
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
    }
  };

  const handleBatchSubmitAllJobCards = (): number => {
    const readyCards = jobCards.filter(
      (j) => j.reviewStatus === 'Ready for Review'
    );
    const readyWONums = new Set(readyCards.map((c) => c.workOrderNumber));
    const submittedStamp = '26 September 2026 · 15:45:00';

    setJobCards((prev) =>
      prev.map((j) =>
        j.reviewStatus === 'Ready for Review'
          ? {
              ...j,
              reviewStatus: 'Submitted to Municipality',
              submittedAt: submittedStamp,
            }
          : j
      )
    );

    setWorkOrders((prev) =>
      prev.map((w) =>
        readyWONums.has(w.workOrderNumber) ? { ...w, status: 'Submitted' } : w
      )
    );

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

  // Desktop navigation items strictly for Operations Administrator role
  const adminNavItems: {
    id: ActiveModule;
    label: string;
    group: 'Operations & Dispatch' | 'Inventory & Compliance';
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'control-tower',
      label: 'Operations Dashboard',
      group: 'Operations & Dispatch',
      count:
        devices.filter((d) => d.status === 'Investigation').length +
        workOrders.filter((w) => w.status === 'Exception').length,
      icon: LayoutDashboard,
    },
    {
      id: 'work-orders',
      label: 'Work Order Register',
      group: 'Operations & Dispatch',
      count: workOrders.length,
      icon: ClipboardList,
    },
    {
      id: 'tech-allocation',
      label: 'Crew & Stock Dispatch',
      group: 'Operations & Dispatch',
      count: technicians.length,
      icon: Truck,
    },
    {
      id: 'stock-control',
      label: 'Meter Asset Ledger',
      group: 'Inventory & Compliance',
      count: devices.length,
      icon: Package,
    },
    {
      id: 'job-cards',
      label: 'Commissioning Sheets',
      group: 'Inventory & Compliance',
      count: jobCards.length,
      icon: FileCheck2,
    },
  ];

  const activeNavMeta = adminNavItems.find((i) => i.id === activeModule) || {
    id: 'field-capture' as ActiveModule,
    label: 'Field Mobile Terminal',
    group: 'Operations & Dispatch',
  };

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
        <header className="bg-[#0F172A] border-b border-slate-800 px-4 h-14 flex items-center justify-between no-print shrink-0">
          <div className="max-w-lg w-full mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight text-white truncate">
                  PrimeChain Field
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {activeTechObj.employeeCode} · {activeTechObj.name} ·{' '}
                  {activeTechObj.vehicleReg}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => setShowPilotModal(true)}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
              >
                Role / User
              </button>
            </div>
          </div>
        </header>

        {/* Locked-Down Technician Mobile Field Screen */}
        <main className="flex-1 w-full max-w-lg mx-auto px-2 sm:px-4 py-3">
          <FieldCaptureView
            technicians={technicians}
            workOrders={workOrders}
            devices={devices}
            initialHint={navigationHint}
            userRole="technician"
            loggedInTechId={loggedInTechId}
            onSelectTechId={(id) => setLoggedInTechId(id)}
            onSwitchRoleModal={() => setShowPilotModal(true)}
            isAndroidPilotMode={true}
            isCloudSynced={isCloudSynced}
            onExitAndroidPilotMode={() => handleSelectRoleAndUser('admin')}
            onSubmitInstallation={handleSubmitFieldInstallation}
            onInspectJobCard={handleInspectJobCard}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // ROLE 2: OPERATIONS ADMINISTRATOR OPERATING VIEW (ENTERPRISE ERP WORKSPACE)
  // Sidebar Navigation (256px) + Context Breadcrumb Top Bar + High-Density Canvas
  // =========================================================================
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#F1F5F9] text-slate-900">
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

      {/* =====================================================================
          ENTERPRISE LEFT SIDEBAR NAVIGATION (256px Fixed on Desktop)
         ===================================================================== */}
      <aside className="hidden lg:flex lg:w-64 bg-[#0B1120] text-slate-300 border-r border-slate-800 flex-col justify-between shrink-0 select-none no-print">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-5 border-b border-slate-800/90 flex items-center justify-between">
            <a
              href="#control-tower"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate('control-tower');
              }}
              className="flex items-center gap-2.5 text-white font-semibold tracking-tight text-base"
            >
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span>PrimeChain</span>
            </a>
            <span className="text-[11px] font-mono text-slate-500">ERP 2.4</span>
          </div>

          {/* Organization / Contract Context Selector */}
          <div className="p-3.5 border-b border-slate-800/80">
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800/90 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">LightUp Enterprise</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                City Power JHB · SDC Randburg
              </div>
            </div>
          </div>

          {/* Primary Navigation Groups */}
          <div className="p-3 space-y-5">
            {/* Group 1: Operations & Dispatch */}
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-500 tracking-wider">
                Operations & Dispatch
              </div>
              {adminNavItems
                .filter((i) => i.group === 'Operations & Dispatch')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full px-2.5 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Group 2: Inventory & Compliance */}
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-500 tracking-wider">
                Inventory & Compliance
              </div>
              {adminNavItems
                .filter((i) => i.group === 'Inventory & Compliance')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full px-2.5 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Group 3: Field Mobile Terminal */}
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-500 tracking-wider">
                Field Operations
              </div>
              <button
                type="button"
                onClick={() => handleNavigate('field-capture')}
                className={`w-full px-2.5 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  activeModule === 'field-capture'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Smartphone
                    className={`w-4 h-4 shrink-0 ${
                      activeModule === 'field-capture'
                        ? 'text-white'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">Field Mobile Console</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">PWA</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Operator Session & System Controls */}
        <div className="p-3.5 border-t border-slate-800/90 space-y-2.5 bg-[#080D1A]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.displayName || 'R. Naidoo'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Operations Administrator
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetDemoData}
              title="Reset Operational Shift Data"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectRoleAndUser('technician', loggedInTechId)}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 text-center transition-colors cursor-pointer truncate"
            >
              Tech View
            </button>
            <button
              type="button"
              onClick={() => setShowPilotModal(true)}
              className="px-2.5 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-[11px] font-medium text-blue-300 text-center transition-colors cursor-pointer truncate"
            >
              Access & Sync
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN ENTERPRISE WORKSPACE COLUMN
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        {/* Top Bar Contract: Strict 1-row, 3-zone header */}
        <header className="bg-white border-b border-slate-200 h-14 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 no-print">
          {/* Zone 1: Brand / Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
            <span className="font-semibold text-slate-900 whitespace-nowrap">
              PrimeChain
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
              {activeNavMeta.group}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline shrink-0" />
            <span className="font-semibold text-slate-900 truncate">
              {activeNavMeta.label}
            </span>
          </div>

          {/* Zone 2: Horizontal Navigation Links for Tablet/Compact Viewports */}
          <nav className="flex lg:hidden items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
            {adminNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeModule === item.id
                    ? 'text-blue-700 font-semibold underline'
                    : 'hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Role & Access Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectRoleAndUser('technician', loggedInTechId)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-600" />
              <span>Technician View ({activeTechObj.name.split(' ')[0]})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPilotModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>User Rights & Role</span>
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
                setActiveModule(mod);
              }
            }}
            onClose={() => setShowDemoGuide(false)}
            onResetDemoData={handleResetDemoData}
          />
        )}

        {/* Scrollable High-Density Enterprise Content Viewport */}
        <main className="flex-1 lg:overflow-y-auto p-4 sm:p-6">
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
                onInspectJobCard={handleInspectJobCard}
              />
            )}

            {activeModule === 'job-cards' && (
              <JobCardsView
                jobCards={jobCards}
                selectedJobCardId={selectedJobCardId}
                onSelectJobCard={(id) => setSelectedJobCardId(id)}
                onSubmitToMunicipality={handleSubmitJobCardToMunicipality}
                onBatchSubmitAll={handleBatchSubmitAllJobCards}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
