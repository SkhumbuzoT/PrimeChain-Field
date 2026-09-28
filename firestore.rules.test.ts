/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'create',
    auth: { uid: 'u1', email: 'tonytshuks@gmail.com', email_verified: false },
    payload: { serialNumber: '987654', ownerUid: 'u1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Create',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'create',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { serialNumber: '987654', ownerUid: 'u1', shadowAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Owner Impersonation on Create',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'create',
    auth: { uid: 'attacker', email: 'a@example.com', email_verified: true },
    payload: { serialNumber: '987654', ownerUid: 'victim' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Owner Mutation on Update',
    collection: 'pilot_work_orders',
    docId: 'WO-2264',
    operation: 'update',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { ownerUid: 'u2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID Mismatch Poisoning',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'create',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { serialNumber: 'DIFFERENT-ID', ownerUid: 'u1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'String Overflow in fieldNotes',
    collection: 'pilot_job_cards',
    docId: 'JC-2026-0901',
    operation: 'create',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { jobCardId: 'JC-2026-0901', fieldNotes: 'X'.repeat(2000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid Enum Status on Device',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'update',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { status: 'HACKED' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Client Timestamp on Create',
    collection: 'pilot_devices',
    docId: '987654',
    operation: 'create',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { serialNumber: '987654', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal createdAt Modification',
    collection: 'pilot_work_orders',
    docId: 'WO-2264',
    operation: 'update',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { createdAt: '2026-09-26T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Re-opening on Submitted Job Card',
    collection: 'pilot_job_cards',
    docId: 'JC-2026-0901',
    operation: 'update',
    auth: { uid: 'u1', email: 'tech@example.com', email_verified: true },
    payload: { reviewStatus: 'Ready for Review' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Cross-Tenant List Scraping',
    collection: 'pilot_work_orders',
    docId: '*',
    operation: 'list',
    auth: { uid: 'attacker', email: 'a@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    collection: 'admins',
    docId: 'attacker',
    operation: 'create',
    auth: { uid: 'attacker', email: 'a@example.com', email_verified: true },
    payload: { uid: 'attacker' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
