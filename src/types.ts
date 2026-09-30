export type WorkType = 'Installation' | 'Audit' | 'Cut-Off';

export type WorkOrderStatus =
  | 'Received'
  | 'Assigned'
  | 'Completed'
  | 'Submitted'
  | 'Exception';

export type DeviceStatus =
  | 'Available'
  | 'Allocated'
  | 'Installed'
  | 'Investigation';

export interface CustodyEvent {
  id: string;
  timestamp: string;
  status: DeviceStatus;
  actor: string;
  locationOrHolder: string;
  workOrderNumber?: string;
  note: string;
}

export interface MeterDevice {
  serialNumber: string;
  model: string;
  deviceType: string;
  manufacturer: string;
  dateReceived: string;
  batchNumber: string;
  status: DeviceStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  dateIssued?: string;
  installedWorkOrderNumber?: string;
  installedDate?: string;
  sealNumber?: string;
  custodyHistory: CustodyEvent[];
}

export interface WorkOrder {
  workOrderNumber: string;
  municipalBatchId: string;
  customerName: string;
  accountNumber: string;
  address: string;
  suburb: string;
  ward: string;
  oldDeviceSerial: string;
  oldDeviceMake: string;
  existingReading: number;
  workType: WorkType;
  status: WorkOrderStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  dateAllocated: string;
  completedDate?: string;
  installedDeviceSerial?: string;
  jobCardId?: string;
  exceptionReason?: string;
  municipalNotes: string;
}

export interface Technician {
  id: string;
  name: string;
  employeeCode: string;
  region: string;
  phone: string;
  vehicleReg: string;
  dailyTarget: number;
}

export interface JobCardRecord {
  jobCardId: string;
  workOrderNumber: string;
  customerName: string;
  accountNumber: string;
  address: string;
  suburb: string;
  ward: string;
  workType: WorkType;
  technicianId: string;
  technicianName: string;
  employeeCode: string;
  oldDeviceSerial: string;
  oldDeviceMake: string;
  oldMeterReading: number;
  newDeviceSerial: string;
  newDeviceModel: string;
  newDeviceManufacturer: string;
  newMeterReading: number;
  sealNumber: string;
  installationStatus: 'Completed' | 'Audit Verified' | 'Cut-Off Executed' | 'Exception';
  installationDate: string;
  gpsCoordinates: string;
  fieldNotes: string;
  photos: {
    oldMeterUrl: string;
    newMeterUrl: string;
    installationSiteUrl: string;
  };
  reviewStatus: 'Ready for Review' | 'Submitted to Municipality' | 'Flagged Exception';
  generatedAt: string;
  submittedAt?: string;
}

export type ActiveModule =
  | 'control-tower'
  | 'work-orders'
  | 'stock-control'
  | 'tech-allocation'
  | 'field-capture'
  | 'job-cards';

export interface PlatformUser {
  id: string;
  name: string;
  emailOrCode: string;
  pinOrPassword: string;
  role: 'admin' | 'technician';
  title: string;
  technicianId?: string;
  status: 'Active' | 'Suspended';
  createdAt: string;
}

