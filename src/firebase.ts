import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { MeterDevice, WorkOrder, JobCardRecord } from './types';

const app = initializeApp(firebaseConfig);
setLogLevel('silent');
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    (error instanceof Error && error.name === 'AbortError') ||
    msg.includes('The user aborted a request') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable')
  ) {
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInForPilot() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('popup-closed-by-user') ||
      msg.includes('cancelled-popup-request') ||
      msg.includes('The user aborted a request')
    ) {
      return null;
    }
    throw error;
  }
}

export async function signOutFromPilot() {
  return signOut(auth);
}

// Sanitize strings to match firebase-blueprint.json maxLengths & patterns
function cleanStr(val: string | undefined, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}

function cleanId(val: string, maxLen = 64): string {
  return val.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, maxLen);
}

export async function syncDeviceToCloud(device: MeterDevice, ownerUid: string) {
  const safeId = cleanId(device.serialNumber);
  const path = `pilot_devices/${safeId}`;
  try {
    await setDoc(doc(db, 'pilot_devices', safeId), {
      serialNumber: safeId,
      model: cleanStr(device.model, 120) || 'Smart Meter',
      deviceType: cleanStr(device.deviceType, 120) || 'Single-Phase',
      manufacturer: cleanStr(device.manufacturer, 80) || 'Conlog',
      dateReceived: cleanStr(device.dateReceived, 80) || '14 September 2026',
      batchNumber: cleanStr(device.batchNumber, 80) || 'MUN-BATCH-09A',
      status: device.status,
      assignedTechnicianId: cleanStr(device.assignedTechnicianId, 64),
      assignedTechnicianName: cleanStr(device.assignedTechnicianName, 120),
      dateIssued: cleanStr(device.dateIssued, 80),
      installedWorkOrderNumber: cleanStr(device.installedWorkOrderNumber, 64),
      installedDate: cleanStr(device.installedDate, 80),
      sealNumber: cleanStr(device.sealNumber, 64) || 'SL-90400',
      ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDeviceStatusInCloud(
  serialNumber: string,
  updates: {
    status: MeterDevice['status'];
    assignedTechnicianId?: string;
    assignedTechnicianName?: string;
    dateIssued?: string;
    installedWorkOrderNumber?: string;
    installedDate?: string;
  }
) {
  const safeId = cleanId(serialNumber);
  const path = `pilot_devices/${safeId}`;
  try {
    await updateDoc(doc(db, 'pilot_devices', safeId), {
      status: updates.status,
      assignedTechnicianId: cleanStr(updates.assignedTechnicianId, 64),
      assignedTechnicianName: cleanStr(updates.assignedTechnicianName, 120),
      dateIssued: cleanStr(updates.dateIssued, 80),
      installedWorkOrderNumber: cleanStr(updates.installedWorkOrderNumber, 64),
      installedDate: cleanStr(updates.installedDate, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncWorkOrderToCloud(wo: WorkOrder, ownerUid: string) {
  const safeId = cleanId(wo.workOrderNumber);
  const path = `pilot_work_orders/${safeId}`;
  try {
    await setDoc(doc(db, 'pilot_work_orders', safeId), {
      workOrderNumber: safeId,
      municipalBatchId: cleanStr(wo.municipalBatchId, 80) || 'JHB-2026-0441',
      customerName: cleanStr(wo.customerName, 120) || 'Customer',
      accountNumber: cleanStr(wo.accountNumber, 64) || 'ACC-001',
      address: cleanStr(wo.address, 200) || 'Address',
      suburb: cleanStr(wo.suburb, 80) || 'Suburb',
      ward: cleanStr(wo.ward, 64) || 'Ward 1',
      oldDeviceSerial: cleanStr(wo.oldDeviceSerial, 64) || 'OLD-001',
      oldDeviceMake: cleanStr(wo.oldDeviceMake, 120) || 'Meter',
      existingReading: Math.max(0, Number(wo.existingReading) || 0),
      workType: wo.workType,
      status: wo.status,
      assignedTechnicianId: cleanStr(wo.assignedTechnicianId, 64),
      assignedTechnicianName: cleanStr(wo.assignedTechnicianName, 120),
      dateAllocated: cleanStr(wo.dateAllocated, 80) || '17 September 2026',
      completedDate: cleanStr(wo.completedDate, 80),
      installedDeviceSerial: cleanStr(wo.installedDeviceSerial, 64),
      jobCardId: cleanStr(wo.jobCardId, 64),
      exceptionReason: cleanStr(wo.exceptionReason, 300),
      municipalNotes: cleanStr(wo.municipalNotes, 400),
      ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateWorkOrderInCloud(
  workOrderNumber: string,
  updates: {
    status: WorkOrder['status'];
    assignedTechnicianId?: string;
    assignedTechnicianName?: string;
    completedDate?: string;
    installedDeviceSerial?: string;
    jobCardId?: string;
    exceptionReason?: string;
  }
) {
  const safeId = cleanId(workOrderNumber);
  const path = `pilot_work_orders/${safeId}`;
  try {
    await updateDoc(doc(db, 'pilot_work_orders', safeId), {
      status: updates.status,
      assignedTechnicianId: cleanStr(updates.assignedTechnicianId, 64),
      assignedTechnicianName: cleanStr(updates.assignedTechnicianName, 120),
      completedDate: cleanStr(updates.completedDate, 80),
      installedDeviceSerial: cleanStr(updates.installedDeviceSerial, 64),
      jobCardId: cleanStr(updates.jobCardId, 64),
      exceptionReason: cleanStr(updates.exceptionReason, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncJobCardToCloud(jc: JobCardRecord, ownerUid: string) {
  const safeId = cleanId(jc.jobCardId);
  const path = `pilot_job_cards/${safeId}`;
  try {
    await setDoc(doc(db, 'pilot_job_cards', safeId), {
      jobCardId: safeId,
      workOrderNumber: cleanId(jc.workOrderNumber),
      customerName: cleanStr(jc.customerName, 120) || 'Customer',
      accountNumber: cleanStr(jc.accountNumber, 64) || 'ACC-001',
      address: cleanStr(jc.address, 200) || 'Address',
      suburb: cleanStr(jc.suburb, 80) || 'Suburb',
      ward: cleanStr(jc.ward, 64) || 'Ward 1',
      workType: jc.workType,
      technicianId: cleanStr(jc.technicianId, 64) || 'TECH-01',
      technicianName: cleanStr(jc.technicianName, 120) || 'Technician',
      employeeCode: cleanStr(jc.employeeCode, 64) || 'SN-0042',
      oldDeviceSerial: cleanStr(jc.oldDeviceSerial, 64) || 'OLD-001',
      oldDeviceMake: cleanStr(jc.oldDeviceMake, 120) || 'Meter',
      oldMeterReading: Math.max(0, Number(jc.oldMeterReading) || 0),
      newDeviceSerial: cleanStr(jc.newDeviceSerial, 64) || 'NEW-001',
      newDeviceModel: cleanStr(jc.newDeviceModel, 120) || 'Smart Meter',
      newDeviceManufacturer: cleanStr(jc.newDeviceManufacturer, 80) || 'Conlog',
      newMeterReading: Math.max(0, Number(jc.newMeterReading) || 0),
      sealNumber: cleanStr(jc.sealNumber, 64) || 'SL-90400',
      installationStatus: jc.installationStatus,
      installationDate: cleanStr(jc.installationDate, 80) || '26 September 2026',
      gpsCoordinates: cleanStr(jc.gpsCoordinates, 120) || '-26.2485, 27.8540',
      fieldNotes: cleanStr(jc.fieldNotes, 500),
      reviewStatus: jc.reviewStatus,
      generatedAt: cleanStr(jc.generatedAt, 80) || '26 September 2026',
      submittedAt: cleanStr(jc.submittedAt, 80),
      ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateJobCardInCloud(
  jobCardId: string,
  reviewStatus: JobCardRecord['reviewStatus'],
  submittedAt: string
) {
  const safeId = cleanId(jobCardId);
  const path = `pilot_job_cards/${safeId}`;
  try {
    await updateDoc(doc(db, 'pilot_job_cards', safeId), {
      reviewStatus,
      submittedAt: cleanStr(submittedAt, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
