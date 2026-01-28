/**
 * Centralized date/time formatting utilities.
 * All UI dates/times use Europe/Warsaw. API stores UTC.
 */

const TZ = 'Europe/Warsaw';

const dateOpts: Intl.DateTimeFormatOptions = {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const dateTimeOpts: Intl.DateTimeFormatOptions = {
  ...dateOpts,
  hour: '2-digit',
  minute: '2-digit',
};

const dateTimeSecOpts: Intl.DateTimeFormatOptions = {
  ...dateTimeOpts,
  second: '2-digit',
};

/**
 * Format date as DD.MM.YYYY (Europe/Warsaw)
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL', dateOpts);
};

/**
 * Format date and time as DD.MM.YYYY, HH:MM (Europe/Warsaw)
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pl-PL', dateTimeOpts);
};

/**
 * Format date and time with seconds as DD.MM.YYYY, HH:MM:SS (Europe/Warsaw)
 */
export const formatDateTimeWithSeconds = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pl-PL', dateTimeSecOpts);
};

/**
 * Format UTC date for datetime-local input (YYYY-MM-DDTHH:mm) in Europe/Warsaw.
 */
export const formatDateTimeLocal = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

/**
 * Format date for datetime-local with minutes rounded to 00/15/30/45 (Europe/Warsaw, 24h).
 * Use for visit/procedure time pickers with step="900".
 */
export const formatDateTimeLocalForPicker = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  let y = get('year');
  let mo = get('month');
  let d = get('day');
  let h = parseInt(get('hour'), 10);
  let m = Math.round(parseInt(get('minute'), 10) / 15) * 15;
  if (m === 60) {
    m = 0;
    h += 1;
  }
  if (h === 24) {
    h = 23;
    m = 45;
  }
  const hour = String(h).padStart(2, '0');
  const minute = String(m).padStart(2, '0');
  return `${y}-${mo}-${d}T${hour}:${minute}`;
};

/**
 * Format time as HH:MM (Europe/Warsaw)
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('pl-PL', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format short date as "DD MMM" (Europe/Warsaw), e.g. "15 sty"
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat('pl-PL', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
  }).formatToParts(d);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${get('day')} ${get('month')}`;
};

/**
 * Format date for date input YYYY-MM-DD (Europe/Warsaw)
 */
export const formatDateInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/**
 * Get relative time string (e.g. "2 dni temu", "za 3 godziny")
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const now = new Date();
  const then = new Date(date);
  const diffMs = then.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (Math.abs(diffDays) > 7) return formatDate(date);

  if (Math.abs(diffDays) >= 1) {
    if (diffDays > 0) {
      return `za ${diffDays} ${diffDays === 1 ? 'dzień' : diffDays < 5 ? 'dni' : 'dni'}`;
    }
    return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dzień' : Math.abs(diffDays) < 5 ? 'dni' : 'dni'} temu`;
  }

  if (Math.abs(diffHours) >= 1) {
    if (diffHours > 0) {
      return `za ${diffHours} ${diffHours === 1 ? 'godzinę' : diffHours < 5 ? 'godziny' : 'godzin'}`;
    }
    return `${Math.abs(diffHours)} ${Math.abs(diffHours) === 1 ? 'godzinę' : Math.abs(diffHours) < 5 ? 'godziny' : 'godzin'} temu`;
  }

  if (Math.abs(diffMinutes) >= 1) {
    if (diffMinutes > 0) {
      return `za ${diffMinutes} ${diffMinutes === 1 ? 'minutę' : diffMinutes < 5 ? 'minuty' : 'minut'}`;
    }
    return `${Math.abs(diffMinutes)} ${Math.abs(diffMinutes) === 1 ? 'minutę' : Math.abs(diffMinutes) < 5 ? 'minuty' : 'minut'} temu`;
  }

  return 'teraz';
};
