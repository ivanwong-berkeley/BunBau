/**
 * US Phone Number Formatting Utilities for BunBau (資本寶)
 * 
 * Ensures phone numbers are displayed and input with US formatting: (650) 202-2366
 * while normalizing to clean digits for database storage: 6502022366
 */

/**
 * Strips all non-digit characters from the input string.
 */
export function normalizePhoneDigits(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Formats a raw digit string into standard US telephone format.
 * Examples:
 *   '6502022366' -> '(650) 202-2366'
 *   '16502022366' -> '(650) 202-2366' (strips leading US country code 1)
 *   '650' -> '(650)'
 *   '650202' -> '(650) 202-'
 */
export function formatUsPhone(value: string | null | undefined): string {
  if (!value) return '';
  let digits = normalizePhoneDigits(value);

  // If starts with US country code '1' and has 11 digits, strip the leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  // Cap at 10 digits
  digits = digits.slice(0, 10);

  if (digits.length === 0) return '';
  if (digits.length <= 3) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
