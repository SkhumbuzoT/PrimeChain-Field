# Security Specification — CustodyGrid Field Pilot

## 1. Data Invariants
1. **Identity & Ownership**: Every document in `pilot_devices`, `pilot_work_orders`, and `pilot_job_cards` must have `ownerUid == request.auth.uid` on creation, and `ownerUid` is immutable across all updates.
2. **Verified Authentication**: Every read and write requires an authenticated user with `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Document IDs (`{serialNumber}`, `{workOrderNumber}`, `{jobCardId}`) must match `^[a-zA-Z0-9_\-]+$` with length `<= 128` and equal the corresponding primary key field inside the document payload.
4. **Strict Key & Size Enforcement**: Every entity enforces `hasAll` and `hasOnly` key allowlists on creation, bounded `.size()` limits on every string field, and strict `affectedKeys().hasOnly(...)` action branches on updates.
5. **Temporal Integrity**: `createdAt` is immutable after creation and must equal `request.time` on creation; `updatedAt` must equal `request.time` on both creation and update.
6. **Terminal State Locking**: Once a `pilot_job_cards` document reaches `reviewStatus == 'Submitted to Municipality'` or a `pilot_work_orders` document reaches `status == 'Submitted'`, non-admin updates are blocked.
7. **Zero Client-Delegated List Queries**: Every `allow list` rule explicitly enforces `resource.data.ownerUid == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Authenticated request where `email_verified == false` attempting to create a device.
2. **Shadow Field Injection on Create**: Payload containing an undeclared `isSuperAdmin: true` property on `/pilot_devices/987654`.
3. **Owner Impersonation on Create**: Setting `ownerUid: "other-user-uid"` when `request.auth.uid == "attacker-uid"`.
4. **Owner Mutation on Update**: Updating `ownerUid` on an existing `/pilot_work_orders/WO-2264` document.
5. **Path ID Poisoning**: Creating `/pilot_devices/987654` with payload `serialNumber: "MET-88421"` or a 2KB junk ID.
6. **Denial-of-Wallet String Overflow**: Sending a 50,000-character string in `fieldNotes` on `/pilot_job_cards/JC-2026-0901`.
7. **Invalid Enum State**: Updating `status` on `/pilot_devices/987654` to `"DELETED_BY_HACKER"`.
8. **Forged Client Timestamp**: Creating a document with a past or future `createdAt` timestamp not matching `request.time`.
9. **Immortal `createdAt` Tampering**: Modifying `createdAt` during an update operation.
10. **Terminal State Re-opening**: Attempting to modify a Job Card after `reviewStatus == 'Submitted to Municipality'`.
11. **Unauthorized List Scraping**: Calling `list` on `/pilot_work_orders` without filtering by `ownerUid == request.auth.uid`.
12. **Self-Assigned Admin Escalation**: Attempting to write directly to `/admins/attacker-uid`.
