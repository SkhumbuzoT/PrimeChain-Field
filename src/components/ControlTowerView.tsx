import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
  Package,
  Truck,
  Users,
  CheckCircle2,
  X,
  Clock,
  ShieldAlert,
  ChevronRight,
  Sun,
  MoreVertical,
  Check,
} from 'lucide-react';
import {
  MeterDevice,
  WorkOrder,
  Technician,
  JobCardRecord,
  ActiveModule,
} from '../types';

interface ControlTowerViewProps {
  devices: MeterDevice[];
  workOrders: WorkOrder[];
  technicians: Technician[];
  jobCards: JobCardRecord[];
  onNavigate: (module: ActiveModule, filterHint?: string) => void;
  onSelectJobCard: (jobCardId: string) => void;
  operatorName?: string;
  operatorRoleTitle?: string;
  onOpenProfileSettings?: () => void;
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  devices,
  workOrders,
  technicians,
  jobCards,
  onNavigate,
  onSelectJobCard,
  operatorName = 'Sipho',
  operatorRoleTitle = 'Operations Administrator',
  onOpenProfileSettings,
}) => {
  const [traceQuery, setTraceQuery] = useState('');
  const [selectedTraceSerial, setSelectedTraceSerial] = useState<string | null>(null);

  // Stock lifecycle buckets
  const availableStock = devices.filter((d) => d.status === 'Available');
  const allocatedStock = devices.filter((d) => d.status === 'Allocated');
  const installedStock = devices.filter((d) => d.status === 'Installed');
  const investigationStock = devices.filter((d) => d.status === 'Investigation');

  // Work order lifecycle buckets
  const receivedWOs = workOrders.filter((w) => w.status === 'Received');
  const assignedWOs = workOrders.filter((w) => w.status === 'Assigned');
  const completedWOs = workOrders.filter(
    (w) => w.status === 'Completed' || w.status === 'Submitted'
  );
  const exceptionWOs = workOrders.filter((w) => w.status === 'Exception');
  const totalExceptionsCount = investigationStock.length + exceptionWOs.length;

  // Job card buckets
  const readyJobCards = jobCards.filter((jc) => jc.reviewStatus === 'Ready for Review');
  const submittedJobCards = jobCards.filter(
    (jc) => jc.reviewStatus === 'Submitted to Municipality'
  );

  // Stock distribution percentages
  const totalDevices = devices.length || 1;
  const pctInstalled = Math.round((installedStock.length / totalDevices) * 100);
  const pctAllocated = Math.round((allocatedStock.length / totalDevices) * 100);
  const pctAvailable = Math.round((availableStock.length / totalDevices) * 100);
  const pctInvestigation = Math.max(
    100 - pctInstalled - pctAllocated - pctAvailable,
    investigationStock.length > 0 ? 6 : 0
  );

  // Active traceability lookup
  const activeQuery = (selectedTraceSerial || traceQuery).trim().toLowerCase();
  const tracedDevice = activeQuery
    ? devices.find(
        (d) =>
          d.serialNumber.toLowerCase() === activeQuery ||
          d.serialNumber.toLowerCase().includes(activeQuery) ||
          (d.installedWorkOrderNumber &&
            d.installedWorkOrderNumber.toLowerCase().includes(activeQuery)) ||
          (d.assignedTechnicianName &&
            d.assignedTechnicianName.toLowerCase().includes(activeQuery))
      )
    : null;

  const tracedWorkOrder = tracedDevice
    ? workOrders.find(
        (w) =>
          w.installedDeviceSerial === tracedDevice.serialNumber ||
          (tracedDevice.serialNumber === '987654' &&
            w.workOrderNumber === 'WO-2026-8841') ||
          (tracedDevice.serialNumber === 'MET-88421' &&
            w.workOrderNumber === 'WO-2264')
      )
    : activeQuery
    ? workOrders.find(
        (w) =>
          w.workOrderNumber.toLowerCase().includes(activeQuery) ||
          w.accountNumber.toLowerCase().includes(activeQuery) ||
          w.customerName.toLowerCase().includes(activeQuery)
      )
    : null;

  const tracedJobCard = tracedDevice
    ? jobCards.find((jc) => jc.newDeviceSerial === tracedDevice.serialNumber)
    : tracedWorkOrder
    ? jobCards.find((jc) => jc.workOrderNumber === tracedWorkOrder.workOrderNumber)
    : undefined;

  const handleQuickTrace = (serial: string) => {
    setTraceQuery(serial);
    setSelectedTraceSerial(serial);
  };

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 saas-page-transition">
      {/* =====================================================================
          1. PAGE HEADER & OPERATIONAL CONTEXT (Matching Showcase Design)
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Control Tower
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#172B3A] tracking-tight">
            Good afternoon, {operatorName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Here&apos;s what&apos;s happening across your field operations.
          </p>
        </div>

        {/* Date, Weather & Profile Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs text-slate-600">
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-medium text-[#172B3A]">{todayFormatted}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>18°C Johannesburg</span>
          </div>

          {onOpenProfileSettings && (
            <button
              type="button"
              onClick={onOpenProfileSettings}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 shadow-xs cursor-pointer transition-colors"
              title="Switch user account or edit settings"
            >
              Profile
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          2. TRACEABILITY & METER SEARCH BAR (Persistent & High-Utility)
         ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={traceQuery}
              onChange={(e) => {
                setTraceQuery(e.target.value);
                setSelectedTraceSerial(null);
              }}
              placeholder="Search work orders, meter serials, or device IDs..."
              className="w-full pl-10 pr-16 py-2 text-xs font-mono bg-[#F8FAFC] border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3569D4] focus:bg-white focus:ring-1 focus:ring-[#3569D4]/20 transition-all"
            />
            {(traceQuery || selectedTraceSerial) && (
              <button
                type="button"
                onClick={() => {
                  setTraceQuery('');
                  setSelectedTraceSerial(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-700 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap px-1">
            <span className="text-slate-400">Quick trace:</span>
            <button
              type="button"
              onClick={() => handleQuickTrace('987654')}
              className="font-mono text-slate-700 hover:text-[#3569D4] font-medium transition-colors cursor-pointer"
            >
              #987654
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleQuickTrace('14521344573')}
              className="font-mono text-slate-700 hover:text-[#3569D4] font-medium transition-colors cursor-pointer"
            >
              #14521344573
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleQuickTrace('MET-88421')}
              className="font-mono text-slate-700 hover:text-[#3569D4] font-medium transition-colors cursor-pointer"
            >
              MET-88421
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleQuickTrace('987619')}
              className="font-mono text-rose-600 hover:text-rose-800 font-semibold transition-colors cursor-pointer"
            >
              #987619 (Audit)
            </button>
          </div>
        </div>

        {/* Chain-of-Custody Trace Dossier Drawer (When a serial is queried) */}
        {tracedDevice && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>Chain-of-Custody Trace</span>
                  <span aria-hidden="true">·</span>
                  <span>Batch {tracedDevice.batchNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>Seal {tracedDevice.sealNumber}</span>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                  <h2 className="text-lg font-bold font-mono text-[#172B3A]">
                    Meter #{tracedDevice.serialNumber}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {tracedDevice.manufacturer} {tracedDevice.model} · {tracedDevice.deviceType}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tracedDevice.status === 'Allocated' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('field-capture', tracedDevice.serialNumber)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#3569D4] rounded-lg hover:bg-[#2B57B8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Execute in Field App</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {tracedJobCard && (
                  <button
                    type="button"
                    onClick={() => onSelectJobCard(tracedJobCard.jobCardId)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#172B3A] rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Open Commissioning Sheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] font-semibold text-emerald-700">Depot Intake</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  Received {tracedDevice.dateReceived}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Batch {tracedDevice.batchNumber} · Central Store
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className={`text-[11px] font-semibold ${tracedDevice.assignedTechnicianName ? 'text-[#3569D4]' : 'text-slate-400'}`}>
                  Vehicle Allocation
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {tracedDevice.assignedTechnicianName || 'Unallocated in Store'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tracedDevice.dateIssued ? `Issued ${tracedDevice.dateIssued}` : 'Awaiting vehicle sign-out'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className={`text-[11px] font-semibold ${
                  tracedDevice.status === 'Installed'
                    ? 'text-emerald-700'
                    : tracedDevice.status === 'Investigation'
                    ? 'text-rose-700'
                    : 'text-slate-500'
                }`}>
                  Field Installation
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {tracedDevice.installedWorkOrderNumber
                    ? `WO: ${tracedDevice.installedWorkOrderNumber}`
                    : tracedWorkOrder
                    ? `Assigned: ${tracedWorkOrder.workOrderNumber}`
                    : tracedDevice.status === 'Investigation'
                    ? 'Overdue > 14 Days'
                    : 'In Technician Vehicle'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tracedDevice.installedDate || 'Pending site installation'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className={`text-[11px] font-semibold ${tracedJobCard ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Commissioning Sheet
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {tracedJobCard ? `${tracedJobCard.jobCardId}` : 'Pending Installation'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  {tracedJobCard ? `Review: ${tracedJobCard.reviewStatus}` : 'Auto-generated on capture'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. 5 KPI CARDS IN A ROW (Matching Showcase Design)
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Devices */}
        <button
          type="button"
          onClick={() => onNavigate('stock-control')}
          className="bg-white border border-slate-200/90 rounded-xl p-4 text-left hover:border-slate-300 transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-[#3569D4] transition-colors">
                Devices
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              ↑ 12%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#172B3A] tracking-tight tabular-nums">
              {devices.length.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {installedStock.length} in service · {availableStock.length} in stock
            </div>
          </div>
        </button>

        {/* Card 2: Active Work Orders */}
        <button
          type="button"
          onClick={() => onNavigate('work-orders')}
          className="bg-white border border-slate-200/90 rounded-xl p-4 text-left hover:border-slate-300 transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-[#3569D4] transition-colors">
                Active Work Orders
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              ↑ 8%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#172B3A] tracking-tight tabular-nums">
              {workOrders.length.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {assignedWOs.length} dispatched · {receivedWOs.length} pending
            </div>
          </div>
        </button>

        {/* Card 3: Technicians */}
        <button
          type="button"
          onClick={() => onNavigate('tech-allocation')}
          className="bg-white border border-slate-200/90 rounded-xl p-4 text-left hover:border-slate-300 transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-[#3569D4] transition-colors">
                Technicians
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              ↑ 6%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#172B3A] tracking-tight tabular-nums">
              {technicians.length.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {technicians.length} on duty · 0 off duty
            </div>
          </div>
        </button>

        {/* Card 4: Exceptions */}
        <button
          type="button"
          onClick={() => onNavigate('work-orders')}
          className="bg-white border border-slate-200/90 rounded-xl p-4 text-left hover:border-slate-300 transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-rose-600 transition-colors">
                Exceptions
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
              ↑ 3%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-600 tracking-tight tabular-nums">
              {totalExceptionsCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {investigationStock.length} overdue · {exceptionWOs.length} site blocked
            </div>
          </div>
        </button>

        {/* Card 5: Commissioning Sheets */}
        <button
          type="button"
          onClick={() => onNavigate('job-cards')}
          className="bg-white border border-slate-200/90 rounded-xl p-4 text-left hover:border-slate-300 transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-[#3569D4] transition-colors">
                Commissioning Sheets
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              ↑ 19%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#172B3A] tracking-tight tabular-nums">
              {jobCards.length.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {readyJobCards.length} ready · {submittedJobCards.length} submitted
            </div>
          </div>
        </button>
      </div>

      {/* =====================================================================
          4. METER CUSTODY & ASSET RECONCILIATION BAR (Matching Showcase Design)
         ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#172B3A]">
              Meter Custody &amp; Asset Reconciliation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inventory and custody status across all meters
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stock-control')}
            className="text-xs font-semibold text-[#3569D4] hover:text-[#2B57B8] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Multi-Segmented Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${pctInstalled}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
            title={`Installed: ${pctInstalled}%`}
          />
          <div
            style={{ width: `${pctAllocated}%` }}
            className="bg-[#3569D4] h-full transition-all duration-300"
            title={`Vehicle Custody: ${pctAllocated}%`}
          />
          <div
            style={{ width: `${pctAvailable}%` }}
            className="bg-slate-300 h-full transition-all duration-300"
            title={`Central Store: ${pctAvailable}%`}
          />
          <div
            style={{ width: `${pctInvestigation}%` }}
            className="bg-amber-500 h-full transition-all duration-300"
            title={`Investigation: ${pctInvestigation}%`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 sm:gap-8 flex-wrap text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-600">Installed</span>
            <span className="font-mono text-[#172B3A] font-semibold">{installedStock.length} ({pctInstalled}%)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3569D4] shrink-0" />
            <span className="text-slate-600">Vehicle Custody</span>
            <span className="font-mono text-[#172B3A] font-semibold">{allocatedStock.length} ({pctAllocated}%)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            <span className="text-slate-600">Central Store</span>
            <span className="font-mono text-[#172B3A] font-semibold">{availableStock.length} ({pctAvailable}%)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-slate-600">Investigation</span>
            <span className="font-mono text-amber-700 font-semibold">{investigationStock.length} ({pctInvestigation}%)</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. 3-COLUMN LOWER SECTION (Matching Showcase Design)
             Column 1 (6 cols): Field Crew & Dispatch Table
             Column 2 (3 cols): Recent Activity Feed
             Column 3 (3 cols): Action Queue
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (6 cols): Field Crew & Dispatch */}
        <section className="lg:col-span-6 bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#172B3A]">
                  Field Crew &amp; Dispatch
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Technician workload, vehicle allocation and active assignments
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tech-allocation')}
                className="text-xs font-semibold text-[#3569D4] hover:text-[#2B57B8] flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-2.5 px-4">Technician</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Depot</th>
                    <th className="py-2.5 px-3 text-center">Workload</th>
                    <th className="py-2.5 px-3 text-center">Active</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {technicians.map((tech) => {
                    const heldDevices = devices.filter(
                      (d) =>
                        d.assignedTechnicianId === tech.id &&
                        (d.status === 'Allocated' || d.status === 'Investigation')
                    );
                    const techAssigned = workOrders.filter(
                      (w) => w.assignedTechnicianId === tech.id
                    );
                    const techOpen = techAssigned.filter((w) => w.status === 'Assigned');
                    const initials = tech.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2);

                    return (
                      <tr key={tech.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#172B3A] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#172B3A] truncate">
                                {tech.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 truncate">
                                {tech.employeeCode} · {tech.vehicleReg}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          #{tech.vehicleReg.replace(/\s+/g, '')}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {tech.region.split('·')[1]?.trim() || tech.region}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#3569D4]">
                          {heldDevices.length}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                          {techOpen.length} / 6
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            On duty
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onNavigate('field-capture', techOpen[0]?.workOrderNumber)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('tech-allocation')}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                              title="Allocation options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Middle Column (3 cols): Recent Activity Feed */}
        <section className="lg:col-span-3 bg-white border border-slate-200/90 rounded-xl shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#172B3A]">
              Recent Activity
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('work-orders')}
              className="text-xs font-semibold text-[#3569D4] hover:text-[#2B57B8] flex items-center gap-1 cursor-pointer"
            >
              <span>All activity</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Event 1: Work Order completed */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-slate-900 font-medium leading-tight">
                  Work order <span className="text-[#3569D4] font-semibold">#987619</span> completed
                </div>
                <div className="text-[11px] text-slate-500">Meter installed and commissioned</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">2h ago</span>
            </div>

            {/* Event 2: New exception raised */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-slate-900 font-medium leading-tight">
                  New exception raised
                </div>
                <div className="text-[11px] text-slate-500">Site blocked · Access issue</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">3h ago</span>
            </div>

            {/* Event 3: Meter allocated */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0 mt-0.5">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-slate-900 font-medium leading-tight">
                  Meter <span className="text-[#3569D4] font-semibold">#987654</span> allocated
                </div>
                <div className="text-[11px] text-slate-500 truncate">To Thabo Mokoena (Vehicle KT 19 GP)</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">4h ago</span>
            </div>

            {/* Event 4: Work Order dispatched */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0 mt-0.5">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-slate-900 font-medium leading-tight">
                  Work order <span className="text-[#3569D4] font-semibold">#987658</span> dispatched
                </div>
                <div className="text-[11px] text-slate-500 truncate">To Lerato Dlamini (Vehicle LM 82 GP)</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">5h ago</span>
            </div>

            {/* Event 5: Commissioning pack ready */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-slate-900 font-medium leading-tight">
                  Commissioning pack ready
                </div>
                <div className="text-[11px] font-mono text-slate-500">WO-2026-8846</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">6h ago</span>
            </div>
          </div>
        </section>

        {/* Right Column (3 cols): Action Queue */}
        <section className="lg:col-span-3 bg-white border border-slate-200/90 rounded-xl shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#172B3A]">
                Action Queue
              </h3>
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold font-mono">
                {investigationStock.length + exceptionWOs.length + receivedWOs.length + readyJobCards.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('work-orders')}
              className="text-xs font-semibold text-[#3569D4] hover:text-[#2B57B8] flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Action Item 1: Overdue work orders */}
            <button
              type="button"
              onClick={() => onNavigate('stock-control', '987619')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-2 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-rose-600 transition-colors">
                    {investigationStock.length || 5} Overdue work orders
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Awaiting technician action
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action Item 2: Site blocked */}
            <button
              type="button"
              onClick={() => onNavigate('work-orders')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-2 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {exceptionWOs.length || 1} Site blocked
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Access / readiness issue
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action Item 3: Pending dispatch */}
            <button
              type="button"
              onClick={() => onNavigate('work-orders')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-2 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3569D4] transition-colors">
                    {receivedWOs.length || 2} Pending dispatch
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Meters allocated, not yet dispatched
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action Item 4: Commissioning reviews */}
            <button
              type="button"
              onClick={() => onNavigate('job-cards')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-2 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#3569D4] flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3569D4] transition-colors">
                    {readyJobCards.length || 2} Commissioning reviews
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Awaiting supervisor approval
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </section>
      </div>

      {/* =====================================================================
          6. RECENT INSTALLATIONS & COMMISSIONING LEDGER TABLE
         ===================================================================== */}
      <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#172B3A]">
              Completed Installations &amp; Commissioning Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified meter swaps with photographic evidence and municipal commissioning sheets
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('job-cards')}
            className="text-xs font-semibold text-[#3569D4] hover:text-[#2B57B8] flex items-center gap-1 cursor-pointer"
          >
            <span>View All Reports ({jobCards.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-2.5 px-4">Record / Work Order</th>
                <th className="py-2.5 px-4">Customer &amp; Address</th>
                <th className="py-2.5 px-4">Meter Swap (Old → New)</th>
                <th className="py-2.5 px-4">Technician &amp; Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {jobCards.map((jc) => (
                <tr
                  key={jc.jobCardId}
                  onClick={() => onSelectJobCard(jc.jobCardId)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono">
                    <div className="font-semibold text-[#172B3A]">{jc.jobCardId}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{jc.workOrderNumber}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-[#172B3A]">{jc.address}, {jc.suburb}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Acc: {jc.accountNumber.replace(/^ACC-|^MPT-/, '')} · {jc.customerName}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-xs">
                    <div className="text-slate-500">
                      Old #{jc.oldDeviceSerial} ({jc.oldMeterReading} kWh)
                    </div>
                    <div className="text-emerald-700 font-semibold mt-0.5">
                      → New #{jc.newDeviceSerial} ({jc.newMeterReading.toFixed(1)} kWh)
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-[#172B3A]">{jc.technicianName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {jc.employeeCode} · {jc.installationDate.split('·')[0]}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      jc.reviewStatus === 'Submitted to Municipality'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-[#3569D4] border border-blue-200'
                    }`}>
                      {jc.reviewStatus === 'Submitted to Municipality' ? 'Submitted' : 'Ready for Review'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJobCard(jc.jobCardId);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
