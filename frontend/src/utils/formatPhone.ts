/**
 * Format a phone number to a consistent display format: +48 XXX XXX XXX
 * Handles various input formats:
 *   508660107      → +48 508 660 107
 *   48 696 786 262 → +48 696 786 262
 *   +48 579 519 431 → +48 579 519 431
 *   506 648 543    → +48 506 648 543
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return phone; // return original if no digits

  let core: string;

  if (digits.length === 11 && digits.startsWith('48')) {
    // e.g. 48500518517 or 48696786262
    core = digits.slice(2);
  } else if (digits.length === 9) {
    // e.g. 508660107
    core = digits;
  } else if (digits.length === 12 && digits.startsWith('48')) {
    // edge case: +48 with extra digit
    core = digits.slice(2);
  } else {
    // Unknown format — just group by 3s with original prefix
    const groups = digits.match(/.{1,3}/g) || [digits];
    return groups.join(' ');
  }

  // Format as +48 XXX XXX XXX
  return `+48 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
}
