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
export declare function appendToSentFolder(rawEmail: Buffer): Promise<void>;
//# sourceMappingURL=imapSent.d.ts.map