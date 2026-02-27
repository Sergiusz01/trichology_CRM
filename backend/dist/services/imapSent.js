"use strict";
/**
 * Minimal IMAP APPEND client — zapisuje kopię wysłanego emaila do folderu
 * "Wysłane" na serwerze IMAP, dzięki czemu wiadomość jest widoczna w każdym
 * kliencie pocztowym (Gmail, Outlook, Thunderbird itp.).
 *
 * Wymaga wyłącznie wbudowanych modułów Node.js (tls, net) — bez zewnętrznych zależności.
 *
 * Konfiguracja przez zmienne środowiskowe:
 *   IMAP_HOST            — host IMAP (domyślnie SMTP_HOST)
 *   IMAP_PORT            — port IMAP (domyślnie 993)
 *   IMAP_SECURE          — "false" wyłącza TLS i przełącza na STARTTLS (domyślnie true)
 *   IMAP_USER            — login IMAP (domyślnie SMTP_USER)
 *   IMAP_PASS            — hasło IMAP (domyślnie SMTP_PASS)
 *   IMAP_SENT_FOLDER     — nazwa folderu Wysłane (jeśli pusta — wykrywana automatycznie)
 *   IMAP_SAVE_SENT       — "false" wyłącza całą funkcję (domyślnie true)
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendToSentFolder = appendToSentFolder;
const tls = __importStar(require("tls"));
const net = __importStar(require("net"));
const IMAP_TIMEOUT_MS = 15000;
// Kolejność prób przy automatycznym wykrywaniu folderu Wysłane
const SENT_FOLDER_CANDIDATES = [
    'Sent',
    'Sent Items',
    'Sent Messages',
    'INBOX.Sent',
    '[Gmail]/Sent Mail',
    'Wysłane',
    'Gesendet',
    'Envoyés',
];
// ---------------------------------------------------------------------------
// Asynchroniczny czytnik linii IMAP
// ---------------------------------------------------------------------------
class ImapLineReader {
    constructor(socket) {
        this.socket = socket;
        this.buf = Buffer.alloc(0);
        this.waiters = [];
        this.lastError = null;
        this.closed = false;
        socket.on('data', (chunk) => {
            this.buf = Buffer.concat([this.buf, chunk]);
            const w = this.waiters.splice(0);
            for (const { resolve } of w)
                resolve();
        });
        socket.on('error', (err) => {
            this.lastError = err;
            const w = this.waiters.splice(0);
            for (const { reject } of w)
                reject(err);
        });
        socket.on('end', () => {
            this.closed = true;
            const w = this.waiters.splice(0);
            for (const { reject } of w)
                reject(new Error('IMAP: połączenie zamknięte przez serwer'));
        });
    }
    waitForData() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.waiters = this.waiters.filter((w) => w.resolve !== resolve);
                reject(new Error('IMAP: timeout oczekiwania na dane'));
            }, IMAP_TIMEOUT_MS);
            this.waiters.push({
                resolve: () => { clearTimeout(timer); resolve(); },
                reject: (e) => { clearTimeout(timer); reject(e); },
            });
        });
    }
    async readLine() {
        while (true) {
            if (this.lastError)
                throw this.lastError;
            const idx = this.buf.indexOf('\n');
            if (idx !== -1) {
                const line = this.buf.slice(0, idx).toString('utf8').replace(/\r$/, '');
                this.buf = this.buf.slice(idx + 1);
                return line;
            }
            if (this.closed)
                throw new Error('IMAP: połączenie zamknięte przed odczytaniem linii');
            await this.waitForData();
        }
    }
    write(data) {
        this.socket.write(data);
    }
    destroy() {
        try {
            this.socket.destroy();
        }
        catch { /* ignore */ }
    }
}
// ---------------------------------------------------------------------------
// Pomocnicze funkcje IMAP
// ---------------------------------------------------------------------------
/** Czeka na odpowiedź oznaczoną tagiem (np. "A001 OK ..." lub "A001 NO ..."). */
async function awaitTagged(reader, tag) {
    const lines = [];
    while (true) {
        const line = await reader.readLine();
        if (line.startsWith(`${tag} `)) {
            return { ok: line.startsWith(`${tag} OK`), lines };
        }
        lines.push(line);
    }
}
/** Zwraca string IMAP w cudzysłowie z odpowiednim escape'owaniem. */
function imapQuoted(s) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
/** Parsuje nazwę skrzynki z odpowiedzi LIST:
 *  `* LIST (\Sent \HasNoChildren) "/" Sent`
 *  `* LIST (\Sent) "/" "Sent Items"`
 */
function parseListMailbox(line) {
    // Usuń prefix "* LIST (<flags>) "<delim>" " i zwróć resztę
    const match = line.match(/^\* LIST \([^)]*\) (?:"[^"]*"|NIL) (.+)$/i);
    if (!match)
        return null;
    const raw = match[1].trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
        return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return raw;
}
// ---------------------------------------------------------------------------
// Główna funkcja — połącz z IMAP i wykonaj APPEND
// ---------------------------------------------------------------------------
async function appendToSentFolder(rawEmail) {
    // Sprawdź czy funkcja jest włączona
    if (process.env.IMAP_SAVE_SENT === 'false')
        return;
    const host = process.env.IMAP_HOST || process.env.SMTP_HOST;
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const secure = process.env.IMAP_SECURE !== 'false'; // domyślnie true
    const user = process.env.IMAP_USER || process.env.SMTP_USER;
    const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;
    const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';
    const forcedFolder = process.env.IMAP_SENT_FOLDER || '';
    if (!host || !user || !pass) {
        console.warn('⚠️ IMAP: Brak konfiguracji — ustaw IMAP_HOST (lub SMTP_HOST), SMTP_USER, SMTP_PASS');
        return;
    }
    let reader = null;
    try {
        // 1. Nawiąż połączenie
        const socket = await new Promise((resolve, reject) => {
            if (secure) {
                const s = tls.connect({ host, port, rejectUnauthorized }, () => resolve(s));
                s.once('error', reject);
            }
            else {
                const s = net.connect({ host, port }, () => resolve(s));
                s.once('error', reject);
            }
        });
        reader = new ImapLineReader(socket);
        // 2. Powitanie serwera
        const greeting = await reader.readLine();
        if (!greeting.startsWith('* OK') && !greeting.startsWith('* PREAUTH')) {
            throw new Error(`IMAP: nieoczekiwane powitanie serwera: ${greeting}`);
        }
        let tagNum = 0;
        const tag = () => `A${String(++tagNum).padStart(3, '0')}`;
        // 3. STARTTLS (gdy secure=false, port 143)
        if (!secure) {
            const t = tag();
            reader.write(`${t} STARTTLS\r\n`);
            const res = await awaitTagged(reader, t);
            if (!res.ok)
                throw new Error('IMAP: STARTTLS nieobsługiwany lub odrzucony');
            const upgradedSocket = tls.connect({
                socket: socket,
                host,
                rejectUnauthorized,
            });
            await new Promise((resolve, reject) => {
                upgradedSocket.once('secureConnect', resolve);
                upgradedSocket.once('error', reject);
            });
            reader.destroy();
            reader = new ImapLineReader(upgradedSocket);
        }
        // 4. LOGIN
        const loginTag = tag();
        reader.write(`${loginTag} LOGIN ${imapQuoted(user)} ${imapQuoted(pass)}\r\n`);
        const loginRes = await awaitTagged(reader, loginTag);
        if (!loginRes.ok) {
            throw new Error('IMAP: błąd logowania — sprawdź IMAP_USER i IMAP_PASS');
        }
        // 5. Znajdź folder Wysłane
        let sentFolder = forcedFolder || null;
        if (!sentFolder) {
            // 5a. Szukaj folderu z atrybutem \Sent przez LIST
            const listTag = tag();
            reader.write(`${listTag} LIST "" "*"\r\n`);
            const listRes = await awaitTagged(reader, listTag);
            for (const line of listRes.lines) {
                if (/\\Sent/i.test(line)) {
                    sentFolder = parseListMailbox(line);
                    if (sentFolder)
                        break;
                }
            }
            // 5b. Fallback: sprawdź popularne nazwy przez STATUS
            if (!sentFolder) {
                for (const candidate of SENT_FOLDER_CANDIDATES) {
                    const t = tag();
                    reader.write(`${t} STATUS ${imapQuoted(candidate)} (MESSAGES)\r\n`);
                    const res = await awaitTagged(reader, t);
                    if (res.ok) {
                        sentFolder = candidate;
                        break;
                    }
                }
            }
        }
        if (!sentFolder) {
            console.warn('⚠️ IMAP: Nie znaleziono folderu Wysłane. Ustaw IMAP_SENT_FOLDER w .env.');
            const t = tag();
            reader.write(`${t} LOGOUT\r\n`);
            await awaitTagged(reader, t).catch(() => { });
            return;
        }
        // 6. APPEND — wyślij email jako literal
        const size = rawEmail.length;
        const appendTag = tag();
        reader.write(`${appendTag} APPEND ${imapQuoted(sentFolder)} (\\Seen) {${size}}\r\n`);
        // Czekaj na odpowiedź kontynuacji: "+ ..."
        while (true) {
            const line = await reader.readLine();
            if (line.startsWith('+'))
                break;
            if (line.startsWith(appendTag)) {
                throw new Error(`IMAP: APPEND odrzucony przez serwer: ${line}`);
            }
        }
        reader.write(rawEmail);
        reader.write('\r\n');
        const appendRes = await awaitTagged(reader, appendTag);
        if (!appendRes.ok) {
            throw new Error(`IMAP: APPEND nieudany dla folderu "${sentFolder}"`);
        }
        console.log(`📬 Kopia zapisana w IMAP: "${sentFolder}" (${size} bajtów)`);
        // 7. LOGOUT
        const logoutTag = tag();
        reader.write(`${logoutTag} LOGOUT\r\n`);
        await awaitTagged(reader, logoutTag).catch(() => { });
    }
    catch (err) {
        // Błędy IMAP nie przerywają działania aplikacji — email już wysłany
        console.error('⚠️ IMAP: Błąd zapisu do folderu Wysłane:', err instanceof Error ? err.message : err);
    }
    finally {
        reader?.destroy();
    }
}
//# sourceMappingURL=imapSent.js.map