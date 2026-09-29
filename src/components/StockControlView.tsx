import React, { useState, useEffect } from 'react';
import {
  Search,
  Barcode,
  Plus,
  History,
  ArrowRight,
  Check,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  MeterDevice,
  DeviceStatus,
  Technician,
  ActiveModule,
} from '../types';

interface StockControlViewProps {
  devices: MeterDevice[];
  technicians: Technician[];
  initialSearchSerial?: string;
  onRegisterDevice: (device: MeterDevice) => void;
  onRegisterBatch: () => number;
  onAllocateDevice: (serialNumber: string, technicianId: string) => void;
  onReturnDeviceToStore: (serialNumber: string, note: string) => void;
  onNavigate: (module: ActiveModule, hint?: string) => void;
}

export const StockControlView: React.FC<StockControlViewProps> = ({
  devices,
  technicians,
  initialSearchSerial,
  onRegisterDevice,
  onRegisterBatch,
  onAllocateDevice,
  onReturnDeviceToStore,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchSerial || '');
  const [statusFilter, setStatusFilter] = useState<'All' | DeviceStatus>('All');
  const [selectedSerial, setSelectedSerial] = useState<string>(
    initialSearchSerial || '987654'
  );
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Register single device state
  const [newSerial, setNewSerial] = useState('987663');
  const [manufacturer, setManufacturer] = useState('Conlog');
  const [model, setModel] = useState('BEC23 Smart Split Prepaid');
  const [deviceType, setDeviceType] = useState('Single-Phase Smart Prepaid');
  const [batchNumber, setBatchNumber] = useState('MUN-BATCH-09D');

  useEffect(() => {
    if (initialSearchSerial) {
      setSearchQuery(initialSearchSerial);
      setSelectedSerial(initialSearchSerial);
      setCurrentPage(1);
    }
  }, [initialSearchSerial]);

  const handleScanBatch = () => {
    const added = onRegisterBatch();
    setBannerMsg(
      `Scanned ${added} new municipal meters into Central Store (Status: Available).`
    );
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handleRegisterSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = newSerial.trim();
    if (!cleanSerial) return;
    if (devices.some((d) => d.serialNumber === cleanSerial)) {
      setBannerMsg(
        `Meter serial #${cleanSerial} is already registered in the asset ledger.`
      );
      return;
    }

    const newDev: MeterDevice = {
      serialNumber: cleanSerial,
      manufacturer,
      model,
      deviceType,
      dateReceived: '26 September 2026',
      batchNumber,
      status: 'Available',
      sealNumber: `SL-${Math.floor(90425 + Math.random() * 500)}`,
      custodyHistory: [
        {
          id: `EVT-${cleanSerial}-1`,
          timestamp: '26 September 2026 · 15:30',
          status: 'Available',
          actor: 'Depot Stores Clerk (K. Mahlangu)',
          locationOrHolder: 'Central Municipal Cage · Midrand',
          note: `Scanned into system via optical barcode intake (${batchNumber}).`,
        },
      ],
    };
    onRegisterDevice(newDev);
    setSelectedSerial(cleanSerial);
    setNewSerial(String(Number(cleanSerial) + 1 || '987669'));
    setShowRegisterForm(false);
    setBannerMsg(
      `Meter #${cleanSerial} registered with digital identity and marked Available in store.`
    );
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const filteredDevices = devices.filter((d) => {
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      d.serialNumber.toLowerCase().includes(q) ||
      d.manufacturer.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      (d.assignedTechnicianName &&
        d.assignedTechnicianName.toLowerCase().includes(q)) ||
      (d.installedWorkOrderNumber &&
        d.installedWorkOrderNumber.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDevices = filteredDevices.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const selectedDevice =
    devices.find((d) => d.serialNumber === selectedSerial) ||
    filteredDevices[0] ||
    devices[0];

  const counts = {
    All: devices.length,
    Available: devices.filter((d) => d.status === 'Available').length,
    Allocated: devices.filter((d) => d.status === 'Allocated').length,
    Installed: devices.filter((d) => d.status === 'Installed').length,
    Investigation: devices.filter((d) => d.status === 'Investigation').length,
  };

  const formatDeviceStatus = (status: DeviceStatus) => {
    switch (status) {
      case 'Installed':
        return { label: 'INSTALLED', color: 'text-emerald-700' };
      case 'Allocated':
        return { label: 'IN CUSTODY', color: 'text-blue-600' };
      case 'Investigation':
        return { label: 'INVESTIGATION', color: 'text-rose-600' };
      default:
        return { label: 'AVAILABLE', color: 'text-slate-700' };
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
                Midrand Central Cage
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Devices
            </h1>
            <p className="text-sm text-slate-500">
              Track smart meter inventory, optical batch intake, and complete
              chain-of-custody history.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleScanBatch}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Barcode className="w-3.5 h-3.5 text-slate-500" />
              <span>Scan Delivery Batch</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Device</span>
            </button>
          </div>
        </div>

        {bannerMsg && (
          <div className="mt-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{bannerMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMsg(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showRegisterForm && (
          <form
            onSubmit={handleRegisterSingle}
            className="mt-6 pt-5 border-t border-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Register New Municipal Meter into Depot Store
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a verified serial identity and seal number in Central
                  Store
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Meter Serial Number *
                </label>
                <input
                  type="text"
                  required
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Manufacturer
                </label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Conlog">Conlog</option>
                  <option value="Landis+Gyr">Landis+Gyr</option>
                  <option value="Hexing">Hexing</option>
                  <option value="Itron">Itron</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Device Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Meter Classification
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Single-Phase Smart Prepaid">
                    Single-Phase Smart Prepaid
                  </option>
                  <option value="Three-Phase Smart CT/Direct">
                    Three-Phase Smart CT/Direct
                  </option>
                  <option value="Conventional AMI">Conventional AMI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Batch Reference #
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                Save Asset to Store
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
            {counts.All}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Total Devices
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Registered in asset ledger
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
            {counts.Available}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Available in Store
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Ready for vehicle issue
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-blue-600">
            {counts.Allocated}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            In Vehicle Custody
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Assigned to field crews
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-emerald-700">
            {counts.Installed}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">
            Installed on Site
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            {counts.Installed} verified ·{' '}
            <span className="text-rose-600 font-semibold">
              {counts.Investigation} audit
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          OBJECTIVE 4 — SEPARATED FILTER & INSTANT SERIAL SEARCH TOOLBAR
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(
            [
              'All',
              'Available',
              'Allocated',
              'Installed',
              'Investigation',
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
              {st === 'Allocated' ? 'In Custody' : st} ({counts[st]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs text-slate-500">
            Quick lookup:{' '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('14521344573');
                setSelectedSerial('14521344573');
                setCurrentPage(1);
              }}
              className="font-mono text-slate-700 hover:text-blue-600 cursor-pointer"
            >
              14521344573
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('987654');
                setSelectedSerial('987654');
                setCurrentPage(1);
              }}
              className="font-mono text-slate-700 hover:text-blue-600 cursor-pointer"
            >
              987654
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSerial('987619');
                setCurrentPage(1);
              }}
              className="font-mono text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
            >
              987619 (Audit)
            </button>
            {searchQuery && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Reset
                </button>
              </>
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
              placeholder="Search serial #, batch, holder..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          MASTER-DETAIL SPLIT: STOCK TABLE (7 COLS) + DEVICE DOSSIER (5 COLS)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stock Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden self-start flex flex-col justify-between">
          {filteredDevices.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No devices to display
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your current device list is empty or no meters match your active
                filter criteria.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
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
                      <th className="py-3 px-5">Serial & Seal</th>
                      <th className="py-3 px-5">Make & Model</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Current Custody</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedDevices.map((dev) => {
                      const isSelected =
                        selectedDevice?.serialNumber === dev.serialNumber;
                      const stMeta = formatDeviceStatus(dev.status);
                      return (
                        <tr
                          key={dev.serialNumber}
                          onClick={() => setSelectedSerial(dev.serialNumber)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/50'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-5 align-top font-mono">
                            <div className="font-semibold text-slate-900 text-sm">
                              #{dev.serialNumber}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {dev.sealNumber}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 align-top">
                            <div className="font-medium text-slate-900">
                              {dev.manufacturer} {dev.model}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {dev.batchNumber} · {dev.dateReceived}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 align-top font-mono text-xs font-semibold">
                            <span className={stMeta.color}>{stMeta.label}</span>
                          </td>

                          <td className="py-3.5 px-5 align-top">
                            {dev.status === 'Available' && (
                              <div className="text-slate-600">
                                Central Municipal Cage
                              </div>
                            )}
                            {dev.status === 'Allocated' && (
                              <div className="text-slate-900 font-medium">
                                {dev.assignedTechnicianName}
                                <div className="text-xs text-slate-500 font-normal mt-0.5">
                                  Issued {dev.dateIssued}
                                </div>
                              </div>
                            )}
                            {dev.status === 'Installed' && (
                              <div className="text-slate-900 font-medium font-mono">
                                {dev.installedWorkOrderNumber}
                                <div className="text-xs text-slate-500 font-sans font-normal mt-0.5">
                                  {dev.assignedTechnicianName}
                                </div>
                              </div>
                            )}
                            {dev.status === 'Investigation' && (
                              <div className="text-rose-600 font-medium">
                                Overdue ({dev.assignedTechnicianName})
                                <div className="text-xs text-rose-500 font-normal mt-0.5">
                                  Issued {dev.dateIssued}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-5 align-top text-right whitespace-nowrap">
                            <span className="text-xs font-medium text-blue-600 hover:text-blue-800">
                              Inspect →
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Consistent Table Pagination */}
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing{' '}
                  <strong className="font-mono text-slate-900">
                    {(safePage - 1) * pageSize + 1}–
                    {Math.min(safePage * pageSize, filteredDevices.length)}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-mono text-slate-900">
                    {filteredDevices.length}
                  </strong>{' '}
                  devices
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
            OBJECTIVE 5 — DEVICE RECORD DETAIL OBJECT
            Header -> Overview -> Activity -> Actions
           ===================================================================== */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-6 self-start">
          {selectedDevice ? (
            <>
              {/* 1. Header */}
              <div className="pb-4 border-b border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>DEVICE RECORD</span>
                  <span>{selectedDevice.batchNumber}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <h2 className="text-xl font-semibold font-mono text-slate-900">
                    Meter #{selectedDevice.serialNumber}
                  </h2>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      formatDeviceStatus(selectedDevice.status).color
                    }`}
                  >
                    {formatDeviceStatus(selectedDevice.status).label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedDevice.manufacturer} · {selectedDevice.model} ·{' '}
                  {selectedDevice.deviceType}
                </p>
              </div>

              {/* 2. Overview */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">Intake Date</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      {selectedDevice.dateReceived}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Seal Number</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      {selectedDevice.sealNumber || 'SL-90400'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Custody Holder</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {selectedDevice.assignedTechnicianName ||
                        'Central Municipal Cage'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Issued / Installed</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      {selectedDevice.installedDate ||
                        selectedDevice.dateIssued ||
                        'In Depot Store'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Actions Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </h3>

                {selectedDevice.status === 'Available' && (
                  <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-lg space-y-2.5">
                    <div className="text-xs font-semibold text-slate-900">
                      Issue Meter #{selectedDevice.serialNumber} to Vehicle
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        id="quick-allocate-tech"
                        defaultValue="TECH-01"
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        onChange={(e) => {
                          onAllocateDevice(
                            selectedDevice.serialNumber,
                            e.target.value
                          );
                          setBannerMsg(
                            `Meter #${selectedDevice.serialNumber} digitally issued to technician.`
                          );
                        }}
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.employeeCode})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = document.getElementById(
                            'quick-allocate-tech'
                          ) as HTMLSelectElement;
                          onAllocateDevice(
                            selectedDevice.serialNumber,
                            sel?.value || 'TECH-01'
                          );
                          setBannerMsg(
                            `Meter #${selectedDevice.serialNumber} allocated to technician.`
                          );
                        }}
                        className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap cursor-pointer shadow-2xs"
                      >
                        Issue Asset
                      </button>
                    </div>
                  </div>
                )}

                {selectedDevice.status === 'Allocated' && (
                  <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-lg space-y-2.5">
                    <div className="text-xs font-semibold text-blue-950">
                      Active Vehicle Custody ·{' '}
                      {selectedDevice.assignedTechnicianName}
                    </div>
                    <p className="text-xs text-slate-600">
                      Issued on {selectedDevice.dateIssued}. Authorised for
                      field installation by{' '}
                      {selectedDevice.assignedTechnicianName}.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(
                            'field-capture',
                            selectedDevice.serialNumber
                          )
                        }
                        className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Execute in Field App</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onReturnDeviceToStore(
                            selectedDevice.serialNumber,
                            'Returned unused to Central Municipal Cage and scanned back into Available stock.'
                          );
                          setBannerMsg(
                            `Meter #${selectedDevice.serialNumber} returned to depot store.`
                          );
                        }}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        Return to Store
                      </button>
                    </div>
                  </div>
                )}

                {selectedDevice.status === 'Installed' && (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-lg space-y-2">
                    <div className="text-xs font-semibold text-emerald-900">
                      Installed on Work Order{' '}
                      {selectedDevice.installedWorkOrderNumber}
                    </div>
                    <p className="text-xs text-slate-600">
                      Commissioned on {selectedDevice.installedDate} by{' '}
                      {selectedDevice.assignedTechnicianName}.
                    </p>
                  </div>
                )}

                {selectedDevice.status === 'Investigation' && (
                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg space-y-2.5">
                    <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Custody Audit Exception</span>
                    </div>
                    <p className="text-xs text-rose-800">
                      Meter #{selectedDevice.serialNumber} held by{' '}
                      {selectedDevice.assignedTechnicianName} since{' '}
                      {selectedDevice.dateIssued} without installation or return
                      scan.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onReturnDeviceToStore(
                            selectedDevice.serialNumber,
                            'Physical audit completed: Meter recovered from vehicle BV 09 GP and checked back into Central Store.'
                          );
                          setBannerMsg(
                            `Meter #${selectedDevice.serialNumber} reconciled and returned to store.`
                          );
                        }}
                        className="px-3.5 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer shadow-2xs"
                      >
                        Record Recovery &amp; Return to Store
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Activity Timeline */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Activity &amp; Custody History
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedDevice.custodyHistory.length} Events
                  </span>
                </div>

                <div className="space-y-3.5 border-l-2 border-slate-100 ml-1.5 pl-4">
                  {selectedDevice.custodyHistory.map((evt, index) => (
                    <div key={evt.id} className="space-y-0.5">
                      <div className="text-[11px] font-mono text-slate-400">
                        0{index + 1} · {evt.timestamp}
                      </div>
                      <div className="text-xs font-semibold text-slate-900">
                        {evt.status.toUpperCase()} — {evt.locationOrHolder}
                      </div>
                      <div className="text-xs text-slate-600">{evt.note}</div>
                      <div className="text-[11px] text-slate-400">
                        Operator: {evt.actor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
};
