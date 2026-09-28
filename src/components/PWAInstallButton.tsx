import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Android App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-700" />
        <span>{isIOS ? 'Install on iOS' : 'Install on Android'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-slate-200 space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-blue-700 font-semibold">
                PRIMECHAIN FIELD · ANDROID HOME SCREEN PWA
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Install PrimeChain Field on Technician’s Device
              </h3>
            </div>

            {isIOS ? (
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> button in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            ) : (
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Open the shared Pilot Link in <strong>Chrome on Android</strong>
                  .
                </li>
                <li>
                  Tap the Chrome menu (<strong>⋮</strong> in the top-right
                  corner).
                </li>
                <li>
                  Tap <strong>Add to Home screen</strong> or{' '}
                  <strong>Install app</strong>.
                </li>
                <li>
                  Launch <strong>PrimeChain</strong> from the Android home
                  screen for full-screen standalone field capture.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Field captures cached locally until signal returns</span>
    </div>
  );
};
