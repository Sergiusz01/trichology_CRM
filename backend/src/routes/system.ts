import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import os from 'os';
import { execSync } from 'child_process';

const router = Router();

/** Odczytuje zajętość dysku (/ lub CWD) przez `df -Pk`. */
const getDiskInfo = (): { total: number; used: number; available: number } | null => {
  try {
    const output = execSync('df -Pk / 2>/dev/null || df -Pk .', { timeout: 3000 })
      .toString()
      .trim()
      .split('\n');
    // Linia 0: nagłówek, linia 1 (lub ostatnia): dane
    const parts = output[output.length - 1].split(/\s+/);
    // Kolumny POSIX df: Filesystem  1024-blocks  Used  Available  Capacity%  Mounted
    const total     = parseInt(parts[1], 10) * 1024;
    const used      = parseInt(parts[2], 10) * 1024;
    const available = parseInt(parts[3], 10) * 1024;
    if (isNaN(total) || isNaN(used)) return null;
    return { total, used, available };
  } catch {
    return null;
  }
};

/** GET /api/system/status — zwraca parametry serwera (pamięć, dysk, uptime itp.) */
router.get('/status', authenticate, (_req, res) => {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    os: {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
      cpus: os.cpus().length,
    },
    disk: getDiskInfo(),
  });
});

export default router;
