type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set([
  // Patient PII
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'occupation',
  // Common free-text / PHI containers
  'notes',
  'message',
  'bodyPreview',
  'diagnosis',
  'generalRemarks',
  'hairLossNotes',
  'oilyHairNotes',
  'problemComment',
  'hairLossComment',
  'oilyHairComment',
  'scalingComment',
  'sensitivityComment',
  'inflammatoryComment',
  'anamnesisComment',
  'trichoscopyComment',
  'labDiagnosticsComment',
  'alopeciaComment',
  'recommendationsComment',
  'visitsComment',
  'remarksComment',
  'medicationsList',
  'chronicDiseasesList',
  'specialistsList',
  'foodIntolerances',
  'supplements',
  'supplementsDetails',
  'antibiotics',
  'antibioticsDetails',
  // Auth
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
]);

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key)) return '[REDACTED]';
  return value;
}

function redactObject(input: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((v) => redactObject(v, depth + 1));
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = redactObject(redactValue(k, v), depth + 1);
    }
    return out;
  }
  if (typeof input === 'string' && input.length > 500) return input.slice(0, 500) + '…';
  return input;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '[REDACTED_EMAIL]';
  const safeUser = user.length <= 2 ? user[0] + '*' : user.slice(0, 2) + '***';
  return `${safeUser}@${domain}`;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? (redactObject(meta) as Record<string, unknown>) : undefined;
  const line = safeMeta ? { timestamp, level, message, ...safeMeta } : { timestamp, level, message };

  // eslint-disable-next-line no-console
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};



