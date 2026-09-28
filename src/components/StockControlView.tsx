import React, { useState, useEffect } from 'react';
import {
  Search,
  Barcode,
  Plus,
  History,
  ArrowRight,
  Check,
  AlertTriangle,
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

  return (
    <div className="space-y-4">
      {/* Enterprise Header + Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Inventory & Chain-of-Custody Control</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Depot: Midrand Central Cage</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              Meter Asset Register & Custody Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleScanBatch}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Scan Delivery Batch</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Meter Serial</span>
            </button>
          </div>
        </div>

        {bannerMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-medium">{bannerMsg}</span>
          </div>
        )}

        {showRegisterForm && (
          <form
            onSubmit={handleRegisterSingle}
            className="mt-4 pt-4 border-t border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900">
                Register New Municipal Meter into Depot Store
              </h2>
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meter Serial Number *
                </label>
                <input
                  type="text"
                  required
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Manufacturer
                </label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Conlog">Conlog</option>
                  <option value="Landis+Gyr">Landis+Gyr</option>
                  <option value="Hexing">Hexing</option>
                  <option value="Itron">Itron</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Device Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meter Classification
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-600"
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
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Batch Reference #
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Save Asset to Store
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4-Column Inventory KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-md divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Total Registered Meters
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {counts.All}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Available in Store Cage
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-800 mt-1">
            {counts.Available}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Allocated to Field Vehicles
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {counts.Allocated}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Installed / Audit Flagged
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {counts.Installed} Inst ·{' '}
            <span className="text-red-700">{counts.Investigation} Audit</span>
          </div>
        </div>
      </div>

      {/* Filter & Instant Serial Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded overflow-x-auto">
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
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st} ({counts[st]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] text-slate-500">
            Quick lookup:{' '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('14521344573');
                setSelectedSerial('14521344573');
              }}
              className="font-mono text-slate-800 underline hover:text-blue-700 cursor-pointer"
            >
              14521344573
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('987654');
                setSelectedSerial('987654');
              }}
              className="font-mono text-slate-800 underline hover:text-blue-700 cursor-pointer"
            >
              987654
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSerial('987619');
              }}
              className="font-mono text-red-700 underline hover:text-red-900 cursor-pointer"
            >
              987619 (Audit)
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-600 underline hover:text-slate-900 cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Serial #, Batch, Holder..."
              className="w-full pl-8 pr-3 py-1 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Master-Detail Split: Stock Table (7 cols) + Digital Identity & Custody History (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Stock Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden self-start">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/90">
                  <th className="py-2.5 px-3.5">Serial & Seal #</th>
                  <th className="py-2.5 px-3.5">Make & Model</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Current Custody / WO</th>
                  <th className="py-2.5 px-3.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredDevices.map((dev) => {
                  const isSelected =
                    selectedDevice?.serialNumber === dev.serialNumber;
                  return (
                    <tr
                      key={dev.serialNumber}
                      onClick={() => setSelectedSerial(dev.serialNumber)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 align-top font-mono">
                        <div className="font-semibold text-slate-900">
                          #{dev.serialNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dev.sealNumber}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top">
                        <div className="font-medium text-slate-900">
                          {dev.manufacturer} {dev.model}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dev.batchNumber} · {dev.dateReceived}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top font-mono text-[11px] font-semibold">
                        <span
                          className={
                            dev.status === 'Installed'
                              ? 'text-emerald-700'
                              : dev.status === 'Allocated'
                              ? 'text-blue-700'
                              : dev.status === 'Investigation'
                              ? 'text-red-700'
                              : 'text-slate-700'
                          }
                        >
                          {dev.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 align-top">
                        {dev.status === 'Available' && (
                          <div className="text-slate-600">
                            Central Municipal Cage
                          </div>
                        )}
                        {dev.status === 'Allocated' && (
                          <div className="text-slate-900 font-medium">
                            {dev.assignedTechnicianName}
                            <div className="text-[11px] text-slate-500 font-normal">
                              Issued {dev.dateIssued}
                            </div>
                          </div>
                        )}
                        {dev.status === 'Installed' && (
                          <div className="text-slate-900 font-medium font-mono">
                            {dev.installedWorkOrderNumber}
                            <div className="text-[11px] text-slate-500 font-sans font-normal">
                              {dev.assignedTechnicianName}
                            </div>
                          </div>
                        )}
                        {dev.status === 'Investigation' && (
                          <div className="text-red-700 font-medium">
                            Overdue ({dev.assignedTechnicianName})
                            <div className="text-[11px] text-red-600 font-normal">
                              Issued {dev.dateIssued}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 align-top text-right whitespace-nowrap">
                        <span className="text-xs font-medium text-blue-700 hover:underline">
                          Inspect
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Selected Device Digital Identity & Movement History Drawer */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-4 self-start">
          {selectedDevice ? (
            <>
              <div className="pb-3 border-b border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>ASSET DIGITAL DOSSIER</span>
                  <span>{selectedDevice.batchNumber}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold font-mono text-slate-900">
                    Meter #{selectedDevice.serialNumber}
                  </h2>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      selectedDevice.status === 'Installed'
                        ? 'text-emerald-700'
                        : selectedDevice.status === 'Allocated'
                        ? 'text-blue-700'
                        : selectedDevice.status === 'Investigation'
                        ? 'text-red-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {selectedDevice.manufacturer} · {selectedDevice.model} ·{' '}
                  {selectedDevice.deviceType}
                </p>
              </div>

              {/* Key Custody Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] text-slate-500">Intake Date</div>
                  <div className="font-mono font-medium text-slate-900 mt-0.5">
                    {selectedDevice.dateReceived}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Seal Number</div>
                  <div className="font-mono font-medium text-slate-900 mt-0.5">
                    {selectedDevice.sealNumber || 'SL-90400'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">
                    Custody Holder
                  </div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {selectedDevice.assignedTechnicianName ||
                      'Central Municipal Cage'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">
                    Issued / Installed
                  </div>
                  <div className="font-mono font-medium text-slate-900 mt-0.5">
                    {selectedDevice.installedDate ||
                      selectedDevice.dateIssued ||
                      'In Depot Store'}
                  </div>
                </div>
              </div>

              {/* Quick Custody Actions based on current state */}
              {selectedDevice.status === 'Available' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="text-xs font-semibold text-slate-900">
                    Issue Meter #{selectedDevice.serialNumber} to Vehicle
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      id="quick-allocate-tech"
                      defaultValue="TECH-01"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
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
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                    >
                      Issue Asset
                    </button>
                  </div>
                </div>
              )}

              {selectedDevice.status === 'Allocated' && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded space-y-2">
                  <div className="text-xs font-semibold text-blue-900">
                    Active Vehicle Custody ·{' '}
                    {selectedDevice.assignedTechnicianName}
                  </div>
                  <p className="text-xs text-slate-600">
                    Issued on {selectedDevice.dateIssued}. Authorised for field
                    installation by {selectedDevice.assignedTechnicianName}.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('field-capture', selectedDevice.serialNumber)
                      }
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Execute in Field App</span>
                      <ArrowRight className="w-3 h-3" />
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
                      className="text-xs text-slate-700 underline hover:text-slate-900 cursor-pointer"
                    >
                      Return to Store
                    </button>
                  </div>
                </div>
              )}

              {selectedDevice.status === 'Investigation' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded space-y-2">
                  <div className="text-xs font-semibold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                    <span>Custody Audit Exception</span>
                  </div>
                  <p className="text-xs text-red-800">
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
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded hover:bg-red-800 cursor-pointer"
                    >
                      Record Recovery & Return to Store
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Movement History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chain-of-Custody Audit Log</span>
                </div>

                <div className="space-y-3 border-l-2 border-slate-200 ml-1.5 pl-3.5">
                  {selectedDevice.custodyHistory.map((evt, index) => (
                    <div key={evt.id} className="space-y-0.5">
                      <div className="text-[11px] font-mono text-slate-500">
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
