import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.pilot-sync-state.json');

interface CapturedPhotosState {
  oldMeterUrl?: string;
  newMeterUrl?: string;
}

interface SharedPilotState {
  version: number;
  updatedAt: string;
  devices: unknown[] | null;
  workOrders: unknown[] | null;
  technicians: unknown[] | null;
  jobCards: unknown[] | null;
  capturedPhotos?: CapturedPhotosState;
}

function loadState(): SharedPilotState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.version === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt state file
  }
  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    devices: null,
    workOrders: null,
    technicians: null,
    jobCards: null,
    capturedPhotos: {},
  };
}

function saveState(state: SharedPilotState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // ignore write errors in read-only environments
  }
}

let sharedState: SharedPilotState = loadState();
const sseClients = new Set<express.Response>();

function broadcastStateUpdate() {
  const payload = `data: ${JSON.stringify(sharedState)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Self-cleaning Service Worker endpoint so any previously installed PWA/Workbox SW immediately purges stale cached JS/HTML bundles
  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.send(`
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
`);
  });

  app.get('/registerSW.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.send(`
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
`);
  });

  // Get current shared operational state across Desktop & Phone
  app.get('/api/state', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(sharedState);
  });

  // Real-time Server-Sent Events stream for instant Desktop <-> Phone push
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify(sharedState)}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Helper to ensure real captured camera photos (data:image/...) and newly created Job Cards on the server are never lost or overwritten by generic placeholder URLs
  function mergeJobCardsPreservingPhotos(
    incoming: Record<string, any>[],
    existing: unknown[] | null,
    globalCaptured?: CapturedPhotosState
  ): Record<string, any>[] {
    const existingList = Array.isArray(existing)
      ? (existing as Record<string, any>[])
      : [];

    const byId = new Map<string, Record<string, any>>();
    const byWo = new Map<string, Record<string, any>>();
    let fallbackOld = globalCaptured?.oldMeterUrl || '';
    let fallbackNew = globalCaptured?.newMeterUrl || '';

    for (const item of existingList) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.jobCardId === 'string') {
        byId.set(item.jobCardId, item);
      }
      if (typeof item.workOrderNumber === 'string') {
        byWo.set(item.workOrderNumber, item);
      }
      if (!fallbackOld && typeof item.photos?.oldMeterUrl === 'string' && item.photos.oldMeterUrl.startsWith('data:')) {
        fallbackOld = item.photos.oldMeterUrl;
      }
      if (!fallbackNew && typeof item.photos?.newMeterUrl === 'string' && item.photos.newMeterUrl.startsWith('data:')) {
        fallbackNew = item.photos.newMeterUrl;
      }
    }

    for (const item of incoming) {
      if (!item || typeof item !== 'object') continue;
      if (!fallbackOld && typeof item.photos?.oldMeterUrl === 'string' && item.photos.oldMeterUrl.startsWith('data:')) {
        fallbackOld = item.photos.oldMeterUrl;
      }
      if (!fallbackNew && typeof item.photos?.newMeterUrl === 'string' && item.photos.newMeterUrl.startsWith('data:')) {
        fallbackNew = item.photos.newMeterUrl;
      }
    }

    const seenIds = new Set<string>();
    const seenWos = new Set<string>();

    const mergedIncoming = incoming.map((jc) => {
      if (!jc || typeof jc !== 'object') return jc;
      if (typeof jc.jobCardId === 'string') seenIds.add(jc.jobCardId);
      if (typeof jc.workOrderNumber === 'string') seenWos.add(jc.workOrderNumber);

      const prev = byId.get(jc.jobCardId) || byWo.get(jc.workOrderNumber);

      const incomingOld = jc.photos?.oldMeterUrl || '';
      const incomingNew = jc.photos?.newMeterUrl || '';
      const incomingSite = jc.photos?.installationSiteUrl || '';

      const prevOld = prev?.photos?.oldMeterUrl || '';
      const prevNew = prev?.photos?.newMeterUrl || '';
      const prevSite = prev?.photos?.installationSiteUrl || '';

      const oldMeterUrl = incomingOld.startsWith('data:')
        ? incomingOld
        : prevOld.startsWith('data:')
        ? prevOld
        : fallbackOld.startsWith('data:')
        ? fallbackOld
        : incomingOld || prevOld;

      const newMeterUrl = incomingNew.startsWith('data:')
        ? incomingNew
        : prevNew.startsWith('data:')
        ? prevNew
        : fallbackNew.startsWith('data:')
        ? fallbackNew
        : incomingNew || prevNew;

      const installationSiteUrl = incomingSite.startsWith('data:')
        ? incomingSite
        : prevSite.startsWith('data:')
        ? prevSite
        : newMeterUrl.startsWith('data:')
        ? newMeterUrl
        : oldMeterUrl.startsWith('data:')
        ? oldMeterUrl
        : incomingSite || prevSite;

      return {
        ...jc,
        photos: {
          oldMeterUrl,
          newMeterUrl,
          installationSiteUrl,
        },
      };
    });

    // Preserve any Job Card in existingList that was missing from incoming
    const missingFromIncoming = existingList
      .filter(
        (item) =>
          item &&
          typeof item.jobCardId === 'string' &&
          !seenIds.has(item.jobCardId) &&
          (!item.workOrderNumber || !seenWos.has(item.workOrderNumber))
      )
      .map((item) => {
        const prevOld = item.photos?.oldMeterUrl || '';
        const prevNew = item.photos?.newMeterUrl || '';
        const oldMeterUrl = prevOld.startsWith('data:')
          ? prevOld
          : fallbackOld.startsWith('data:')
          ? fallbackOld
          : prevOld;
        const newMeterUrl = prevNew.startsWith('data:')
          ? prevNew
          : fallbackNew.startsWith('data:')
          ? fallbackNew
          : prevNew;
        return {
          ...item,
          photos: {
            oldMeterUrl,
            newMeterUrl,
            installationSiteUrl: newMeterUrl.startsWith('data:')
              ? newMeterUrl
              : oldMeterUrl.startsWith('data:')
              ? oldMeterUrl
              : item.photos?.installationSiteUrl || '',
          },
        };
      });

    return [...missingFromIncoming, ...mergedIncoming];
  }

  // Update shared operational state from either Desktop or Phone
  app.post('/api/sync', (req, res) => {
    const { devices, workOrders, technicians, jobCards, capturedPhotos, reset } =
      req.body || {};

    if (reset) {
      sharedState = {
        version: sharedState.version + 1,
        updatedAt: new Date().toISOString(),
        devices: Array.isArray(devices) ? devices : sharedState.devices,
        workOrders: Array.isArray(workOrders) ? workOrders : sharedState.workOrders,
        technicians: Array.isArray(technicians) ? technicians : sharedState.technicians,
        jobCards: Array.isArray(jobCards) ? jobCards : sharedState.jobCards,
        capturedPhotos: {},
      };
      saveState(sharedState);
      broadcastStateUpdate();
      res.json(sharedState);
      return;
    }

    let changed = false;
    if (capturedPhotos && typeof capturedPhotos === 'object') {
      sharedState.capturedPhotos = {
        oldMeterUrl:
          typeof capturedPhotos.oldMeterUrl === 'string' &&
          capturedPhotos.oldMeterUrl.startsWith('data:')
            ? capturedPhotos.oldMeterUrl
            : sharedState.capturedPhotos?.oldMeterUrl,
        newMeterUrl:
          typeof capturedPhotos.newMeterUrl === 'string' &&
          capturedPhotos.newMeterUrl.startsWith('data:')
            ? capturedPhotos.newMeterUrl
            : sharedState.capturedPhotos?.newMeterUrl,
      };
      changed = true;
    }
    if (Array.isArray(devices)) {
      sharedState.devices = devices;
      changed = true;
    }
    if (Array.isArray(workOrders)) {
      sharedState.workOrders = workOrders;
      changed = true;
    }
    if (Array.isArray(technicians)) {
      sharedState.technicians = technicians;
      changed = true;
    }
    if (Array.isArray(jobCards)) {
      for (const jc of jobCards) {
        if (typeof jc?.photos?.oldMeterUrl === 'string' && jc.photos.oldMeterUrl.startsWith('data:')) {
          sharedState.capturedPhotos = {
            ...sharedState.capturedPhotos,
            oldMeterUrl: jc.photos.oldMeterUrl,
          };
        }
        if (typeof jc?.photos?.newMeterUrl === 'string' && jc.photos.newMeterUrl.startsWith('data:')) {
          sharedState.capturedPhotos = {
            ...sharedState.capturedPhotos,
            newMeterUrl: jc.photos.newMeterUrl,
          };
        }
      }
      sharedState.jobCards = mergeJobCardsPreservingPhotos(
        jobCards,
        sharedState.jobCards,
        sharedState.capturedPhotos
      );
      changed = true;
    } else if (changed && Array.isArray(sharedState.jobCards)) {
      sharedState.jobCards = mergeJobCardsPreservingPhotos(
        sharedState.jobCards as Record<string, any>[],
        sharedState.jobCards,
        sharedState.capturedPhotos
      );
    }

    if (changed) {
      sharedState.version += 1;
      sharedState.updatedAt = new Date().toISOString();
      saveState(sharedState);
      broadcastStateUpdate();
    }

    res.json(sharedState);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PrimeChain ERP server running on http://localhost:${PORT}`);
  });
}

startServer();
