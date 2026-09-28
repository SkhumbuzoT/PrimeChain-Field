import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  AlertTriangle,
  FileCheck,
  Package,
  Truck,
  Wrench,
  ClipboardCheck,
  Clock,
  ShieldAlert,
  Send,
  Plus,
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
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  devices,
  workOrders,
  technicians,
  jobCards,
  onNavigate,
  onSelectJobCard,
}) => {
  const [traceQuery, setTraceQuery] = useState('');
  const [selectedTraceSerial, setSelectedTraceSerial] = useState<string | null>(
    null
  );

  // Stock lifecycle buckets
  const availableStock = devices.filter((d) => d.status === 'Available');
  const allocatedStock = devices.filter((d) => d.status === 'Allocated');
  const installedStock = devices.filter((d) => d.status === 'Installed');
  const investigationStock = devices.filter(
    (d) => d.status === 'Investigation'
  );

  // Work order lifecycle buckets
  const receivedWOs = workOrders.filter((w) => w.status === 'Received');
  const assignedWOs = workOrders.filter((w) => w.status === 'Assigned');
  const exceptionWOs = workOrders.filter((w) => w.status === 'Exception');

  // Job card buckets
  const readyJobCards = jobCards.filter(
    (jc) => jc.reviewStatus === 'Ready for Review'
  );
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
    ? jobCards.find(
        (jc) => jc.workOrderNumber === tracedWorkOrder.workOrderNumber
      )
    : undefined;

  const handleQuickTrace = (serial: string) => {
    setTraceQuery(serial);
    setSelectedTraceSerial(serial);
  };

  return (
    <div className="space-y-5">
      {/* =====================================================================
          ENTERPRISE PAGE HEADER & GLOBAL SERIAL / WORK ORDER TRACE BAR
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>City Power Johannesburg</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">SDC: RANDBURG</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-700 font-medium">
                Shift Active
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              Operations Control & Asset Custody Overview
            </h1>
          </div>

          {/* Global Serial / Work Order Trace Lookup */}
          <div className="w-full lg:w-[460px] flex flex-col gap-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={traceQuery}
                onChange={(e) => {
                  setTraceQuery(e.target.value);
                  setSelectedTraceSerial(null);
                }}
                placeholder="Trace Meter Serial #, Account #, or Work Order..."
                className="w-full pl-9 pr-16 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              {(traceQuery || selectedTraceSerial) && (
                <button
                  type="button"
                  onClick={() => {
                    setTraceQuery('');
                    setSelectedTraceSerial(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
              <span>Quick trace:</span>
              <button
                type="button"
                onClick={() => handleQuickTrace('14521344573')}
                className="font-mono text-slate-700 hover:text-blue-700 underline cursor-pointer"
              >
                #14521344573
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleQuickTrace('987654')}
                className="font-mono text-slate-700 hover:text-blue-700 underline cursor-pointer"
              >
                #987654
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleQuickTrace('MET-88421')}
                className="font-mono text-slate-700 hover:text-blue-700 underline cursor-pointer"
              >
                MET-88421
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleQuickTrace('987619')}
                className="font-mono text-red-700 hover:text-red-900 underline cursor-pointer"
              >
                #987619 (Audit)
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Custody Trace Panel when a Serial or Work Order is Queried */}
        {tracedDevice && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-slate-500">
                  CHAIN-OF-CUSTODY TRACE · BATCH {tracedDevice.batchNumber} ·
                  SEAL {tracedDevice.sealNumber}
                </div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <h2 className="text-base font-semibold font-mono text-slate-900">
                    Meter #{tracedDevice.serialNumber}
                  </h2>
                  <span className="text-xs text-slate-600">
                    {tracedDevice.manufacturer} {tracedDevice.model} (
                    {tracedDevice.deviceType})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tracedDevice.status === 'Allocated' && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('field-capture', tracedDevice.serialNumber)
                    }
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Execute in Field App</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {tracedJobCard && (
                  <button
                    type="button"
                    onClick={() => onSelectJobCard(tracedJobCard.jobCardId)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Open Commissioning Sheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                  01. DEPOT INTAKE
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  Received {tracedDevice.dateReceived}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Batch {tracedDevice.batchNumber} · Central Store
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div
                  className={`text-[11px] font-mono font-semibold ${
                    tracedDevice.assignedTechnicianName
                      ? 'text-blue-700'
                      : 'text-slate-400'
                  }`}
                >
                  02. CREW ALLOCATION
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  {tracedDevice.assignedTechnicianName || 'Unallocated in Store'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {tracedDevice.dateIssued
                    ? `Issued ${tracedDevice.dateIssued}`
                    : 'Awaiting vehicle sign-out'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div
                  className={`text-[11px] font-mono font-semibold ${
                    tracedDevice.status === 'Installed'
                      ? 'text-emerald-700'
                      : tracedDevice.status === 'Investigation'
                      ? 'text-red-700'
                      : 'text-slate-500'
                  }`}
                >
                  03. SITE EXECUTION
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  {tracedDevice.installedWorkOrderNumber
                    ? `WO: ${tracedDevice.installedWorkOrderNumber}`
                    : tracedWorkOrder
                    ? `Assigned: ${tracedWorkOrder.workOrderNumber}`
                    : tracedDevice.status === 'Investigation'
                    ? 'Overdue > 14 Days'
                    : 'In Technician Vehicle'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {tracedDevice.installedDate || 'Pending site installation'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div
                  className={`text-[11px] font-mono font-semibold ${
                    tracedJobCard ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  04. COMMISSIONING SHEET
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  {tracedJobCard
                    ? `${tracedJobCard.jobCardId} (${tracedJobCard.reviewStatus})`
                    : 'Pending Installation'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {tracedJobCard
                    ? `Old #${tracedJobCard.oldDeviceSerial} → New #${tracedJobCard.newDeviceSerial}`
                    : 'Auto-generated on capture'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          HIGH-DENSITY 5-STAGE OPERATIONAL KPI STRIP
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {/* Metric 1: Work Orders */}
          <button
            type="button"
            onClick={() => onNavigate('work-orders')}
            className="p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Work Order Register</span>
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {workOrders.length}
              </span>
              <span className="text-xs text-slate-500">Total Instructions</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>Dispatched: {assignedWOs.length}</span>
              <span>Unassigned: {receivedWOs.length}</span>
            </div>
          </button>

          {/* Metric 2: Depot Stock */}
          <button
            type="button"
            onClick={() => onNavigate('stock-control')}
            className="p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Depot Store Stock</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {availableStock.length}
              </span>
              <span className="text-xs text-slate-500">
                Available of {devices.length}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span className="text-emerald-700">Ready to Issue</span>
              <span>4 Batches</span>
            </div>
          </button>

          {/* Metric 3: Vehicle Custody */}
          <button
            type="button"
            onClick={() => onNavigate('tech-allocation')}
            className="p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Vehicle Custody</span>
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-blue-700">
                {allocatedStock.length}
              </span>
              <span className="text-xs text-slate-500">
                Issued to {technicians.length} Techs
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-600">Custody Lock: ON</span>
              <span className="text-red-700 font-medium">
                {investigationStock.length} Audit
              </span>
            </div>
          </button>

          {/* Metric 4: Field Installations */}
          <button
            type="button"
            onClick={() => onNavigate('field-capture')}
            className="p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Field Installations</span>
              <Wrench className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
                {installedStock.length}
              </span>
              <span className="text-xs text-slate-500">Verified Swaps</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>Active Queue: {assignedWOs.length}</span>
              <span className="text-emerald-700">GPS + Photos</span>
            </div>
          </button>

          {/* Metric 5: Commissioning Sheets */}
          <button
            type="button"
            onClick={() => onNavigate('job-cards')}
            className="p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Commissioning Sheets</span>
              <FileCheck className="w-4 h-4 text-slate-700" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {jobCards.length}
              </span>
              <span className="text-xs text-slate-500">City Power PDFs</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
              <span className="text-blue-700">
                Ready: {readyJobCards.length}
              </span>
              <span className="text-emerald-700">
                Submitted: {submittedJobCards.length}
              </span>
            </div>
          </button>
        </div>

        {/* Compact Meter Stock Reconciliation Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-700">
              Stock Reconciliation ({devices.length} Units):
            </span>
            <span className="font-mono text-[11px] text-emerald-700">
              Installed: {installedStock.length} ({pctInstalled}%)
            </span>
            <span className="font-mono text-[11px] text-blue-700">
              Vehicle Custody: {allocatedStock.length} ({pctAllocated}%)
            </span>
            <span className="font-mono text-[11px] text-slate-600">
              Central Store: {availableStock.length} ({pctAvailable}%)
            </span>
            <span className="font-mono text-[11px] text-red-700 font-semibold">
              Audit Investigation: {investigationStock.length}
            </span>
          </div>

          <div className="w-full sm:w-64 h-2 bg-slate-200 rounded-sm overflow-hidden flex shrink-0">
            <div
              style={{ width: `${pctInstalled}%` }}
              className="bg-emerald-600 h-full"
            />
            <div
              style={{ width: `${pctAllocated}%` }}
              className="bg-blue-600 h-full"
            />
            <div
              style={{ width: `${pctAvailable}%` }}
              className="bg-slate-400 h-full"
            />
            <div
              style={{ width: `${pctInvestigation}%` }}
              className="bg-red-600 h-full"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          ENTERPRISE 2-COLUMN SPLIT: CREW DISPATCH MATRIX & ESCALATION QUEUE
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 cols): Field Crew Custody & Shift Execution Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-md flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Field Crew Custody & Dispatch Matrix
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tech-allocation')}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Allocations</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/90">
                    <th className="py-2.5 px-3.5">Technician & Vehicle</th>
                    <th className="py-2.5 px-3.5">Meters in Custody</th>
                    <th className="py-2.5 px-3.5 text-right">Queue</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {technicians.map((tech) => {
                    const heldDevices = devices.filter(
                      (d) =>
                        d.assignedTechnicianId === tech.id &&
                        (d.status === 'Allocated' ||
                          d.status === 'Investigation')
                    );
                    const techAssigned = workOrders.filter(
                      (w) => w.assignedTechnicianId === tech.id
                    );
                    const techOpen = techAssigned.filter(
                      (w) => w.status === 'Assigned'
                    );
                    const techDone = techAssigned.filter(
                      (w) =>
                        w.status === 'Completed' || w.status === 'Submitted'
                    );

                    return (
                      <tr
                        key={tech.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="font-semibold text-slate-900">
                            {tech.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {tech.employeeCode} · {tech.vehicleReg} ·{' '}
                            {tech.region.split('·')[1]?.trim() || tech.region}
                          </div>
                        </td>

                        <td className="py-2.5 px-3.5 align-top">
                          {heldDevices.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
                              {heldDevices.map((d, idx) => (
                                <React.Fragment key={d.serialNumber}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuickTrace(d.serialNumber)
                                    }
                                    className={`underline cursor-pointer ${
                                      d.status === 'Investigation'
                                        ? 'text-red-700 font-semibold'
                                        : 'text-slate-800 hover:text-blue-700'
                                    }`}
                                  >
                                    #{d.serialNumber}
                                  </button>
                                  {idx < heldDevices.length - 1 && (
                                    <span className="text-slate-300">·</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              0 units held
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3.5 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          <span className="text-blue-700 font-semibold">
                            {techOpen.length} Open
                          </span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-emerald-700">
                            {techDone.length} Done
                          </span>
                        </td>

                        <td className="py-2.5 px-3.5 align-top text-right whitespace-nowrap">
                          {techOpen.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate(
                                  'field-capture',
                                  techOpen[0].workOrderNumber
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer"
                            >
                              Open Terminal
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigate('tech-allocation')}
                              className="px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
                            >
                              Allocate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span>Custody Policy: Strict Vehicle Serial Verification</span>
            <span className="font-mono text-slate-800 font-medium">
              100% Enforced
            </span>
          </div>
        </section>

        {/* Right (5 cols): Active Operational Exceptions & Action Queue */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-md flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h2 className="text-sm font-semibold text-slate-900">
                Exception & Escalation Queue
              </h2>
              <span className="text-xs font-mono font-semibold text-red-700">
                {investigationStock.length +
                  exceptionWOs.length +
                  receivedWOs.length}{' '}
                Action Items
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {/* 1. Stock Investigation Alert */}
              {investigationStock.map((dev) => (
                <div
                  key={dev.serialNumber}
                  className="p-3.5 space-y-1 bg-red-50/30"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-red-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Overdue Custody (&gt;14 Days)</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Issued {dev.dateIssued}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 font-mono">
                    Meter #{dev.serialNumber} · {dev.assignedTechnicianName}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">
                      {dev.manufacturer} {dev.model} (No return scan)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('stock-control', dev.serialNumber)
                      }
                      className="text-xs font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Reconcile →
                    </button>
                  </div>
                </div>
              ))}

              {/* 2. Field Site Access Exceptions */}
              {exceptionWOs.map((wo) => (
                <div key={wo.workOrderNumber} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Site Access Blocked · {wo.workType}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {wo.workOrderNumber}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-900">
                    {wo.customerName} — {wo.address}, {wo.suburb}
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 truncate">
                      {wo.exceptionReason}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('work-orders')}
                      className="text-xs font-medium text-slate-900 hover:text-blue-700 underline cursor-pointer whitespace-nowrap"
                    >
                      Re-schedule →
                    </button>
                  </div>
                </div>
              ))}

              {/* 3. Unassigned Work Orders Waiting for Dispatch */}
              {receivedWOs.length > 0 && (
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Unassigned Municipal Work Orders</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {receivedWOs.length} Pending
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-mono">
                    {receivedWOs.map((w) => w.workOrderNumber).join(', ')}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Awaiting technician dispatch
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('work-orders')}
                      className="text-xs font-medium text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Assign Crew →
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Completed Job Cards Awaiting Municipal Submission */}
              {readyJobCards.length > 0 && (
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-700 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Commissioning Sheets Ready for Sign-Off</span>
                    </span>
                    <span className="font-mono text-[11px] text-blue-700 font-semibold">
                      {readyJobCards.length} Ready
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {readyJobCards.map((j) => j.jobCardId).join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('job-cards')}
                      className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Review & Submit →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span>Mandatory Evidence Compliance</span>
            <span className="font-mono font-semibold text-emerald-700">
              0 Missing Photos
            </span>
          </div>
        </section>
      </div>

      {/* =====================================================================
          RECENT INSTALLATION AUDIT & COMMISSIONING LEDGER
         ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Completed Installations & Commissioning Ledger
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('job-cards')}
            className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap cursor-pointer"
          >
            View All Commissioning Sheets ({jobCards.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/90">
                <th className="py-2.5 px-3.5">Job Card / Ref #</th>
                <th className="py-2.5 px-3.5">Account & Service Address</th>
                <th className="py-2.5 px-3.5">Meter Swap (Old → New)</th>
                <th className="py-2.5 px-3.5">Installer & Date</th>
                <th className="py-2.5 px-3.5">Compliance Status</th>
                <th className="py-2.5 px-3.5 text-right">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {jobCards.map((jc) => (
                <tr
                  key={jc.jobCardId}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-3.5 align-top font-mono">
                    <div className="font-semibold text-slate-900">
                      {jc.jobCardId}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {jc.workOrderNumber}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    <div className="font-medium text-slate-900">
                      {jc.address}, {jc.suburb}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Acc: {jc.accountNumber.replace(/^ACC-|^MPT-/, '')} ·{' '}
                      {jc.customerName}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top font-mono text-[11px]">
                    <div className="text-slate-600">
                      Old #{jc.oldDeviceSerial} ({jc.oldMeterReading} kWh)
                    </div>
                    <div className="text-emerald-700 font-semibold">
                      → New #{jc.newDeviceSerial} (
                      {jc.newMeterReading.toFixed(1)} kWh)
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    <div className="font-medium text-slate-900">
                      {jc.technicianName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {jc.employeeCode} · {jc.installationDate.split('·')[0]}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    <div
                      className={`font-mono text-[11px] font-semibold ${
                        jc.reviewStatus === 'Submitted to Municipality'
                          ? 'text-emerald-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {jc.reviewStatus === 'Submitted to Municipality'
                        ? 'SUBMITTED TO CITY POWER'
                        : 'READY FOR SIGN-OFF'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      3/3 Photos · Seal {jc.sealNumber}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectJobCard(jc.jobCardId)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Open PDF →
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
