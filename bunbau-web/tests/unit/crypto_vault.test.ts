import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../../src/lib/utils/cryptoVault';

describe('Client-Side AES-256-GCM Crypto Vault (cryptoVault)', () => {
  const mockUid = 'firebase_user_abc12345';
  const sampleGeminiKey = 'AIzaSyBHE0Kkc071eDwjJIVicaE7GzMOim1uZ_Q';
  const sampleAnthropicKey = 'sk-ant-api03-abcdef9876543210-A9f2';

  describe('maskApiKey()', () => {
    it('masks an Anthropic API key keeping prefix and suffix', () => {
      const masked = maskApiKey(sampleAnthropicKey);
      expect(masked).toBe('sk-ant••••••••A9f2');
      expect(masked).not.toContain('abcdef9876543210');
    });

    it('masks a Gemini API key keeping prefix and suffix', () => {
      const masked = maskApiKey(sampleGeminiKey);
      expect(masked).toBe('AIzaSy••••••••uZ_Q');
      expect(masked).not.toContain('BHE0Kkc071eDwjJIVicaE7GzMOim1');
    });

    it('handles short keys safely', () => {
      expect(maskApiKey('12345')).toBe('••••••••');
      expect(maskApiKey('')).toBe('');
    });
  });

  describe('encryptApiKey() and decryptApiKey() AES-256-GCM', () => {
    it('successfully encrypts and decrypts a key using the user UID', async () => {
      const { ciphertext, masked } = await encryptApiKey(sampleAnthropicKey, mockUid);

      // Verify ciphertext format salt:iv:ciphertext
      expect(ciphertext).toContain(':');
      const parts = ciphertext.split(':');
      expect(parts.length).toBe(3);

      // Ensure zero plain-text leakage in ciphertext
      expect(ciphertext).not.toContain(sampleAnthropicKey);
      expect(ciphertext).not.toContain('sk-ant');

      // Verify decryption returns exact original key
      const decrypted = await decryptApiKey(ciphertext, mockUid);
      expect(decrypted).toBe(sampleAnthropicKey);
      expect(masked).toBe('sk-ant••••••••A9f2');
    });

    it('supports Gemini API keys with perfect round-trip decryption', async () => {
      const { ciphertext } = await encryptApiKey(sampleGeminiKey, mockUid);
      const decrypted = await decryptApiKey(ciphertext, mockUid);
      expect(decrypted).toBe(sampleGeminiKey);
    });

    it('fails decryption if attempted with a different UID', async () => {
      const { ciphertext } = await encryptApiKey(sampleAnthropicKey, mockUid);
      const attackerUid = 'hacker_attacker_999';

      await expect(decryptApiKey(ciphertext, attackerUid)).rejects.toThrow();
    });

    it('handles empty strings gracefully', async () => {
      const res = await encryptApiKey('', mockUid);
      expect(res.ciphertext).toBe('');
      expect(res.masked).toBe('');
    });
  });
});
