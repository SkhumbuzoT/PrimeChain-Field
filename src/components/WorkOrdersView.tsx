import React, { useState } from 'react';
import {
  Search,
  Upload,
  Plus,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import {
  WorkOrder,
  WorkType,
  WorkOrderStatus,
  Technician,
  ActiveModule,
} from '../types';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  onImportBatch: () => number;
  onAddWorkOrder: (wo: WorkOrder) => void;
  onAssignTechnician: (workOrderNumber: string, technicianId: string) => void;
  onNavigate: (module: ActiveModule, hint?: string) => void;
  onSelectJobCard: (jobCardId: string) => void;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  technicians,
  onImportBatch,
  onAddWorkOrder,
  onAssignTechnician,
  onNavigate,
  onSelectJobCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | WorkOrderStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | WorkType>('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // New work order form state
  const [customerName, setCustomerName] = useState('');
  const [accountNumber, setAccountNumber] = useState('ACC-55019880');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('Randburg');
  const [ward, setWard] = useState('Ward 102');
  const [oldDeviceSerial, setOldDeviceSerial] = useState('449120');
  const [oldDeviceMake, setOldDeviceMake] = useState('AEG Mechanical Disc');
  const [existingReading, setExistingReading] = useState('34190.5');
  const [workType, setWorkType] = useState<WorkType>('Installation');
  const [assignedTechId, setAssignedTechId] = useState('TECH-01');
  const [municipalNotes, setMunicipalNotes] = useState(
    'Priority smart prepaid meter conversion allocated by municipality.'
  );

  const handleBatchImport = () => {
    const count = onImportBatch();
    setImportNotice(
      `Imported ${count} municipal work orders from batch JHB-CITYPOWER-0926B into register.`
    );
    setTimeout(() => setImportNotice(null), 5000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !address.trim()) return;
    const tech = technicians.find((t) => t.id === assignedTechId);
    const maxWoNum = workOrders.reduce((max, w) => {
      const match = w.workOrderNumber.match(/WO-2026-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return !isNaN(n) && n > max ? n : max;
    }, 8846);
    const nextNum = maxWoNum + 1;
    const newWo: WorkOrder = {
      workOrderNumber: `WO-2026-${nextNum}`,
      municipalBatchId: 'JHB-CITYPOWER-0926',
      customerName: customerName.trim(),
      accountNumber: accountNumber.trim(),
      address: address.trim(),
      suburb: suburb.trim(),
      ward: ward.trim(),
      oldDeviceSerial: oldDeviceSerial.trim(),
      oldDeviceMake: oldDeviceMake.trim(),
      existingReading: parseFloat(existingReading) || 0,
      workType,
      status: tech ? 'Assigned' : 'Received',
      assignedTechnicianId: tech?.id,
      assignedTechnicianName: tech?.name,
      dateAllocated: '28 September 2026 · Live Dispatch',
      municipalNotes: municipalNotes.trim(),
    };
    onAddWorkOrder(newWo);
    setCustomerName('');
    setAddress('');
    setShowCreateForm(false);
    setImportNotice(
      `Work Order ${newWo.workOrderNumber} registered and dispatched to ${
        tech ? `${tech.name} (${tech.employeeCode})` : 'Unassigned Queue'
      } — synced live to mobile field terminals.`
    );
    setTimeout(() => setImportNotice(null), 5000);
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchesStatus = statusFilter === 'All' || wo.status === statusFilter;
    const matchesType = typeFilter === 'All' || wo.workType === typeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      wo.workOrderNumber.toLowerCase().includes(q) ||
      wo.accountNumber.toLowerCase().includes(q) ||
      wo.customerName.toLowerCase().includes(q) ||
      wo.address.toLowerCase().includes(q) ||
      wo.oldDeviceSerial.toLowerCase().includes(q) ||
      (wo.installedDeviceSerial &&
        wo.installedDeviceSerial.toLowerCase().includes(q)) ||
      (wo.assignedTechnicianName &&
        wo.assignedTechnicianName.toLowerCase().includes(q));
    return matchesStatus && matchesType && matchesQuery;
  });

  const statusCounts = {
    All: workOrders.length,
    Received: workOrders.filter((w) => w.status === 'Received').length,
    Assigned: workOrders.filter((w) => w.status === 'Assigned').length,
    Completed: workOrders.filter((w) => w.status === 'Completed').length,
    Submitted: workOrders.filter((w) => w.status === 'Submitted').length,
    Exception: workOrders.filter((w) => w.status === 'Exception').length,
  };

  return (
    <div className="space-y-4">
      {/* Enterprise Header + Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Municipal Work Order Management</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Batch: JHB-CITYPOWER-0926</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              Work Order Register & Dispatch Queue
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBatchImport}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Batch CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>

        {importNotice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-medium">{importNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="text-emerald-800 hover:text-emerald-950"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapsible New Work Order Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="mt-4 pt-4 border-t border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900">
                Register New Municipal Work Order
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. K.R. Nkosi"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 58 Valley Road, Bordeaux"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Suburb & SDC
                </label>
                <input
                  type="text"
                  value={`${suburb} · ${ward}`}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Old Meter Serial #
                </label>
                <input
                  type="text"
                  value={oldDeviceSerial}
                  onChange={(e) => setOldDeviceSerial(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Closing Reading (kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={existingReading}
                  onChange={(e) => setExistingReading(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Work Type
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value as WorkType)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Installation">Installation</option>
                  <option value="Audit">Audit</option>
                  <option value="Cut-Off">Cut-Off</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Assign Technician
                </label>
                <select
                  value={assignedTechId}
                  onChange={(e) => setAssignedTechId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="">Unassigned (Keep in Received)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Save & Dispatch Work Order
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4-Column Enterprise KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-md divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Total Registered Orders
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {statusCounts.All}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Dispatched to Crew
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {statusCounts.Assigned}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Completed & Submitted
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {statusCounts.Completed + statusCounts.Submitted}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Pending / Site Exceptions
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-amber-700 mt-1">
            {statusCounts.Received} Pending ·{' '}
            <span className="text-red-700">{statusCounts.Exception} Ex</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar + Data Grid */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
          {/* Interactive Status Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded overflow-x-auto">
            {(
              [
                'All',
                'Received',
                'Assigned',
                'Completed',
                'Submitted',
                'Exception',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st} ({statusCounts[st]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Work Type Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded">
              {(['All', 'Installation', 'Audit', 'Cut-Off'] as const).map(
                (wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setTypeFilter(wt)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      typeFilter === wt
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {wt}
                  </button>
                )
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter WO#, Account#, Serial..."
                className="w-full pl-8 pr-3 py-1 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* High-Density Enterprise Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/90">
                <th className="py-2.5 px-3.5">Work Order #</th>
                <th className="py-2.5 px-3.5">Account #</th>
                <th className="py-2.5 px-3.5">Customer & Service Address</th>
                <th className="py-2.5 px-3.5">Existing Meter & Reading</th>
                <th className="py-2.5 px-3.5">Assigned Crew</th>
                <th className="py-2.5 px-3.5">Execution Status</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredOrders.map((wo) => (
                <tr
                  key={wo.workOrderNumber}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-3.5 align-top font-mono">
                    <div className="font-semibold text-slate-900">
                      {wo.workOrderNumber}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {wo.workType} · {wo.dateAllocated}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top font-mono text-slate-700">
                    {wo.accountNumber.replace(/^ACC-|^MPT-/, '')}
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    <div className="font-medium text-slate-900">
                      {wo.address}, {wo.suburb}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {wo.customerName} · {wo.ward}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top font-mono">
                    <div className="text-slate-900 font-semibold">
                      #{wo.oldDeviceSerial}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {wo.existingReading.toLocaleString('en-ZA', {
                        minimumFractionDigits: 1,
                      })}{' '}
                      kWh · {wo.oldDeviceMake}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    {wo.assignedTechnicianName ? (
                      <div>
                        <div className="text-slate-900 font-medium">
                          {wo.assignedTechnicianName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {wo.assignedTechnicianId}
                        </div>
                      </div>
                    ) : (
                      <select
                        aria-label={`Assign technician to ${wo.workOrderNumber}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignTechnician(
                              wo.workOrderNumber,
                              e.target.value
                            );
                          }
                        }}
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="" disabled>
                          Assign Crew...
                        </option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.employeeCode})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5 align-top">
                    <div
                      className={`font-semibold font-mono text-[11px] ${
                        wo.status === 'Submitted' || wo.status === 'Completed'
                          ? 'text-emerald-700'
                          : wo.status === 'Assigned'
                          ? 'text-blue-700'
                          : wo.status === 'Exception'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {wo.status.toUpperCase()}
                      {wo.installedDeviceSerial
                        ? ` · New #${wo.installedDeviceSerial}`
                        : ''}
                    </div>
                    <div className="text-[11px] text-slate-500 max-w-[220px] truncate">
                      {wo.exceptionReason || wo.municipalNotes}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 align-top text-right whitespace-nowrap">
                    {wo.jobCardId ? (
                      <button
                        type="button"
                        onClick={() => onSelectJobCard(wo.jobCardId!)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        View Sheet →
                      </button>
                    ) : wo.status === 'Assigned' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate('field-capture', wo.workOrderNumber)
                        }
                        className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Execute</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Unassigned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
