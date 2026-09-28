import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  Check,
  ShieldCheck,
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
    <div className="space-y-4">
      {/* Enterprise Header + Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Field Operations & Vehicle Custody</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {technicians.length} Active Field Crews
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              Crew Roster, Vehicle Stock Issuance & Work Dispatch
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewTechForm(!showNewTechForm)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Technician</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
        )}

        {showNewTechForm && (
          <form
            onSubmit={handleAddTechSubmit}
            className="mt-4 pt-4 border-t border-slate-200 space-y-3"
          >
            <h2 className="text-xs font-semibold text-slate-900">
              Register Field Technician Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="e.g. Mandla Sithole"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Employee Code
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Assigned Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewTechForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
              >
                Save Technician Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Master-Detail Split: Left Technician Roster (4 cols) + Right Custody & Dispatch Workspace (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Technician Roster (4 cols) */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-md divide-y divide-slate-200 self-start overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/90 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-700">
              Field Technician Roster ({technicians.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
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
                className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {tech.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {tech.employeeCode} · {tech.vehicleReg}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {tech.region}
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] space-y-0.5 shrink-0">
                  <div className="font-semibold text-blue-700">
                    {held.length} Meters
                  </div>
                  <div className="text-slate-500">{activeWOs.length} WOs</div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Right Column: Selected Technician Custody & Issuance Workspace (8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          {/* Technician Custody Summary & Issuance Controls */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-mono text-slate-500">
                  CREW CUSTODY DOSSIER · {selectedTech.employeeCode} · VEHICLE{' '}
                  {selectedTech.vehicleReg}
                </div>
                <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                  {selectedTech.name} — Stock & Work Order Allocation
                </h2>
                <div className="text-xs text-slate-500">
                  {selectedTech.region} · {selectedTech.phone}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('field-capture')}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
              >
                <span>Launch {selectedTech.name.split(' ')[0]}’s Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dual Action Row: Issue Available Meter + Assign Work Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issue Device Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Issue Depot Meter to Vehicle ({selectedTech.vehicleReg})
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAvailableSerial}
                    onChange={(e) => setSelectedAvailableSerial(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
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
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                  >
                    Issue Meter
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {availableDevices.length} unallocated meters in Central Store
                </p>
              </div>

              {/* Dispatch Work Order Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Dispatch Work Order to {selectedTech.name.split(' ')[0]}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUnassignedWO}
                    onChange={(e) => setSelectedUnassignedWO(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
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
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                  >
                    Assign WO
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {unassignedWOs.length} unassigned municipal instructions
                </p>
              </div>
            </div>
          </div>

          {/* Devices Currently Held by Selected Technician */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-900">
                Meters in Vehicle Custody ({techHeldDevices.length})
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Vehicle Custody Lock Active</span>
              </div>
            </div>

            {techHeldDevices.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <div className="text-xs font-medium text-slate-700">
                  No un-installed meters currently held by {selectedTech.name}
                </div>
                <p className="text-[11px] text-slate-500">
                  Use the "Issue Depot Meter to Vehicle" control above to
                  allocate stock.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/90">
                      <th className="py-2.5 px-3.5">Serial & Seal #</th>
                      <th className="py-2.5 px-3.5">Make & Model</th>
                      <th className="py-2.5 px-3.5">Custody Status</th>
                      <th className="py-2.5 px-3.5">Date Issued</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {techHeldDevices.map((dev) => (
                      <tr
                        key={dev.serialNumber}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 font-mono">
                          <div className="font-semibold text-slate-900">
                            #{dev.serialNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {dev.sealNumber}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-medium text-slate-900">
                            {dev.manufacturer} {dev.model}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {dev.deviceType}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold">
                          <span
                            className={
                              dev.status === 'Investigation'
                                ? 'text-red-700'
                                : 'text-blue-700'
                            }
                          >
                            {dev.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-700">
                          {dev.dateIssued}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap space-x-3">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate('field-capture', dev.serialNumber)
                            }
                            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
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
                            className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-900">
                Assigned Work Orders ({techAssignedWOs.length})
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {techInstalledDevices.length} Completed Swaps
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {techAssignedWOs.map((wo) => (
                <div
                  key={wo.workOrderNumber}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-semibold text-slate-900">
                        {wo.workOrderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{wo.workType}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          wo.status === 'Completed' || wo.status === 'Submitted'
                            ? 'text-emerald-700 font-semibold'
                            : wo.status === 'Exception'
                            ? 'text-red-700 font-semibold'
                            : 'text-blue-700 font-semibold'
                        }
                      >
                        {wo.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-900">
                      {wo.address}, {wo.suburb} — {wo.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
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
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 whitespace-nowrap self-start sm:self-center cursor-pointer"
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
