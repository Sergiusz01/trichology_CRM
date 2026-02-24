import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import os from 'os';

const router = Router();

/** GET /api/system/status — zwraca parametry serwera (pamięć, uptime itp.) */
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
  });
});

export default router;
