import React, { useState } from 'react';
import {
  Search,
  Upload,
  Plus,
  ArrowRight,
  Check,
  X,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Camera,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import {
  WorkOrder,
  WorkType,
  WorkOrderStatus,
  Technician,
  ActiveModule,
  JobCardRecord,
} from '../types';
import { DEFAULT_PHOTOS } from '../data/initialData';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  jobCards?: JobCardRecord[];
  capturedPhotos?: {
    oldMeterUrl?: string;
    newMeterUrl?: string;
  };
  onImportBatch: () => number;
  onAddWorkOrder: (wo: WorkOrder) => void;
  onAssignTechnician: (workOrderNumber: string, technicianId: string) => void;
  onNavigate: (module: ActiveModule, hint?: string) => void;
  onSelectJobCard: (jobCardId: string) => void;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  technicians,
  jobCards = [],
  capturedPhotos,
  onImportBatch,
  onAddWorkOrder,
  onAssignTechnician,
  onNavigate,
  onSelectJobCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | WorkOrderStatus>(
    'All'
  );
  const [typeFilter, setTypeFilter] = useState<'All' | WorkType>('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [selectedWONumber, setSelectedWONumber] = useState<string>(
    workOrders[0]?.workOrderNumber || 'WO-2026-8841'
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

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
    setSelectedWONumber(newWo.workOrderNumber);
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

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const selectedWO =
    workOrders.find((w) => w.workOrderNumber === selectedWONumber) ||
    filteredOrders[0] ||
    workOrders[0];

  const linkedJobCard = selectedWO
    ? jobCards.find(
        (jc) =>
          jc.workOrderNumber === selectedWO.workOrderNumber ||
          jc.jobCardId === selectedWO.jobCardId
      )
    : undefined;

  const statusCounts = {
    All: workOrders.length,
    Received: workOrders.filter((w) => w.status === 'Received').length,
    Assigned: workOrders.filter((w) => w.status === 'Assigned').length,
    Completed: workOrders.filter((w) => w.status === 'Completed').length,
    Submitted: workOrders.filter((w) => w.status === 'Submitted').length,
    Exception: workOrders.filter((w) => w.status === 'Exception').length,
  };

  const formatOperationalStatus = (status: WorkOrderStatus) => {
    switch (status) {
      case 'Assigned':
        return { label: 'IN PROGRESS', color: 'text-blue-600' };
      case 'Completed':
        return { label: 'COMPLETED', color: 'text-emerald-700' };
      case 'Submitted':
        return { label: 'SUBMITTED', color: 'text-emerald-700' };
      case 'Exception':
        return { label: 'EXCEPTION', color: 'text-rose-600' };
      default:
        return { label: 'PENDING DISPATCH', color: 'text-amber-700' };
    }
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
                Batch JHB-CITYPOWER-0926
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Work Orders
            </h1>
            <p className="text-sm text-slate-500">
              Manage municipal meter instructions, crew assignments, and site
              execution records.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleBatchImport}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Batch CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>

        {/* Toast / Banner Notification */}
        {importNotice && (
          <div className="mt-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{importNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Collapsible New Work Order Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="mt-6 pt-5 border-t border-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Register New Municipal Work Order
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create and dispatch a meter replacement or audit instruction
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. K.R. Nkosi"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 58 Valley Road, Bordeaux"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Suburb & SDC
                </label>
                <input
                  type="text"
                  value={`${suburb} · ${ward}`}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Old Meter Serial #
                </label>
                <input
                  type="text"
                  value={oldDeviceSerial}
                  onChange={(e) => setOldDeviceSerial(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Closing Reading (kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={existingReading}
                  onChange={(e) => setExistingReading(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Work Type
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value as WorkType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Installation">Installation</option>
                  <option value="Audit">Audit</option>
                  <option value="Cut-Off">Cut-Off</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Assign Technician
                </label>
                <select
                  value={assignedTechId}
                  onChange={(e) => setAssignedTechId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="">Unassigned (Keep in Pending)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                Save & Dispatch Work Order
              </button>
            </div>
          </form>
        )}
      </div>

      {/* =====================================================================
          KPI SUMMARY CARDS
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
            {statusCounts.All}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Total Work Orders
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Batch JHB-CITYPOWER-0926
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-blue-600">
            {statusCounts.Assigned}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            In Progress
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Dispatched to field crews
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-emerald-700">
            {statusCounts.Completed + statusCounts.Submitted}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Completed & Submitted
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Verified with job cards
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-amber-700">
            {statusCounts.Received + statusCounts.Exception}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Pending & Exceptions
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            {statusCounts.Received} pending ·{' '}
            <span className="text-rose-600 font-semibold">
              {statusCounts.Exception} exceptions
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          OBJECTIVE 4 — SEPARATED SEARCH & FILTER BAR
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Interactive Status Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
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
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'Assigned'
                ? 'In Progress'
                : st === 'Received'
                ? 'Pending'
                : st}{' '}
              ({statusCounts[st]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Work Type Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Installation', 'Audit', 'Cut-Off'] as const).map(
              (wt) => (
                <button
                  key={wt}
                  type="button"
                  onClick={() => {
                    setTypeFilter(wt);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search WO#, customer, serial..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          OBJECTIVE 4 & 5 — MASTER-DETAIL WORK ORDER TABLE + SAAS OBJECT VIEW
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Upgraded SaaS Data Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col justify-between self-start">
          {filteredOrders.length === 0 ? (
            /* Objective 8 — Polished Empty State */
            <div className="p-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No work orders to display
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your current work order list is empty or no records match your
                active search and filter criteria.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
                    setTypeFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-5">Work Order</th>
                      <th className="py-3 px-5">Customer & Address</th>
                      <th className="py-3 px-5">Technician</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedOrders.map((wo) => {
                      const isSelected =
                        selectedWO?.workOrderNumber === wo.workOrderNumber;
                      const stMeta = formatOperationalStatus(wo.status);

                      return (
                        <tr
                          key={wo.workOrderNumber}
                          onClick={() => setSelectedWONumber(wo.workOrderNumber)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/50'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-5 align-top font-mono">
                            <div className="font-semibold text-slate-900">
                              {wo.workOrderNumber}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {wo.workType} · #{wo.oldDeviceSerial}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 align-top">
                            <div className="font-medium text-slate-900 text-sm">
                              {wo.customerName}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {wo.address}, {wo.suburb}
                            </div>
                          </td>

                          <td
                            className="py-3.5 px-5 align-top"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {wo.assignedTechnicianName ? (
                              <div>
                                <div className="text-slate-900 font-medium">
                                  {wo.assignedTechnicianName}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
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
                                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-600"
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

                          <td className="py-3.5 px-5 align-top">
                            <div
                              className={`font-mono text-xs font-semibold ${stMeta.color}`}
                            >
                              {stMeta.label}
                            </div>
                            {wo.installedDeviceSerial && (
                              <div className="text-xs font-mono text-slate-500 mt-0.5">
                                New #{wo.installedDeviceSerial}
                              </div>
                            )}
                          </td>

                          <td
                            className="py-3.5 px-5 align-top text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {wo.jobCardId ? (
                              <button
                                type="button"
                                onClick={() => onSelectJobCard(wo.jobCardId!)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                View Report →
                              </button>
                            ) : wo.status === 'Assigned' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigate(
                                    'field-capture',
                                    wo.workOrderNumber
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <span>Execute</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedWONumber(wo.workOrderNumber)
                                }
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                Inspect
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Consistent Table Pagination Bar */}
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing{' '}
                  <strong className="font-mono text-slate-900">
                    {(safePage - 1) * pageSize + 1}–
                    {Math.min(safePage * pageSize, filteredOrders.length)}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-mono text-slate-900">
                    {filteredOrders.length}
                  </strong>{' '}
                  work orders
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="px-2 font-mono text-slate-600">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* =====================================================================
            OBJECTIVE 5 — IMPROVED DETAIL PAGE (WORK ORDER SAAS RECORD OBJECT)
            Header -> Overview -> Activity -> Evidence -> Actions
           ===================================================================== */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-6 self-start">
          {selectedWO ? (
            <>
              {/* 1. Record Header */}
              <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    WORK ORDER RECORD · {selectedWO.municipalBatchId}
                  </div>
                  <h2 className="text-xl font-semibold font-mono text-slate-900 mt-1">
                    {selectedWO.workOrderNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedWO.workType} · Account{' '}
                    <span className="font-mono text-slate-700">
                      {selectedWO.accountNumber}
                    </span>
                  </p>
                </div>

                <div
                  className={`font-mono text-xs font-semibold ${
                    formatOperationalStatus(selectedWO.status).color
                  }`}
                >
                  {formatOperationalStatus(selectedWO.status).label}
                </div>
              </div>

              {/* 2. Overview Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">Customer</div>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {selectedWO.customerName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Address</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {selectedWO.address}, {selectedWO.suburb} (
                      {selectedWO.ward})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Technician</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {selectedWO.assignedTechnicianName ||
                        'Unassigned (Pending)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Date</div>
                    <div className="font-mono text-slate-900 mt-0.5">
                      {selectedWO.completedDate || selectedWO.dateAllocated}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Existing Meter</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      #{selectedWO.oldDeviceSerial} ({selectedWO.oldDeviceMake})
                    </div>
                    <div className="font-mono text-slate-500">
                      {selectedWO.existingReading.toLocaleString()} kWh
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Status</div>
                    <div
                      className={`font-mono font-semibold mt-0.5 ${
                        formatOperationalStatus(selectedWO.status).color
                      }`}
                    >
                      {formatOperationalStatus(selectedWO.status).label}
                    </div>
                    {selectedWO.installedDeviceSerial && (
                      <div className="font-mono text-emerald-700">
                        New #{selectedWO.installedDeviceSerial}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Activity Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Activity
                </h3>
                <div className="space-y-3 border-l-2 border-slate-100 ml-1.5 pl-4 text-xs">
                  <div>
                    <div className="font-mono text-slate-400 text-[11px]">
                      01 · Batch Intake
                    </div>
                    <div className="font-medium text-slate-900">
                      Imported under Municipal Batch{' '}
                      {selectedWO.municipalBatchId}
                    </div>
                    <div className="text-slate-500">
                      {selectedWO.municipalNotes}
                    </div>
                  </div>

                  {selectedWO.assignedTechnicianName && (
                    <div>
                      <div className="font-mono text-blue-600 text-[11px]">
                        02 · Crew Allocation · {selectedWO.dateAllocated}
                      </div>
                      <div className="font-medium text-slate-900">
                        Dispatched to {selectedWO.assignedTechnicianName} (
                        {selectedWO.assignedTechnicianId})
                      </div>
                    </div>
                  )}

                  {selectedWO.status === 'Exception' && (
                    <div>
                      <div className="font-mono text-rose-600 text-[11px]">
                        03 · Site Exception Logged
                      </div>
                      <div className="font-medium text-rose-700">
                        {selectedWO.exceptionReason}
                      </div>
                    </div>
                  )}

                  {(selectedWO.status === 'Completed' ||
                    selectedWO.status === 'Submitted') && (
                    <div>
                      <div className="font-mono text-emerald-700 text-[11px]">
                        03 · Field Installation Verified ·{' '}
                        {selectedWO.completedDate}
                      </div>
                      <div className="font-medium text-slate-900">
                        Meter #{selectedWO.installedDeviceSerial} commissioned
                        on site
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Evidence Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Evidence
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {linkedJobCard
                      ? `Report ${linkedJobCard.jobCardId}`
                      : 'Photographic Archive'}
                  </span>
                </div>

                {linkedJobCard ||
                capturedPhotos?.oldMeterUrl ||
                capturedPhotos?.newMeterUrl ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <img
                        src={
                          capturedPhotos?.oldMeterUrl ||
                          linkedJobCard?.photos.oldMeterUrl ||
                          DEFAULT_PHOTOS.oldMeterUrl
                        }
                        alt="Old Meter Evidence"
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2 text-[11px] font-mono text-slate-600 truncate">
                        Photo 1 · Old #{selectedWO.oldDeviceSerial}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <img
                        src={
                          capturedPhotos?.newMeterUrl ||
                          linkedJobCard?.photos.newMeterUrl ||
                          DEFAULT_PHOTOS.newMeterUrl
                        }
                        alt="New Meter Evidence"
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2 text-[11px] font-mono text-slate-600 truncate">
                        Photo 2 · New #
                        {selectedWO.installedDeviceSerial ||
                          linkedJobCard?.newDeviceSerial ||
                          'Meter'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-lg text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      Mandatory old &amp; new meter photographs are captured
                      during site execution.
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Actions Section */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedWO.jobCardId || linkedJobCard ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectJobCard(
                          (selectedWO.jobCardId || linkedJobCard?.jobCardId)!
                        )
                      }
                      className="flex-1 py-2.5 px-4 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Open Commissioning Sheet</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('field-capture', selectedWO.workOrderNumber)
                    }
                    className="flex-1 py-2.5 px-4 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Execute in Field Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
};
