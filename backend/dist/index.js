"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./routes/auth"));
const patients_1 = __importDefault(require("./routes/patients"));
const consultations_1 = __importDefault(require("./routes/consultations"));
const consultationTemplates_1 = __importDefault(require("./routes/consultationTemplates"));
const labResults_1 = __importDefault(require("./routes/labResults"));
const scalpPhotos_1 = __importDefault(require("./routes/scalpPhotos"));
const carePlans_1 = __importDefault(require("./routes/carePlans"));
const email_1 = __importDefault(require("./routes/email"));
const emailTemplates_1 = __importDefault(require("./routes/emailTemplates"));
const userProfile_1 = __importDefault(require("./routes/userProfile"));
const export_1 = __importDefault(require("./routes/export"));
const visits_1 = __importDefault(require("./routes/visits"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const activity_1 = __importDefault(require("./routes/activity"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_1 = require("./middleware/requestId");
const reminderWorker_1 = require("./services/reminderWorker");
const prisma_1 = require("./prisma");
const rateLimit_1 = require("./middleware/rateLimit");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Trust proxy (required for rate limiting behind Nginx)
app.set('trust proxy', true);
// Middleware
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(requestId_1.requestIdMiddleware);
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Serve static files from uploads directory
const uploadDir = process.env.UPLOAD_DIR || './storage/uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir, {
    setHeaders: (res, filePath) => {
        // Set appropriate content type for images
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        }
        else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        // Cache control for uploaded files
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
}));
// Serve static files from public directory (for logo and other assets)
const publicDir = path_1.default.join(__dirname, '../public');
if (!fs_1.default.existsSync(publicDir)) {
    fs_1.default.mkdirSync(publicDir, { recursive: true });
}
app.use('/public', express_1.default.static(publicDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        }
        else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
}));
// Rate limiting - apply to all API routes
app.use('/api', rateLimit_1.apiLimiter);
// Health check (no rate limit)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
// Auth routes with specific rate limiting
app.use('/api/auth', auth_1.default);
app.use('/api/patients', patients_1.default);
app.use('/api/consultations', consultations_1.default);
app.use('/api/consultation-templates', consultationTemplates_1.default);
app.use('/api/lab-results', labResults_1.default);
app.use('/api/scalp-photos', scalpPhotos_1.default);
app.use('/api/care-plans', carePlans_1.default);
app.use('/api/email', email_1.default);
app.use('/api/email-templates', emailTemplates_1.default);
app.use('/api/user-profile', userProfile_1.default);
app.use('/api/export', export_1.default);
app.use('/api/visits', visits_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/activity', activity_1.default);
// Error handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
// Start reminder worker
(0, reminderWorker_1.startReminderWorker)();
// Initialize default email templates on startup (if no templates exist)
(async () => {
    try {
        // Wait a bit for database connection to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { initializeDefaultTemplates } = await Promise.resolve().then(() => __importStar(require('./utils/initializeDefaultTemplates')));
        // Get first admin user to use as creator
        const admin = await prisma_1.prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });
        if (admin && prisma_1.prisma) {
            await initializeDefaultTemplates(admin.id, prisma_1.prisma);
        }
        else {
            console.log('⚠️ Brak użytkownika admin lub prisma nie jest zainicjalizowane - pomijam inicjalizację szablonów');
        }
    }
    catch (error) {
        console.error('❌ Błąd podczas inicjalizacji domyślnych szablonów:', error);
        // Don't throw - this is not critical for server startup
    }
})();
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map