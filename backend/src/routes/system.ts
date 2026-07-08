import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import os from 'os';
import fs from 'fs';

const router = Router();

/**
 * [SEC-3] Disk info using Node.js native fs.statfsSync (Node 18.15+).
 * No shell commands executed — eliminates command injection risk.
 */
const getDiskInfo = (): { total: number; used: number; available: number } | null => {
  try {
    if (typeof fs.statfsSync !== 'function') return null; // Node < 18.15
    const stats = fs.statfsSync('/');
    const total = stats.blocks * stats.bsize;
    const available = stats.bavail * stats.bsize;
    const used = total - (stats.bfree * stats.bsize);
    return { total, used, available };
  } catch {
    return null;
  }
};

/** GET /api/system/status — zwraca parametry serwera (pamięć, dysk, uptime itp.) — ADMIN only */
router.get('/status', authenticate, requireRole('ADMIN'), (_req, res) => {
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

