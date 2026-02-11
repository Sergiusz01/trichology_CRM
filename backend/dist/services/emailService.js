"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailConnection = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter = null;
const createTransporter = () => {
    if (transporter) {
        return transporter;
    }
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secureValue = process.env.SMTP_SECURE?.toLowerCase();
    // Port 465 = SSL/TLS (secure: true), Port 587 = STARTTLS (secure: false, requireTLS: true)
    // If port is 587, always use STARTTLS regardless of SMTP_SECURE value
    // Handle various formats: "true", "ssl/tls", "ssl", "tls" -> secure
    const isSecureValue = secureValue === 'true' ||
        secureValue === 'ssl/tls' ||
        secureValue === 'ssl' ||
        secureValue === 'tls';
    const isSecure = port === 465 || (isSecureValue && port !== 587);
    const requireTLS = port === 587 || (!isSecure && secureValue !== 'false');
    // Validate required SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Brak konfiguracji SMTP. Sprawdź zmienne środowiskowe: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
    const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    };
    // Add TLS options for STARTTLS (port 587)
    if (requireTLS && !isSecure) {
        smtpConfig.requireTLS = true;
        smtpConfig.tls = {
            rejectUnauthorized: false, // Allow self-signed certificates if needed
        };
    }
    transporter = nodemailer_1.default.createTransport(smtpConfig);
    return transporter;
};
const sendEmail = async (options) => {
    const emailTransporter = createTransporter();
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@trichology-clinic.pl',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
    };
    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Email wysłany do: ${options.to}`);
    }
    catch (error) {
        console.error('❌ Błąd wysyłania email:', error);
        // Provide more detailed error message
        const smtpPort = process.env.SMTP_PORT || '587';
        if (error.code === 'EAUTH') {
            throw new Error('Błąd autoryzacji SMTP. Sprawdź SMTP_USER i SMTP_PASS w .env');
        }
        else if (error.code === 'ECONNECTION') {
            throw new Error(`Nie można połączyć się z serwerem SMTP ${process.env.SMTP_HOST}:${smtpPort}. Sprawdź SMTP_HOST i SMTP_PORT.`);
        }
        else if (error.code === 'ETIMEDOUT') {
            throw new Error('Timeout połączenia z serwerem SMTP. Sprawdź połączenie internetowe i ustawienia firewall.');
        }
        else {
            throw new Error(`Błąd wysyłania email: ${error.message || error}`);
        }
    }
};
exports.sendEmail = sendEmail;
const verifyEmailConnection = async () => {
    try {
        const emailTransporter = createTransporter();
        await emailTransporter.verify();
        return true;
    }
    catch (error) {
        console.error('Błąd weryfikacji połączenia email:', error);
        return false;
    }
};
exports.verifyEmailConnection = verifyEmailConnection;
//# sourceMappingURL=emailService.js.map