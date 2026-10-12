import { describe, it, expect } from 'vitest';
import { formatUsPhone, normalizePhoneDigits } from '../../src/lib/utils/formatPhone';

describe('US Phone Number Utilities (formatPhone)', () => {
  describe('normalizePhoneDigits()', () => {
    it('strips all non-digit characters', () => {
      expect(normalizePhoneDigits('(650) 202-2366')).toBe('6502022366');
      expect(normalizePhoneDigits('+1-650-202-2366')).toBe('16502022366');
      expect(normalizePhoneDigits('650.202.2366')).toBe('6502022366');
      expect(normalizePhoneDigits('abc 650-202!')).toBe('650202');
      expect(normalizePhoneDigits('')).toBe('');
      expect(normalizePhoneDigits(null)).toBe('');
      expect(normalizePhoneDigits(undefined)).toBe('');
    });
  });

  describe('formatUsPhone()', () => {
    it('formats a 10-digit number to standard US format (650) 202-2366', () => {
      expect(formatUsPhone('6502022366')).toBe('(650) 202-2366');
      expect(formatUsPhone('6502012366')).toBe('(650) 201-2366');
    });

    it('strips leading country code 1 for 11-digit US numbers', () => {
      expect(formatUsPhone('16502022366')).toBe('(650) 202-2366');
      expect(formatUsPhone('+1 (650) 202-2366')).toBe('(650) 202-2366');
    });

    it('handles interactive typing states cleanly', () => {
      expect(formatUsPhone('6')).toBe('(6');
      expect(formatUsPhone('65')).toBe('(65');
      expect(formatUsPhone('650')).toBe('(650');
      expect(formatUsPhone('6502')).toBe('(650) 2');
      expect(formatUsPhone('650202')).toBe('(650) 202');
      expect(formatUsPhone('6502022')).toBe('(650) 202-2');
      expect(formatUsPhone('6502022366')).toBe('(650) 202-2366');
    });

    it('caps output at 10 digits', () => {
      expect(formatUsPhone('650202236699999')).toBe('(650) 202-2366');
    });

    it('handles empty and null values gracefully', () => {
      expect(formatUsPhone('')).toBe('');
      expect(formatUsPhone(null)).toBe('');
      expect(formatUsPhone(undefined)).toBe('');
    });
  });
});
