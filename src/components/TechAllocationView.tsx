import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  Check,
  ShieldCheck,
  X,
  Package,
} from 'lucide-react';
import {
  Technician,
  MeterDevice,
  WorkOrder,
  ActiveModule,
} from '../types';

interface TechAllocationViewProps {
  technicians: Technician[];
  devices: MeterDevice[];
  workOrders: WorkOrder[];
  onAllocateDevice: (serialNumber: string, technicianId: string) => void;
  onTransferDevice: (serialNumber: string, toTechnicianId: string) => void;
  onReturnDeviceToStore: (serialNumber: string, note: string) => void;
  onAssignWorkOrder: (workOrderNumber: string, technicianId: string) => void;
  onAddTechnician: (tech: Technician) => void;
  onNavigate: (module: ActiveModule, hint?: string) => void;
}

export const TechAllocationView: React.FC<TechAllocationViewProps> = ({
  technicians,
  devices,
  workOrders,
  onAllocateDevice,
  onReturnDeviceToStore,
  onAssignWorkOrder,
  onAddTechnician,
  onNavigate,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('TECH-01');
  const [selectedAvailableSerial, setSelectedAvailableSerial] =
    useState<string>('');
  const [selectedUnassignedWO, setSelectedUnassignedWO] = useState<string>('');
  const [showNewTechForm, setShowNewTechForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // New technician state
  const [techName, setTechName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('EMP-4044');
  const [region, setRegion] = useState('Region B · Randburg');
  const [phone, setPhone] = useState('+27 82 701 4410');
  const [vehicleReg, setVehicleReg] = useState('MK 31 GP');

  const selectedTech =
    technicians.find((t) => t.id === selectedTechId) || technicians[0];

  const availableDevices = devices.filter((d) => d.status === 'Available');
  const unassignedWOs = workOrders.filter((w) => w.status === 'Received');

  const techHeldDevices = devices.filter(
    (d) =>
      d.assignedTechnicianId === selectedTech.id &&
      (d.status === 'Allocated' || d.status === 'Investigation')
  );
  const techInstalledDevices = devices.filter(
    (d) =>
      d.assignedTechnicianId === selectedTech.id && d.status === 'Installed'
  );
  const techAssignedWOs = workOrders.filter(
    (w) => w.assignedTechnicianId === selectedTech.id
  );

  const handleIssueDevice = () => {
    const serialToIssue =
      selectedAvailableSerial || availableDevices[0]?.serialNumber;
    if (!serialToIssue) return;
    onAllocateDevice(serialToIssue, selectedTech.id);
    setSelectedAvailableSerial('');
    setNotice(
      `Meter #${serialToIssue} digitally issued to ${selectedTech.name} (${selectedTech.employeeCode}).`
    );
    setTimeout(() => setNotice(null), 4000);
  };

  const handleDispatchWO = () => {
    const woNum = selectedUnassignedWO || unassignedWOs[0]?.workOrderNumber;
    if (!woNum) return;
    onAssignWorkOrder(woNum, selectedTech.id);
    setSelectedUnassignedWO('');
    setNotice(`Work Order ${woNum} assigned to ${selectedTech.name}.`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAddTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) return;
    const newId = `TECH-0${technicians.length + 1}`;
    const newTech: Technician = {
      id: newId,
      name: techName.trim(),
      employeeCode: employeeCode.trim(),
      region: region.trim(),
      phone: phone.trim(),
      vehicleReg: vehicleReg.trim(),
      dailyTarget: 8,
    };
    onAddTechnician(newTech);
    setSelectedTechId(newId);
    setTechName('');
    setShowNewTechForm(false);
    setNotice(
      `Registered technician ${newTech.name} (${newTech.employeeCode}).`
    );
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-6 saas-page-transition">
      {/* =====================================================================
          OBJECTIVE 6 — PAGE HEADER & PRIMARY ACTIONS
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Operations</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">
                {technicians.length} Active Field Crews
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Technicians &amp; Allocations
            </h1>
            <p className="text-sm text-slate-500">
              Manage field technician rosters, vehicle meter custody issuance,
              and work order dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowNewTechForm(!showNewTechForm)}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Technician</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showNewTechForm && (
          <form
            onSubmit={handleAddTechSubmit}
            className="mt-6 pt-5 border-t border-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Register Field Technician Profile
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add a new certified municipal meter installer and vehicle
                  registration
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTechForm(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="e.g. Mandla Sithole"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Employee Code
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Assigned Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer shadow-2xs"
              >
                Save Technician Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* =====================================================================
          MASTER-DETAIL SPLIT: LEFT ROSTER (4 COLS) + RIGHT CUSTODY DOSSIER (8 COLS)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Technician Roster (4 cols) */}
        <section className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-slate-100 self-start overflow-hidden">
          <div className="px-5 py-4 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technician Roster ({technicians.length})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Select Crew
            </span>
          </div>

          {technicians.map((tech) => {
            const held = devices.filter(
              (d) =>
                d.assignedTechnicianId === tech.id &&
                (d.status === 'Allocated' || d.status === 'Investigation')
            );
            const activeWOs = workOrders.filter(
              (w) =>
                w.assignedTechnicianId === tech.id && w.status === 'Assigned'
            );
            const isSelected = tech.id === selectedTech.id;

            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => setSelectedTechId(tech.id)}
                className={`w-full text-left p-4 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {tech.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {tech.employeeCode} · {tech.vehicleReg}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {tech.region}
                  </div>
                </div>

                <div className="text-right font-mono text-xs space-y-0.5 shrink-0">
                  <div className="font-semibold text-blue-600">
                    {held.length} Meters
                  </div>
                  <div className="text-slate-500">{activeWOs.length} WOs</div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Right Column: Selected Technician Custody & Issuance Workspace (8 cols) */}
        <section className="lg:col-span-8 space-y-6">
          {/* Technician Custody Summary & Issuance Controls */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Technician {selectedTech.employeeCode} · Vehicle {selectedTech.vehicleReg}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
                  {selectedTech.name}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedTech.region} · {selectedTech.phone}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('field-capture')}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-2xs"
              >
                <span>Launch {selectedTech.name.split(' ')[0]}’s Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dual Action Row: Issue Available Meter + Assign Work Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issue Device Box */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-2.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Issue Depot Meter to Vehicle ({selectedTech.vehicleReg})
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAvailableSerial}
                    onChange={(e) => setSelectedAvailableSerial(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                  >
                    {availableDevices.length === 0 ? (
                      <option value="">No Available Meters in Store</option>
                    ) : (
                      availableDevices.map((d) => (
                        <option key={d.serialNumber} value={d.serialNumber}>
                          #{d.serialNumber} — {d.manufacturer} {d.model}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={availableDevices.length === 0}
                    onClick={handleIssueDevice}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer shadow-2xs"
                  >
                    Issue Meter
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {availableDevices.length} unallocated meters in Central Store
                </p>
              </div>

              {/* Dispatch Work Order Box */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-2.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Dispatch Work Order to {selectedTech.name.split(' ')[0]}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUnassignedWO}
                    onChange={(e) => setSelectedUnassignedWO(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                  >
                    {unassignedWOs.length === 0 ? (
                      <option value="">All Work Orders Dispatched</option>
                    ) : (
                      unassignedWOs.map((w) => (
                        <option
                          key={w.workOrderNumber}
                          value={w.workOrderNumber}
                        >
                          {w.workOrderNumber} — {w.address} ({w.workType})
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={unassignedWOs.length === 0}
                    onClick={handleDispatchWO}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer shadow-2xs"
                  >
                    Assign WO
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {unassignedWOs.length} unassigned municipal instructions
                </p>
              </div>
            </div>
          </div>

          {/* Devices Currently Held by Selected Technician */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Meters in Vehicle Custody ({techHeldDevices.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Devices signed out to vehicle {selectedTech.vehicleReg}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Custody Lock Active</span>
              </div>
            </div>

            {techHeldDevices.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  No devices in vehicle custody
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {selectedTech.name} currently has no un-installed meters
                  signed out. Use the control above to allocate stock.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-5">Serial &amp; Seal #</th>
                      <th className="py-3 px-5">Make &amp; Model</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Date Issued</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {techHeldDevices.map((dev) => (
                      <tr
                        key={dev.serialNumber}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-5 font-mono">
                          <div className="font-semibold text-slate-900 text-sm">
                            #{dev.serialNumber}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {dev.sealNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-slate-900">
                            {dev.manufacturer} {dev.model}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {dev.deviceType}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs font-semibold">
                          <span
                            className={
                              dev.status === 'Investigation'
                                ? 'text-rose-600'
                                : 'text-blue-600'
                            }
                          >
                            {dev.status === 'Investigation'
                              ? 'INVESTIGATION'
                              : 'IN CUSTODY'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600">
                          {dev.dateIssued}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-3">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate('field-capture', dev.serialNumber)
                            }
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            Install →
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onReturnDeviceToStore(
                                dev.serialNumber,
                                `Returned to Central Store by ${selectedTech.name}.`
                              );
                              setNotice(
                                `Meter #${dev.serialNumber} returned to Available depot stock.`
                              );
                            }}
                            className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
                          >
                            Return
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assigned Work Orders for Selected Technician */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Assigned Work Orders ({techAssignedWOs.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instructions dispatched to {selectedTech.name}
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold">
                {techInstalledDevices.length} COMPLETED SWAPS
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {techAssignedWOs.map((wo) => (
                <div
                  key={wo.workOrderNumber}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-semibold text-slate-900">
                        {wo.workOrderNumber}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-slate-600">{wo.workType}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span
                        className={
                          wo.status === 'Completed' || wo.status === 'Submitted'
                            ? 'text-emerald-700 font-semibold'
                            : wo.status === 'Exception'
                            ? 'text-rose-600 font-semibold'
                            : 'text-blue-600 font-semibold'
                        }
                      >
                        {wo.status === 'Assigned'
                          ? 'IN PROGRESS'
                          : wo.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {wo.address}, {wo.suburb} — {wo.customerName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Old #{wo.oldDeviceSerial} ({wo.oldDeviceMake}) ·{' '}
                      {wo.existingReading.toLocaleString()} kWh
                      {wo.installedDeviceSerial
                        ? ` · New #${wo.installedDeviceSerial}`
                        : ''}
                    </div>
                  </div>

                  {wo.status === 'Assigned' && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('field-capture', wo.workOrderNumber)
                      }
                      className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap self-start sm:self-center cursor-pointer shadow-2xs"
                    >
                      Execute →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
