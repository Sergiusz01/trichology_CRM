"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const router = (0, express_1.Router)();
/** Odczytuje zajętość dysku (/ lub CWD) przez `df -Pk`. */
const getDiskInfo = () => {
    try {
        const output = (0, child_process_1.execSync)('df -Pk / 2>/dev/null || df -Pk .', { timeout: 3000 })
            .toString()
            .trim()
            .split('\n');
        // Linia 0: nagłówek, linia 1 (lub ostatnia): dane
        const parts = output[output.length - 1].split(/\s+/);
        // Kolumny POSIX df: Filesystem  1024-blocks  Used  Available  Capacity%  Mounted
        const total = parseInt(parts[1], 10) * 1024;
        const used = parseInt(parts[2], 10) * 1024;
        const available = parseInt(parts[3], 10) * 1024;
        if (isNaN(total) || isNaN(used))
            return null;
        return { total, used, available };
    }
    catch {
        return null;
    }
};
/** GET /api/system/status — zwraca parametry serwera (pamięć, dysk, uptime itp.) */
router.get('/status', auth_1.authenticate, (_req, res) => {
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
            totalMemory: os_1.default.totalmem(),
            freeMemory: os_1.default.freemem(),
            loadAvg: os_1.default.loadavg(),
            cpus: os_1.default.cpus().length,
        },
        disk: getDiskInfo(),
    });
});
exports.default = router;
//# sourceMappingURL=system.js.map