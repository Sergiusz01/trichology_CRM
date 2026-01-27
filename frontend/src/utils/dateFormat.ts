/**
 * Centralized date/time formatting utilities
 * Ensures consistent date/time formatting and timezone handling across the application
 */

/**
 * Format date as DD.MM.YYYY (Polish format)
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format date and time as DD.MM.YYYY, HH:MM (Polish format)
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date and time with seconds as DD.MM.YYYY, HH:MM:SS (Polish format)
 */
export const formatDateTimeWithSeconds = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 * Preserves local timezone
 */
export const formatDateTimeLocal = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Format date for date input (YYYY-MM-DD)
 */
export const formatDateInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get relative time string (e.g., "2 dni temu", "za 3 godziny")
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const now = new Date();
  const then = new Date(date);
  const diffMs = then.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (Math.abs(diffDays) > 7) {
    return formatDate(date);
  }

  if (Math.abs(diffDays) >= 1) {
    if (diffDays > 0) {
      return `za ${diffDays} ${diffDays === 1 ? 'dzień' : diffDays < 5 ? 'dni' : 'dni'}`;
    } else {
      return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dzień' : Math.abs(diffDays) < 5 ? 'dni' : 'dni'} temu`;
    }
  }

  if (Math.abs(diffHours) >= 1) {
    if (diffHours > 0) {
      return `za ${diffHours} ${diffHours === 1 ? 'godzinę' : diffHours < 5 ? 'godziny' : 'godzin'}`;
    } else {
      return `${Math.abs(diffHours)} ${Math.abs(diffHours) === 1 ? 'godzinę' : Math.abs(diffHours) < 5 ? 'godziny' : 'godzin'} temu`;
    }
  }

  if (Math.abs(diffMinutes) >= 1) {
    if (diffMinutes > 0) {
      return `za ${diffMinutes} ${diffMinutes === 1 ? 'minutę' : diffMinutes < 5 ? 'minuty' : 'minut'} temu`;
    } else {
      return `${Math.abs(diffMinutes)} ${Math.abs(diffMinutes) === 1 ? 'minutę' : Math.abs(diffMinutes) < 5 ? 'minuty' : 'minut'} temu`;
    }
  }

  return 'teraz';
};
