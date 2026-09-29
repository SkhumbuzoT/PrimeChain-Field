import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.pilot-sync-state.json');

interface SharedPilotState {
  version: number;
  updatedAt: string;
  devices: unknown[] | null;
  workOrders: unknown[] | null;
  technicians: unknown[] | null;
  jobCards: unknown[] | null;
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

  app.use(express.json({ limit: '15mb' }));

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

  // Helper to ensure real captured camera photos (data:image/...) on the server are never overwritten by generic placeholder URLs
  function mergeJobCardsPreservingPhotos(
    incoming: Record<string, any>[],
    existing: unknown[] | null
  ): Record<string, any>[] {
    if (!Array.isArray(existing) || existing.length === 0) return incoming;
    const byId = new Map<string, Record<string, any>>();
    const byWo = new Map<string, Record<string, any>>();
    for (const item of existing as Record<string, any>[]) {
      if (item && typeof item.jobCardId === 'string') {
        byId.set(item.jobCardId, item);
      }
      if (item && typeof item.workOrderNumber === 'string') {
        byWo.set(item.workOrderNumber, item);
      }
    }

    return incoming.map((jc) => {
      if (!jc || typeof jc !== 'object') return jc;
      const prev =
        byId.get(jc.jobCardId) || byWo.get(jc.workOrderNumber);
      if (!prev || !prev.photos) return jc;

      const incomingOld = jc.photos?.oldMeterUrl || '';
      const incomingNew = jc.photos?.newMeterUrl || '';
      const incomingSite = jc.photos?.installationSiteUrl || '';

      const prevOld = prev.photos?.oldMeterUrl || '';
      const prevNew = prev.photos?.newMeterUrl || '';
      const prevSite = prev.photos?.installationSiteUrl || '';

      const oldMeterUrl = incomingOld.startsWith('data:image')
        ? incomingOld
        : prevOld.startsWith('data:image')
        ? prevOld
        : incomingOld || prevOld;

      const newMeterUrl = incomingNew.startsWith('data:image')
        ? incomingNew
        : prevNew.startsWith('data:image')
        ? prevNew
        : incomingNew || prevNew;

      const installationSiteUrl = incomingSite.startsWith('data:image')
        ? incomingSite
        : prevSite.startsWith('data:image')
        ? prevSite
        : newMeterUrl.startsWith('data:image')
        ? newMeterUrl
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
  }

  // Update shared operational state from either Desktop or Phone
  app.post('/api/sync', (req, res) => {
    const { devices, workOrders, technicians, jobCards, reset } = req.body || {};

    if (reset) {
      sharedState = {
        version: sharedState.version + 1,
        updatedAt: new Date().toISOString(),
        devices: Array.isArray(devices) ? devices : sharedState.devices,
        workOrders: Array.isArray(workOrders) ? workOrders : sharedState.workOrders,
        technicians: Array.isArray(technicians) ? technicians : sharedState.technicians,
        jobCards: Array.isArray(jobCards) ? jobCards : sharedState.jobCards,
      };
      saveState(sharedState);
      broadcastStateUpdate();
      res.json(sharedState);
      return;
    }

    let changed = false;
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
      sharedState.jobCards = mergeJobCardsPreservingPhotos(
        jobCards,
        sharedState.jobCards
      );
      changed = true;
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
