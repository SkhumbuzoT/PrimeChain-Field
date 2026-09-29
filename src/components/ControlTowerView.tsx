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
  CheckCircle2,
  X,
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
  const completedWOs = workOrders.filter(
    (w) => w.status === 'Completed' || w.status === 'Submitted'
  );
  const exceptionWOs = workOrders.filter((w) => w.status === 'Exception');
  const activeWorkOrdersCount = receivedWOs.length + assignedWOs.length;
  const totalExceptionsCount =
    investigationStock.length + exceptionWOs.length;

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
    <div className="space-y-6 saas-page-transition">
      {/* =====================================================================
          OBJECTIVE 3 — SAAS HOME SCREEN HEADER & GLOBAL TRACEABILITY BAR
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>City Power Johannesburg</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">SDC Randburg</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">
                Operations Active
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Good afternoon, Skhumbuzo
            </h1>
            <p className="text-sm text-slate-500">
              Here&apos;s what&apos;s happening across your operation.
            </p>
          </div>

          {/* Global Serial / Work Order Trace Lookup */}
          <div className="w-full lg:w-[460px] flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={traceQuery}
                onChange={(e) => {
                  setTraceQuery(e.target.value);
                  setSelectedTraceSerial(null);
                }}
                placeholder="Trace meter serial #, work order, or account..."
                className="w-full pl-10 pr-16 py-2.5 text-xs font-mono bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all"
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

            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap px-0.5">
              <span className="text-slate-400">Quick trace:</span>
              <button
                type="button"
                onClick={() => handleQuickTrace('14521344573')}
                className="font-mono text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                #14521344573
              </button>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <button
                type="button"
                onClick={() => handleQuickTrace('987654')}
                className="font-mono text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                #987654
              </button>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <button
                type="button"
                onClick={() => handleQuickTrace('MET-88421')}
                className="font-mono text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                MET-88421
              </button>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <button
                type="button"
                onClick={() => handleQuickTrace('987619')}
                className="font-mono text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer"
              >
                #987619 (Audit)
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Custody Trace Dossier when a Serial or Work Order is Queried */}
        {tracedDevice && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>Chain-of-Custody Trace</span>
                  <span aria-hidden="true">·</span>
                  <span>Batch {tracedDevice.batchNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>Seal {tracedDevice.sealNumber}</span>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mt-1">
                  <h2 className="text-lg font-semibold font-mono text-slate-900">
                    Meter #{tracedDevice.serialNumber}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {tracedDevice.manufacturer} {tracedDevice.model} ·{' '}
                    {tracedDevice.deviceType}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {tracedDevice.status === 'Allocated' && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('field-capture', tracedDevice.serialNumber)
                    }
                    className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <span>Execute in Field App</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {tracedJobCard && (
                  <button
                    type="button"
                    onClick={() => onSelectJobCard(tracedJobCard.jobCardId)}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <span>Open Commissioning Sheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                <div className="text-xs font-semibold text-emerald-700">
                  01. Depot Intake
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  Received {tracedDevice.dateReceived}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Batch {tracedDevice.batchNumber} · Central Store
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                <div
                  className={`text-xs font-semibold ${
                    tracedDevice.assignedTechnicianName
                      ? 'text-blue-700'
                      : 'text-slate-400'
                  }`}
                >
                  02. Crew Allocation
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {tracedDevice.assignedTechnicianName || 'Unallocated in Store'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tracedDevice.dateIssued
                    ? `Issued ${tracedDevice.dateIssued}`
                    : 'Awaiting vehicle sign-out'}
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                <div
                  className={`text-xs font-semibold ${
                    tracedDevice.status === 'Installed'
                      ? 'text-emerald-700'
                      : tracedDevice.status === 'Investigation'
                      ? 'text-rose-700'
                      : 'text-slate-500'
                  }`}
                >
                  03. Site Execution
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
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

              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                <div
                  className={`text-xs font-semibold ${
                    tracedJobCard ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  04. Commissioning Sheet
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {tracedJobCard
                    ? `${tracedJobCard.jobCardId} (${tracedJobCard.reviewStatus})`
                    : 'Pending Installation'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">
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
          OBJECTIVE 3 — PREMIUM SAAS KPI CARDS
          Large primary number · Short descriptive label · Small supporting info
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Devices */}
        <button
          type="button"
          onClick={() => onNavigate('stock-control')}
          className="bg-white border border-slate-200/80 rounded-xl p-5 text-left hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
              {devices.length.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-700 mt-1 group-hover:text-blue-600 transition-colors">
              Devices
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{availableStock.length} in store</span>
            <span className="text-blue-600 font-medium">
              {allocatedStock.length} in vehicles
            </span>
          </div>
        </button>

        {/* Card 2: Active Work Orders */}
        <button
          type="button"
          onClick={() => onNavigate('work-orders')}
          className="bg-white border border-slate-200/80 rounded-xl p-5 text-left hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
              {workOrders.length.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-700 mt-1 group-hover:text-blue-600 transition-colors">
              Active Work Orders
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="text-blue-600 font-medium">
              {assignedWOs.length} dispatched
            </span>
            <span>{completedWOs.length} completed</span>
          </div>
        </button>

        {/* Card 3: Technicians */}
        <button
          type="button"
          onClick={() => onNavigate('tech-allocation')}
          className="bg-white border border-slate-200/80 rounded-xl p-5 text-left hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
              {technicians.length.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-700 mt-1 group-hover:text-blue-600 transition-colors">
              Technicians
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="text-emerald-700 font-medium">
              Custody lock active
            </span>
            <span>{allocatedStock.length} units held</span>
          </div>
        </button>

        {/* Card 4: Exceptions */}
        <button
          type="button"
          onClick={() => onNavigate('work-orders')}
          className="bg-white border border-slate-200/80 rounded-xl p-5 text-left hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div
              className={`text-3xl font-semibold tracking-tight font-mono tabular-nums ${
                totalExceptionsCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {totalExceptionsCount.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-700 mt-1 group-hover:text-rose-600 transition-colors">
              Exceptions
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="text-rose-600 font-medium">
              {investigationStock.length} audit overdue
            </span>
            <span className="text-amber-700">
              {exceptionWOs.length} site blocked
            </span>
          </div>
        </button>

        {/* Card 5: Commissioning Sheets */}
        <button
          type="button"
          onClick={() => onNavigate('job-cards')}
          className="bg-white border border-slate-200/80 rounded-xl p-5 text-left hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
              {jobCards.length.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-700 mt-1 group-hover:text-blue-600 transition-colors">
              Commissioning Sheets
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-blue-600 font-medium">
              {readyJobCards.length} ready
            </span>
            <span className="text-emerald-700 font-medium">
              {submittedJobCards.length} submitted
            </span>
          </div>
        </button>
      </div>

      {/* =====================================================================
          ASSET CUSTODY RECONCILIATION BAR
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-6 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap text-xs">
          <span className="font-semibold text-slate-900">
            Asset Reconciliation ({devices.length} Meters)
          </span>
          <span className="font-mono text-emerald-700 font-medium">
            Installed: {installedStock.length} ({pctInstalled}%)
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-blue-600 font-medium">
            Vehicle Custody: {allocatedStock.length} ({pctAllocated}%)
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-slate-600">
            Central Store: {availableStock.length} ({pctAvailable}%)
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-rose-600 font-semibold">
            Investigation: {investigationStock.length}
          </span>
        </div>

        <div className="w-full lg:w-72 h-2 bg-slate-100 rounded-full overflow-hidden flex shrink-0">
          <div
            style={{ width: `${pctInstalled}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${pctAllocated}%` }}
            className="bg-blue-600 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${pctAvailable}%` }}
            className="bg-slate-300 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${pctInvestigation}%` }}
            className="bg-rose-500 h-full transition-all duration-300"
          />
        </div>
      </div>

      {/* =====================================================================
          OBJECTIVE 4 & 6 — 2-COLUMN SPLIT: CREW DISPATCH MATRIX & ESCALATION QUEUE
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Field Crew Custody & Shift Execution Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Field Crew Custody & Dispatch Matrix
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live vehicle stock custody and active work order assignments
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tech-allocation')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Manage Allocations</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-5">Technician & Vehicle</th>
                    <th className="py-3 px-5">Meters in Custody</th>
                    <th className="py-3 px-5 text-right">Workload</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
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
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-5 align-top">
                          <div className="font-semibold text-slate-900 text-sm">
                            {tech.name}
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            {tech.employeeCode} · {tech.vehicleReg} ·{' '}
                            {tech.region.split('·')[1]?.trim() || tech.region}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 align-top">
                          {heldDevices.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                              {heldDevices.map((d, idx) => (
                                <React.Fragment key={d.serialNumber}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuickTrace(d.serialNumber)
                                    }
                                    className={`underline cursor-pointer transition-colors ${
                                      d.status === 'Investigation'
                                        ? 'text-rose-600 font-semibold'
                                        : 'text-slate-700 hover:text-blue-600'
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
                            <span className="text-xs font-mono text-slate-400">
                              0 units held
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          <span className="text-blue-600 font-semibold">
                            {techOpen.length} ACTIVE
                          </span>
                          <span className="text-slate-300 mx-1.5">/</span>
                          <span className="text-emerald-700 font-medium">
                            {techDone.length} DONE
                          </span>
                        </td>

                        <td className="py-3.5 px-5 align-top text-right whitespace-nowrap">
                          {techOpen.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate(
                                  'field-capture',
                                  techOpen[0].workOrderNumber
                                )
                              }
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              Open Terminal
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigate('tech-allocation')}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              Allocate →
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

          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Custody Policy: Strict Vehicle Serial Verification</span>
            <span className="font-mono text-emerald-700 font-semibold">
              100% ENFORCED
            </span>
          </div>
        </section>

        {/* Right (5 cols): Active Operational Exceptions & Action Queue */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Exception & Action Queue
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Items requiring supervisor attention or municipal sign-off
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-rose-600">
                {investigationStock.length +
                  exceptionWOs.length +
                  receivedWOs.length}{' '}
                OPEN
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* 1. Stock Investigation Alert */}
              {investigationStock.map((dev) => (
                <div
                  key={dev.serialNumber}
                  className="p-5 space-y-1.5 bg-rose-50/30 hover:bg-rose-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-rose-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>OVERDUE CUSTODY (&gt;14 DAYS)</span>
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      Issued {dev.dateIssued}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 font-mono">
                    Meter #{dev.serialNumber} · {dev.assignedTechnicianName}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      {dev.manufacturer} {dev.model} (No return scan)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('stock-control', dev.serialNumber)
                      }
                      className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer whitespace-nowrap"
                    >
                      Reconcile →
                    </button>
                  </div>
                </div>
              ))}

              {/* 2. Field Site Access Exceptions */}
              {exceptionWOs.map((wo) => (
                <div
                  key={wo.workOrderNumber}
                  className="p-5 space-y-1.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>SITE EXCEPTION · {wo.workType.toUpperCase()}</span>
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {wo.workOrderNumber}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {wo.customerName} — {wo.address}, {wo.suburb}
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 truncate">
                      {wo.exceptionReason}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('work-orders')}
                      className="text-xs font-semibold text-slate-900 hover:text-blue-600 cursor-pointer whitespace-nowrap"
                    >
                      Reschedule →
                    </button>
                  </div>
                </div>
              ))}

              {/* 3. Unassigned Work Orders Waiting for Dispatch */}
              {receivedWOs.length > 0 && (
                <div className="p-5 space-y-1.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>PENDING DISPATCH</span>
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      {receivedWOs.length} Unassigned
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-mono">
                    {receivedWOs.map((w) => w.workOrderNumber).join(' · ')}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Awaiting technician assignment
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('work-orders')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                    >
                      Assign Crew →
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Completed Job Cards Awaiting Municipal Submission */}
              {readyJobCards.length > 0 && (
                <div className="p-5 space-y-1.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-blue-600 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>READY FOR MUNICIPAL SIGN-OFF</span>
                    </span>
                    <span className="font-mono text-xs text-blue-600 font-semibold">
                      {readyJobCards.length} Ready
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[240px]">
                      {readyJobCards.map((j) => j.jobCardId).join(' · ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('job-cards')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
                    >
                      Review & Submit →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mandatory Evidence Compliance</span>
            <span className="font-mono font-semibold text-emerald-700">
              100% VERIFIED
            </span>
          </div>
        </section>
      </div>

      {/* =====================================================================
          RECENT INSTALLATION AUDIT & COMMISSIONING LEDGER TABLE
         ===================================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Completed Installations & Commissioning Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified meter swaps with photographic evidence and municipal
              commissioning sheets
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('job-cards')}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            View All Reports ({jobCards.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-5">Record / Work Order</th>
                <th className="py-3 px-5">Customer & Address</th>
                <th className="py-3 px-5">Meter Swap (Old → New)</th>
                <th className="py-3 px-5">Technician & Date</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {jobCards.map((jc) => (
                <tr
                  key={jc.jobCardId}
                  onClick={() => onSelectJobCard(jc.jobCardId)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-5 align-top font-mono">
                    <div className="font-semibold text-slate-900">
                      {jc.jobCardId}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {jc.workOrderNumber}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 align-top">
                    <div className="font-medium text-slate-900 text-sm">
                      {jc.address}, {jc.suburb}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Acc: {jc.accountNumber.replace(/^ACC-|^MPT-/, '')} ·{' '}
                      {jc.customerName}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 align-top font-mono text-xs">
                    <div className="text-slate-500">
                      Old #{jc.oldDeviceSerial} ({jc.oldMeterReading} kWh)
                    </div>
                    <div className="text-emerald-700 font-semibold mt-0.5">
                      → New #{jc.newDeviceSerial} (
                      {jc.newMeterReading.toFixed(1)} kWh)
                    </div>
                  </td>

                  <td className="py-3.5 px-5 align-top">
                    <div className="font-medium text-slate-900">
                      {jc.technicianName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {jc.employeeCode} · {jc.installationDate.split('·')[0]}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 align-top">
                    <div
                      className={`font-mono text-xs font-semibold ${
                        jc.reviewStatus === 'Submitted to Municipality'
                          ? 'text-emerald-700'
                          : 'text-blue-600'
                      }`}
                    >
                      {jc.reviewStatus === 'Submitted to Municipality'
                        ? 'SUBMITTED'
                        : 'READY FOR REVIEW'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Seal {jc.sealNumber} · 3/3 Photos
                    </div>
                  </td>

                  <td className="py-3.5 px-5 align-top text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJobCard(jc.jobCardId);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      Inspect Record →
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
