/**
 * Format a phone number for display.
 * - Numbers with a country code (+XX…) are returned as stored (cleaned up).
 * - Raw 9-digit numbers are assumed Polish and formatted as +48 XXX XXX XXX.
 * - Anything else is returned as-is.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const trimmed = phone.trim();
  if (!trimmed) return '-';

  // Already has an international prefix — just clean extra spaces and return
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/\s+/g, ' ').trim();
  }

  // Strip all non-digit characters to check raw digit count
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 0) return trimmed;

  // 11 digits starting with 48 → Polish number without '+'
  if (digits.length === 11 && digits.startsWith('48')) {
    const core = digits.slice(2);
    return `+48 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
  }

  // 9 digits → assume Polish
  if (digits.length === 9) {
    return `+48 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Unknown format — return as stored
  return trimmed;
}
