/**
 * Client-Side AES-256-GCM Encryption Vault for BunBau (資本寶)
 * 
 * Protects user API keys at rest in Firestore using Web Crypto API.
 * Keys are derived via PBKDF2 using the user's UID and salt.
 * Zero plain-text storage in the cloud.
 */

const SALT_PREFIX = 'bunbau_crypto_salt_v1_';
const PBKDF2_ITERATIONS = 100000;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  // Node.js fallback (for tests / server validation)
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto.subtle;
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto.getRandomValues(array);
}

/**
 * Derives an AES-GCM 256-bit CryptoKey using PBKDF2 with user's UID.
 */
async function deriveKey(uid: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    encoder.encode(uid),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Mask an API key for safe UI display (e.g. sk-ant-••••••••••••••••A9f2)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Encrypts an API key using AES-256-GCM.
 * Output format: base64(salt):base64(iv):base64(ciphertextAndTag)
 */
export async function encryptApiKey(
  apiKey: string,
  uid: string
): Promise<{ ciphertext: string; masked: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { ciphertext: '', masked: '' };
  }
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();

  // Generate 16-byte random salt and 12-byte IV for AES-GCM
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));

  const key = await deriveKey(uid, salt);
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(apiKey.trim())
  );

  const payload = `${bufferToBase64(salt)}:${bufferToBase64(iv)}:${bufferToBase64(encrypted)}`;
  return {
    ciphertext: payload,
    masked: maskApiKey(apiKey),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted API key with the user's UID.
 */
export async function decryptApiKey(
  encryptedPayload: string,
  uid: string
): Promise<string> {
  if (!encryptedPayload || !encryptedPayload.includes(':')) {
    return '';
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = base64ToBuffer(saltB64);
  const iv = base64ToBuffer(ivB64);
  const ciphertext = base64ToBuffer(cipherB64);

  const subtle = getSubtleCrypto();
  const decoder = new TextDecoder();

  const key = await deriveKey(uid, salt);
  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return decoder.decode(decrypted);
}

/**
 * Validates that an API key is a valid raw ASCII ByteString key (0-127),
 * and not a masked representation containing Unicode bullet (•, 8226) or asterisk characters.
 */
export function isByteStringSafeApiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 8) return false;
  // If it contains mask characters (bullet •, ●, asterisks *), it is not a usable raw key
  if (/[•●*]/.test(trimmed)) return false;
  // Must be strictly ASCII characters (0-127) to be safe for HTTP headers
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed.charCodeAt(i) > 127) return false;
  }
  return true;
}
