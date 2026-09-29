import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  CheckCircle2,
  Send,
  Search,
  FileText,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  Camera,
} from 'lucide-react';
import { JobCardRecord } from '../types';

interface JobCardsViewProps {
  jobCards: JobCardRecord[];
  capturedPhotos?: {
    oldMeterUrl?: string;
    newMeterUrl?: string;
  };
  selectedJobCardId?: string;
  onSelectJobCard: (jobCardId: string) => void;
  onSubmitToMunicipality: (jobCardId: string) => void;
  onBatchSubmitAll: () => number;
  onUpdateJobCardPhoto?: (
    jobCardId: string,
    which: 'old' | 'new',
    dataUrl: string
  ) => void;
}

/**
 * Formats any date string into DD/MM/YYYY to match the Python script:
 * date_val.strftime("%d/%m/%Y")
 */
function formatToCityPowerDate(rawDate: string): string {
  if (!rawDate) return '01/03/2026';
  const clean = rawDate.split('·')[0].trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return clean;
}

export const JobCardsView: React.FC<JobCardsViewProps> = ({
  jobCards,
  capturedPhotos,
  selectedJobCardId,
  onSelectJobCard,
  onSubmitToMunicipality,
  onBatchSubmitAll,
  onUpdateJobCardPhoto,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'All' | 'Ready for Review' | 'Submitted to Municipality'
  >('All');
  const [notice, setNotice] = useState<string | null>(null);

  // Page preview mode: 'all' (Sheet + Merged Photo Pages), 'sheet' (Page 1 only), 'photos' (Pages 2-3)
  const [pageView, setPageView] = useState<'all' | 'sheet' | 'photos'>('all');
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);

  const page2CameraInputRef = useRef<HTMLInputElement | null>(null);
  const page3CameraInputRef = useRef<HTMLInputElement | null>(null);

  const compressDirectPhoto = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!rawDataUrl) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 720;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.68));
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });

  const handleDirectPagePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    which: 'old' | 'new'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeCard || !onUpdateJobCardPhoto) return;
    const compressed = await compressDirectPhoto(file);
    if (compressed) {
      onUpdateJobCardPhoto(activeCard.jobCardId, which, compressed);
      setNotice(
        `Updated ${
          which === 'old' ? 'Page 2 (Old Meter Photo)' : 'Page 3 (New Meter Photo)'
        } on ${activeCard.jobCardId} and saved to database.`
      );
    }
    e.target.value = '';
  };

  // Contractor configuration defaults from the Python CONFIG dictionary
  const [companyName, setCompanyName] = useState('LIGHTUP ENTERPRISE');
  const [companyPhone, setCompanyPhone] = useState('0798561362');
  const [sdcNameOverride, setSdcNameOverride] = useState('RANDBURG');
  const [installerOverride, setInstallerOverride] = useState('');
  const [otherExplainMode, setOtherExplainMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

  // Prefer the selected card; if none or default sample is selected while a card with real camera photos exists, prioritize real photos
  const cardWithRealPhotos = jobCards.find(
    (j) =>
      j.photos?.oldMeterUrl?.startsWith('data:') ||
      j.photos?.newMeterUrl?.startsWith('data:')
  );
  const cardWithRealOld = jobCards.find((j) =>
    j.photos?.oldMeterUrl?.startsWith('data:')
  );
  const cardWithRealNew = jobCards.find((j) =>
    j.photos?.newMeterUrl?.startsWith('data:')
  );
  const activeCard =
    jobCards.find((j) => j.jobCardId === selectedJobCardId) ||
    cardWithRealPhotos ||
    jobCards[0];

  // Resolve real captured photos for Page 2 (Old Meter) and Page 3 (New Meter) so generic stock images are never shown once the user has captured photos
  const resolvedOldPhotoUrl = activeCard
    ? activeCard.photos?.oldMeterUrl?.startsWith('data:')
      ? activeCard.photos.oldMeterUrl
      : capturedPhotos?.oldMeterUrl?.startsWith('data:')
      ? capturedPhotos.oldMeterUrl
      : cardWithRealOld?.photos.oldMeterUrl?.startsWith('data:')
      ? cardWithRealOld.photos.oldMeterUrl
      : activeCard.photos.oldMeterUrl
    : '';

  const resolvedNewPhotoUrl = activeCard
    ? activeCard.photos?.newMeterUrl?.startsWith('data:')
      ? activeCard.photos.newMeterUrl
      : capturedPhotos?.newMeterUrl?.startsWith('data:')
      ? capturedPhotos.newMeterUrl
      : cardWithRealNew?.photos.newMeterUrl?.startsWith('data:')
      ? cardWithRealNew.photos.newMeterUrl
      : activeCard.photos.newMeterUrl
    : '';

  useEffect(() => {
    if (selectedJobCardId) {
      setNotice(null);
    }
  }, [selectedJobCardId]);

  const filteredCards = jobCards.filter((jc) => {
    const matchesStatus =
      filterStatus === 'All' || jc.reviewStatus === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      jc.jobCardId.toLowerCase().includes(q) ||
      jc.workOrderNumber.toLowerCase().includes(q) ||
      jc.accountNumber.toLowerCase().includes(q) ||
      jc.newDeviceSerial.toLowerCase().includes(q) ||
      jc.oldDeviceSerial.toLowerCase().includes(q) ||
      jc.customerName.toLowerCase().includes(q) ||
      jc.address.toLowerCase().includes(q) ||
      jc.technicianName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const readyCount = jobCards.filter(
    (j) => j.reviewStatus === 'Ready for Review'
  ).length;

  const handlePrintPdf = () => {
    window.print();
  };

  // Derive mapped fields for the active card (matching JobCardFiller.prepare_data in Python)
  const mappedAccount = activeCard
    ? activeCard.accountNumber.replace(/^ACC-|^MPT-/, '')
    : '';
  const mappedCustomerName = activeCard
    ? activeCard.jobCardId === 'JC-401930557'
      ? ''
      : activeCard.customerName.toUpperCase()
    : '';
  const mappedAddress = activeCard ? activeCard.address.toUpperCase() : '';
  const mappedSuburb = activeCard ? activeCard.suburb.toUpperCase() : '';
  const mappedSdc = sdcNameOverride || 'RANDBURG';
  const mappedOldMeter = activeCard ? activeCard.oldDeviceSerial : '';
  const mappedOldReading =
    activeCard && activeCard.oldMeterReading > 0
      ? String(activeCard.oldMeterReading)
      : '';
  const mappedNewMeter = activeCard ? activeCard.newDeviceSerial : '';
  const mappedInstallReading =
    activeCard && activeCard.newMeterReading > 0
      ? `${activeCard.newMeterReading.toFixed(1)} kWh`
      : '0.0 kWh';

  // Split comments into line 1 (Status/Comment) and line 2 (Comment2: Removed meter make)
  const commentLine1 = activeCard
    ? activeCard.jobCardId === 'JC-401930557'
      ? 'New 1ph postpaid smart meter installed. Old meter removed. Please update.'
      : `New 1ph ${otherExplainMode.toLowerCase()} smart meter installed. Old meter removed. Please update.`
    : '';
  const commentLine2 = activeCard
    ? activeCard.jobCardId === 'JC-401930557'
      ? 'Removed Itron meter.'
      : `Removed ${activeCard.oldDeviceMake}.`
    : '';

  const mappedInstaller = installerOverride.trim()
    ? installerOverride.trim().toUpperCase()
    : activeCard
    ? activeCard.technicianName.toUpperCase()
    : 'BRUCE MHLANGA';

  const mappedDate = activeCard
    ? formatToCityPowerDate(activeCard.installationDate)
    : '01/03/2026';

  return (
    <div className="space-y-6 saas-page-transition">
      {/* Hidden file inputs so user can capture/replace Photo 1 or Photo 2 from anywhere on the Job Cards screen */}
      <input
        ref={page2CameraInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleDirectPagePhotoChange(e, 'old')}
        className="hidden"
      />
      <input
        ref={page3CameraInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleDirectPagePhotoChange(e, 'new')}
        className="hidden"
      />

      {/* Enterprise SaaS Action Header (hidden when printing) */}
      <section className="border border-slate-200/80 bg-white rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Intelligence &amp; Reports</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">
                Contractor: {companyName} ({companyPhone})
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Reports &amp; Commissioning Sheets
            </h1>
            <p className="text-sm text-slate-500">
              Review official City Power commissioning sheets, photographic
              evidence, and municipal submissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowTemplateSettings(!showTemplateSettings)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Contractor Settings</span>
            </button>

            {readyCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const count = onBatchSubmitAll();
                  setNotice(
                    `Submitted ${count} City Power Meter Commissioning Sheet(s) to the Municipal Portal.`
                  );
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit All Ready ({readyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                Export FINAL_JOB_CARD_{mappedAccount || 'PDF'}.pdf
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Contractor Template Settings (matching Python CONFIG) */}
        {showTemplateSettings && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl">
            <div>
              <label className="block font-medium text-xs text-slate-600 mb-1.5">
                Company Name (D. Installer)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-xs text-slate-600 mb-1.5">
                Company Phone
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-xs text-slate-600 mb-1.5">
                Default SDC Name
              </label>
              <input
                type="text"
                value={sdcNameOverride}
                onChange={(e) => setSdcNameOverride(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-xs text-slate-600 mb-1.5">
                Installer Override (Optional)
              </label>
              <input
                type="text"
                placeholder="Uses field tech or BRUCE MHLANGA"
                value={installerOverride}
                onChange={(e) => setInstallerOverride(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-xs text-slate-600 mb-1.5">
                Other (Explain) Type
              </label>
              <select
                value={otherExplainMode}
                onChange={(e) =>
                  setOtherExplainMode(e.target.value as 'POSTPAID' | 'PREPAID')
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
              >
                <option value="POSTPAID">POSTPAID</option>
                <option value="PREPAID">PREPAID</option>
              </select>
            </div>
          </div>
        )}

        {notice && (
          <div className="mt-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
        )}
      </section>

      {/* Master-Detail Split: Left Queue (4 cols, hidden on print) + Right Official City Power Document (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue */}
        <section className="lg:col-span-4 border border-slate-200/80 bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col self-start overflow-hidden no-print">
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/40">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                ['All', 'Ready for Review', 'Submitted to Municipality'] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'All'
                    ? `All (${jobCards.length})`
                    : st === 'Ready for Review'
                    ? `Ready (${readyCount})`
                    : 'Submitted'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter account, address, serial..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredCards.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="text-sm font-semibold text-slate-900">
                  No reports to display
                </div>
                <p className="text-xs text-slate-500">
                  No commissioning sheets match your current filter.
                </p>
              </div>
            ) : (
              filteredCards.map((jc) => {
                const isSelected = activeCard?.jobCardId === jc.jobCardId;
                const cleanAcc = jc.accountNumber.replace(/^ACC-|^MPT-/, '');
                const hasRealCameraPhoto =
                  Boolean(jc.photos?.oldMeterUrl?.startsWith('data:')) ||
                  Boolean(jc.photos?.newMeterUrl?.startsWith('data:'));
                return (
                  <button
                    key={jc.jobCardId}
                    type="button"
                    onClick={() => onSelectJobCard(jc.jobCardId)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer space-y-1.5 ${
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-900">
                        {jc.jobCardId} · {jc.workOrderNumber}
                      </span>
                      <span
                        className={
                          jc.reviewStatus === 'Submitted to Municipality'
                            ? 'text-emerald-700 font-semibold text-xs'
                            : 'text-blue-600 font-semibold text-xs'
                        }
                      >
                        {jc.reviewStatus === 'Submitted to Municipality'
                          ? 'SUBMITTED'
                          : 'READY'}
                      </span>
                    </div>

                    {hasRealCameraPhoto && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px] font-semibold">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Live Captured Camera Photos Attached</span>
                      </div>
                    )}

                    <div className="text-sm font-medium text-slate-900">
                      {jc.address}, {jc.suburb}
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      Acc: {cleanAcc} · Old #{jc.oldDeviceSerial} → New #
                      {jc.newDeviceSerial}
                    </div>

                    <div className="text-xs text-slate-400">
                      Installer: {jc.technicianName} ·{' '}
                      {formatToCityPowerDate(jc.installationDate)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Official City Power Johannesburg Template + Merged Photo Pages */}
        <div className="lg:col-span-8 space-y-5">
          {/* Objective 5 — SaaS Record Summary Header + Page Switcher Bar (hidden on print) */}
          {activeCard && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    COMMISSIONING RECORD · {activeCard.workOrderNumber}
                  </div>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <h2 className="text-xl font-semibold font-mono text-slate-900">
                      {activeCard.jobCardId}
                    </h2>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        activeCard.reviewStatus === 'Submitted to Municipality'
                          ? 'text-emerald-700'
                          : 'text-blue-600'
                      }`}
                    >
                      {activeCard.reviewStatus === 'Submitted to Municipality'
                        ? 'SUBMITTED TO CITY POWER'
                        : 'READY FOR REVIEW'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onUpdateJobCardPhoto && (
                    <>
                      <button
                        type="button"
                        onClick={() => page2CameraInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {resolvedOldPhotoUrl.startsWith('data:')
                            ? '✓ Photo 1 (Retake)'
                            : 'Attach Photo 1 (Page 2)'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => page3CameraInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {resolvedNewPhotoUrl.startsWith('data:')
                            ? '✓ Photo 2 (Retake)'
                            : 'Attach Photo 2 (Page 3)'}
                        </span>
                      </button>
                    </>
                  )}

                  {activeCard.reviewStatus !== 'Submitted to Municipality' && (
                    <button
                      type="button"
                      onClick={() => {
                        onSubmitToMunicipality(activeCard.jobCardId);
                        setNotice(
                          `FINAL_JOB_CARD_${mappedAccount}.pdf approved and submitted to City Power.`
                        );
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Submit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Overview Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">Customer &amp; Account</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {activeCard.customerName}
                  </div>
                  <div className="font-mono text-slate-500">
                    {activeCard.accountNumber}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Service Address</div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {activeCard.address}, {activeCard.suburb}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Technician</div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {activeCard.technicianName}
                  </div>
                  <div className="font-mono text-slate-500">
                    {activeCard.employeeCode}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Meter Swap</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    #{activeCard.oldDeviceSerial} → #
                    {activeCard.newDeviceSerial}
                  </div>
                  <div className="font-mono text-slate-500">
                    Seal {activeCard.sealNumber}
                  </div>
                </div>
              </div>

              {/* Document View Switcher */}
              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPageView('all')}
                    className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      pageView === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Full Merged PDF (3 Pages)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageView('sheet')}
                    className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      pageView === 'sheet'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Page 1: Commissioning Sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageView('photos')}
                    className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      pageView === 'photos'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pages 2–3: Evidence Photos</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCard ? (
            <div className="space-y-8">
              {/* =============================================================
                  PAGE 1: OFFICIAL CITY POWER METER COMMISSIONING SHEET
                 ============================================================= */}
              {(pageView === 'all' || pageView === 'sheet') && (
                <section className="bg-white border border-slate-300 shadow-sm p-6 sm:p-10 text-black max-w-[820px] mx-auto">
                  {/* Top Official Letterhead: Joburg Box + City Power Emblem + Address Block */}
                  <div className="grid grid-cols-12 items-start gap-3 pb-5">
                    {/* Left: Joburg "a world class African city" Box */}
                    <div className="col-span-3 flex flex-col items-start">
                      <div className="border border-black px-3 py-3.5 w-full max-w-[135px] flex items-center justify-center">
                        <div className="text-2xl font-bold tracking-tight text-black leading-none select-none flex items-baseline">
                          <span>Jo</span>
                          <span className="relative inline-block">
                            <span className="text-amber-500 text-xs absolute -top-2.5 left-1">
                              ▲
                            </span>
                            !
                          </span>
                          <span>burg</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-black mt-1 tracking-tight">
                        a world class African city
                      </div>
                    </div>

                    {/* Center: City Power Johannesburg Butterfly-Bulb Logo */}
                    <div className="col-span-4 flex flex-col items-center justify-center pt-1">
                      <div className="flex items-center gap-1.5">
                        <svg
                          viewBox="0 0 64 64"
                          className="w-12 h-12 shrink-0"
                          aria-hidden="true"
                        >
                          {/* Yellow Wing */}
                          <ellipse
                            cx="22"
                            cy="36"
                            rx="14"
                            ry="9"
                            transform="rotate(-28 22 36)"
                            fill="#FACC15"
                            stroke="#1E3A8A"
                            strokeWidth="2.5"
                          />
                          {/* Butterfly Loops */}
                          <path
                            d="M28 24 C18 8, 40 6, 34 24 C44 10, 56 24, 36 30"
                            fill="none"
                            stroke="#1E3A8A"
                            strokeWidth="2.5"
                          />
                          {/* Bulb filament lines */}
                          <line
                            x1="14"
                            y1="42"
                            x2="24"
                            y2="48"
                            stroke="#1E3A8A"
                            strokeWidth="2"
                          />
                          <line
                            x1="12"
                            y1="46"
                            x2="21"
                            y2="51"
                            stroke="#1E3A8A"
                            strokeWidth="2"
                          />
                        </svg>
                        <div>
                          <div className="text-xl font-bold italic text-[#1E3A8A] leading-none">
                            City Power
                          </div>
                          <div className="text-[9px] tracking-[0.26em] text-neutral-600 uppercase mt-1">
                            Johannesburg
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: City Power Johannesburg Address & Contact */}
                    <div className="col-span-5 text-[10px] text-neutral-700 space-y-1.5">
                      <div className="font-semibold text-neutral-800 border-b border-neutral-400 pb-1">
                        City Power Johannesburg
                      </div>
                      <div className="grid grid-cols-3 gap-2 leading-tight pt-0.5">
                        <div>
                          <div>40 Heronmere Road</div>
                          <div>Reuven</div>
                          <div>Johannesburg</div>
                        </div>
                        <div>
                          <div>Box 38766</div>
                          <div>Booysens</div>
                          <div>2016</div>
                        </div>
                        <div>
                          <div>Tel +27(0) 11 490 7000</div>
                          <div>Fax +27(0) 11 490 7590</div>
                        </div>
                      </div>
                      <div className="text-right font-medium text-neutral-800 pt-0.5">
                        www.citypower.co.za
                      </div>
                    </div>
                  </div>

                  {/* Title Banner: METER COMMISIONING SHEET *Ref No: */}
                  <div className="border border-black py-1 px-4 mb-4 flex items-center justify-center relative font-serif">
                    <span className="font-bold text-sm tracking-wide underline uppercase">
                      METER COMMISIONING SHEET
                    </span>
                    <span className="font-bold text-sm ml-8">
                      *Ref No:{' '}
                      <span className="font-sans font-normal text-xs">
                        {activeCard.workOrderNumber}
                      </span>
                    </span>
                  </div>

                  {/* =========================================================
                      A. Customer Details
                     ========================================================= */}
                  <div className="mb-4">
                    <h3 className="font-serif font-bold text-sm mb-1 pl-6">
                      A. Customer Details
                    </h3>
                    <table className="w-full border-collapse border border-black text-xs">
                      <tbody>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-serif font-bold w-[22%]">
                            *Customer name:
                          </td>
                          <td
                            colSpan={3}
                            className="px-2 font-sans text-[13px] tracking-wide"
                          >
                            {mappedCustomerName}
                          </td>
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-serif font-bold">
                            *Account number:
                          </td>
                          <td className="border-r border-black px-2 font-sans text-[13px] w-[36%]">
                            {mappedAccount}
                          </td>
                          <td className="px-2 font-serif font-bold w-[16%]">
                            ID Number
                          </td>
                          <td className="px-2 font-sans text-[13px] w-[26%]" />
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-serif font-bold">
                            *Address
                          </td>
                          <td
                            colSpan={3}
                            className="px-2 font-sans text-[13px] tracking-wide"
                          >
                            {mappedAddress}
                          </td>
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-serif font-bold">
                            *Complex name
                          </td>
                          <td colSpan={3} className="px-2 font-sans text-[13px]" />
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-serif font-bold">
                            *Suburb
                          </td>
                          <td
                            colSpan={3}
                            className="px-2 font-sans text-[13px] tracking-wide"
                          >
                            {mappedSuburb}
                          </td>
                        </tr>
                        <tr className="h-6">
                          <td className="border-r border-black px-2 font-serif font-bold">
                            SDC Name
                          </td>
                          <td
                            colSpan={3}
                            className="px-2 font-sans text-[13px] tracking-wide"
                          >
                            {mappedSdc}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* =========================================================
                      B. Old Meter Details
                     ========================================================= */}
                  <div className="mb-4">
                    <h3 className="font-serif font-bold text-sm mb-1 pl-6">
                      B. Old Meter Details
                    </h3>
                    <table className="w-[72%] border-collapse border border-black text-xs">
                      <thead>
                        <tr className="border-b border-black h-6 text-left font-serif font-bold">
                          <th className="border-r border-black px-2 w-[42%]">
                            *Old Meter Number
                          </th>
                          <th className="border-r border-black px-2 w-[36%]">
                            Meter Reading
                          </th>
                          <th className="px-2 w-[22%]">*Meter Factor</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2 font-sans text-[13px] text-center">
                            {mappedOldMeter}
                          </td>
                          <td className="border-r border-black px-2 font-sans text-[13px] text-center">
                            {mappedOldReading}
                          </td>
                          <td className="px-2 font-sans text-[13px] text-center" />
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="border-r border-black px-2" />
                          <td className="border-r border-black px-2" />
                          <td className="px-2" />
                        </tr>
                        <tr className="h-6">
                          <td className="border-r border-black px-2" />
                          <td className="border-r border-black px-2" />
                          <td className="px-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* =========================================================
                      C. New Meter Details
                     ========================================================= */}
                  <div className="mb-4">
                    <h3 className="font-serif font-bold text-sm mb-1 pl-6">
                      C. New Meter Details
                    </h3>
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Left Table: *New Meter Type (tick) */}
                      <div className="col-span-4">
                        <table className="w-full border-collapse border border-black text-[11px]">
                          <thead>
                            <tr className="border-b border-black h-6 text-left font-serif font-bold">
                              <th colSpan={2} className="px-2">
                                *New Meter Type (tick)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-black h-6">
                              <td className="border-r border-black px-2 font-serif w-[78%] relative">
                                <span className="relative inline-block">
                                  Single
                                  <span className="absolute inset-0 flex items-center justify-center text-sm font-sans font-bold text-black">
                                    ✕
                                  </span>
                                </span>
                                /Three Phase
                              </td>
                              <td className="px-2 text-center font-bold">✓</td>
                            </tr>
                            <tr className="border-b border-black h-6">
                              <td className="border-r border-black px-2 font-serif">
                                AMR/Electronic
                              </td>
                              <td className="px-2 text-center" />
                            </tr>
                            <tr className="border-b border-black h-6">
                              <td className="border-r border-black px-2 font-serif">
                                Prepaid
                              </td>
                              <td className="px-2 text-center" />
                            </tr>
                            <tr className="h-9 align-top">
                              <td className="border-r border-black px-2 py-1 font-serif">
                                <div>Other (explain)</div>
                                <div className="font-sans text-xs font-normal text-right pr-1">
                                  {otherExplainMode}
                                </div>
                              </td>
                              <td className="px-2" />
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Right Table: *New Meter Number, *Register, *Installation Reading, Current Reading & Date, *No. of Digits */}
                      <div className="col-span-8">
                        <table className="w-full border-collapse border border-black text-[11px]">
                          <thead>
                            <tr className="border-b border-black text-left font-serif font-bold align-top">
                              <th className="border-r border-black px-2 py-1 w-[32%]">
                                *New Meter Number
                              </th>
                              <th className="border-r border-black px-1.5 py-1 w-[10%] text-center leading-tight">
                                *Regis
                                <br />
                                er
                              </th>
                              <th className="border-r border-black px-2 py-1 w-[20%] leading-tight">
                                *Installation
                                <br />
                                Reading
                              </th>
                              <th
                                colSpan={2}
                                className="border-r border-black px-2 py-1 w-[24%] leading-tight"
                              >
                                Current Reading &<br />
                                Date
                              </th>
                              <th className="px-1.5 py-1 w-[14%] leading-tight">
                                *No. of
                                <br />
                                Digits
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-black h-6">
                              <td className="border-r border-black px-2 font-sans text-[13px] text-center">
                                {mappedNewMeter}
                              </td>
                              <td className="border-r border-black px-1 text-center font-sans" />
                              <td className="border-r border-black px-2 font-sans text-[13px] text-center">
                                {mappedInstallReading}
                              </td>
                              <td className="border-r border-black px-1 w-[9%]" />
                              <td className="border-r border-black px-1 w-[15%]" />
                              <td className="px-1 text-center font-sans" />
                            </tr>
                            <tr className="border-b border-black h-6">
                              <td className="border-r border-black px-2" />
                              <td className="border-r border-black px-1" />
                              <td className="border-r border-black px-2" />
                              <td className="border-r border-black px-1" />
                              <td className="border-r border-black px-1" />
                              <td className="px-1" />
                            </tr>
                            <tr className="h-6">
                              <td className="border-r border-black px-2" />
                              <td className="border-r border-black px-1" />
                              <td className="border-r border-black px-2" />
                              <td className="border-r border-black px-1" />
                              <td className="border-r border-black px-1" />
                              <td className="px-1" />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Comment Box */}
                  <div className="border border-black px-2.5 py-1.5 mb-4 text-xs min-h-[44px]">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold shrink-0">
                        Comment:
                      </span>
                      <span className="font-sans text-[13px]">
                        {commentLine1}
                      </span>
                    </div>
                    <div className="pl-[68px] font-sans text-[13px] mt-0.5">
                      {commentLine2}
                    </div>
                  </div>

                  {/* =========================================================
                      D. Installer
                     ========================================================= */}
                  <div className="mb-4">
                    <h3 className="font-serif font-bold text-sm mb-1 pl-6">
                      D. Installer
                    </h3>
                    <table className="w-full border-collapse border border-black text-xs">
                      <tbody>
                        <tr className="border-b border-black h-6">
                          <td className="px-2 font-serif font-bold w-[16%]">
                            Installed by :
                          </td>
                          <td className="border-r border-black px-2 font-sans text-[13px] w-[34%]">
                            {mappedInstaller}
                          </td>
                          <td className="px-2 font-serif font-bold w-[14%]">
                            Signature :
                          </td>
                          <td className="px-2 font-mono text-[11px] italic text-slate-600 w-[36%]">
                            {activeCard.technicianName} (Signed Digitally)
                          </td>
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="px-2 font-serif font-bold">
                            Company &nbsp;&nbsp;&nbsp;&nbsp;:
                          </td>
                          <td className="border-r border-black px-2 font-sans text-[13px]">
                            {companyName}
                          </td>
                          <td className="px-2 font-serif font-bold">
                            Telephone :
                          </td>
                          <td className="px-2 font-sans text-[13px]">
                            {companyPhone}
                          </td>
                        </tr>
                        <tr className="h-6">
                          <td className="px-2 font-serif font-bold">
                            Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
                          </td>
                          <td className="border-r border-black px-2 font-sans text-[13px]">
                            {mappedDate}
                          </td>
                          <td colSpan={2} className="px-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* =========================================================
                      E. Team leader
                     ========================================================= */}
                  <div className="mb-8">
                    <h3 className="font-serif font-bold text-sm mb-1 pl-6">
                      E. Team leader
                    </h3>
                    <table className="w-full border-collapse border border-black text-xs">
                      <tbody>
                        <tr className="border-b border-black h-6">
                          <td className="px-2 font-serif font-bold w-[16%]">
                            Approved by :
                          </td>
                          <td className="border-r border-black px-2 w-[34%]" />
                          <td className="px-2 font-serif font-bold w-[14%]">
                            SAP No &nbsp;&nbsp;:
                          </td>
                          <td className="px-2 w-[36%]" />
                        </tr>
                        <tr className="border-b border-black h-6">
                          <td className="px-2 font-serif font-bold">
                            Designation &nbsp;:
                          </td>
                          <td className="border-r border-black px-2" />
                          <td className="px-2 font-serif font-bold">
                            Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
                          </td>
                          <td className="px-2 font-serif font-bold">
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ 20
                          </td>
                        </tr>
                        <tr className="h-6">
                          <td className="px-2 font-serif font-bold">
                            Department &nbsp;:
                          </td>
                          <td className="border-r border-black px-2" />
                          <td className="px-2 font-serif font-bold">
                            Signature:
                          </td>
                          <td className="px-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Official City Power Footer */}
                  <div className="text-center text-[9px] text-neutral-800 leading-snug pt-4 border-t border-neutral-200">
                    <div>
                      <strong>Non-Executive Directors:</strong> B Ramokhele
                      (Chairperson of the Board), M Kekana, N Kgope, N Ntuli, M
                      Mashabela, S Nduna, P Ragimana,
                    </div>
                    <div>N Ramotebele, L Ratsiku, M Seopela, T Sibeko</div>
                    <div>
                      <strong>Executive Director:</strong> T Mashava (Chief
                      Executive Officer) - <strong>Company Secretary:</strong> M
                      Smith
                    </div>
                    <div className="font-semibold">
                      Registration number: 2000/030051/30 &nbsp;-&nbsp; VAT
                      number: 4710191182
                    </div>
                  </div>
                </section>
              )}

              {/* =============================================================
                  PAGE 2 & PAGE 3: STANDARDIZED A4 METER PHOTO SHEETS
                  Matches PDFMerger.create_image_pdf & merge_pdfs from Python
                 ============================================================= */}
              {(pageView === 'all' || pageView === 'photos') && (
                <>
                  {/* PAGE 2: OLD METER IMAGE (Centered on A4 white sheet) */}
                  <section className="print-page-break bg-white border border-slate-300 shadow-sm p-6 sm:p-10 text-black max-w-[820px] mx-auto flex flex-col justify-between min-h-[680px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 text-xs font-mono text-slate-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          MERGED PHOTO ATTACHMENT — PAGE 2 OF 3 (OldMeterImage)
                        </span>
                        {resolvedOldPhotoUrl.startsWith('data:') ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] no-print">
                            ✓ LIVE CAPTURED PHOTO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] no-print">
                            SAMPLE ARCHIVE PHOTO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {onUpdateJobCardPhoto && (
                          <button
                            type="button"
                            onClick={() => page2CameraInputRef.current?.click()}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium text-[11px] flex items-center gap-1 cursor-pointer no-print"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              {resolvedOldPhotoUrl.startsWith('data:')
                                ? 'Retake / Replace Photo 1'
                                : 'Capture / Upload Photo 1'}
                            </span>
                          </button>
                        )}
                        <span>ACCOUNT: {mappedAccount}</span>
                      </div>
                    </div>

                    <div className="my-auto py-6 flex flex-col items-center justify-center">
                      <img
                        src={resolvedOldPhotoUrl}
                        alt={`Old Meter ${mappedOldMeter}`}
                        referrerPolicy="no-referrer"
                        className="max-h-[480px] w-auto object-contain border border-slate-300 p-2 bg-white"
                      />
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600">
                      <span>
                        OLD METER NUMBER: #{mappedOldMeter} (
                        {activeCard.oldDeviceMake})
                      </span>
                      <span>
                        CLOSING READING: {activeCard.oldMeterReading} kWh ·{' '}
                        {mappedAddress}
                      </span>
                    </div>
                  </section>

                  {/* PAGE 3: NEW METER IMAGE (Centered on A4 white sheet) */}
                  <section className="print-page-break bg-white border border-slate-300 shadow-sm p-6 sm:p-10 text-black max-w-[820px] mx-auto flex flex-col justify-between min-h-[680px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 text-xs font-mono text-slate-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          MERGED PHOTO ATTACHMENT — PAGE 3 OF 3 (NewMeterImage)
                        </span>
                        {resolvedNewPhotoUrl.startsWith('data:') ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] no-print">
                            ✓ LIVE CAPTURED PHOTO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] no-print">
                            SAMPLE ARCHIVE PHOTO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {onUpdateJobCardPhoto && (
                          <button
                            type="button"
                            onClick={() => page3CameraInputRef.current?.click()}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium text-[11px] flex items-center gap-1 cursor-pointer no-print"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              {resolvedNewPhotoUrl.startsWith('data:')
                                ? 'Retake / Replace Photo 2'
                                : 'Capture / Upload Photo 2'}
                            </span>
                          </button>
                        )}
                        <span>ACCOUNT: {mappedAccount}</span>
                      </div>
                    </div>

                    <div className="my-auto py-6 flex flex-col items-center justify-center">
                      <img
                        src={resolvedNewPhotoUrl}
                        alt={`New Meter ${mappedNewMeter}`}
                        referrerPolicy="no-referrer"
                        className="max-h-[480px] w-auto object-contain border border-slate-300 p-2 bg-white"
                      />
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600">
                      <span>
                        NEW METER NUMBER: #{mappedNewMeter} · INSTALLATION
                        READING: {mappedInstallReading}
                      </span>
                      <span>
                        INSTALLED BY: {mappedInstaller} ({companyName}) ·{' '}
                        {mappedDate}
                      </span>
                    </div>
                  </section>
                </>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 border border-slate-200 bg-white">
              Select a job card from the queue on the left to view its City Power
              Meter Commissioning Sheet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
