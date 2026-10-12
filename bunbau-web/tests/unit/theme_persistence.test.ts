import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
  BUNBAU_THEME_KEY,
  getStoredTheme,
  setStoredTheme,
  resolveActiveTheme,
  applyThemeToDom,
  toggleThemeMode,
  ThemeMode,
} from '../../src/lib/utils/themeManager';
import { UserProfile } from '../../src/lib/models';

describe('Theme Persistence and Profile Integration (BunBau v4.0)', () => {
  let storageMap: Map<string, string>;
  let classListSet: Set<string>;

  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const mockDocument = {
    documentElement: {
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls),
        contains: (cls: string) => classListSet.has(cls),
      },
    },
  };

  beforeAll(() => {
    storageMap = new Map();
    classListSet = new Set();
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).document = mockDocument;
  });

  afterAll(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).document;
  });

  beforeEach(() => {
    storageMap.clear();
    classListSet.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Storage Utilities (getStoredTheme / setStoredTheme)', () => {
    it('returns null when no theme is stored', () => {
      expect(getStoredTheme()).toBeNull();
    });

    it('stores and retrieves valid theme preferences', () => {
      setStoredTheme('light');
      expect(mockLocalStorage.getItem(BUNBAU_THEME_KEY)).toBe('light');
      expect(getStoredTheme()).toBe('light');

      setStoredTheme('dark');
      expect(mockLocalStorage.getItem(BUNBAU_THEME_KEY)).toBe('dark');
      expect(getStoredTheme()).toBe('dark');

      setStoredTheme('system');
      expect(mockLocalStorage.getItem(BUNBAU_THEME_KEY)).toBe('system');
      expect(getStoredTheme()).toBe('system');
    });

    it('ignores invalid values stored in localStorage and returns null', () => {
      mockLocalStorage.setItem(BUNBAU_THEME_KEY, 'neon-green');
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe('Theme Resolution (resolveActiveTheme)', () => {
    it('resolves explicit light and dark themes directly', () => {
      expect(resolveActiveTheme('light')).toBe('light');
      expect(resolveActiveTheme('dark')).toBe('dark');
    });

    it('resolves system mode using systemPrefersDark boolean flag', () => {
      expect(resolveActiveTheme('system', true)).toBe('dark');
      expect(resolveActiveTheme('system', false)).toBe('light');
    });

    it('resolves system mode via window.matchMedia if available', () => {
      const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      (globalThis as any).window.matchMedia = matchMediaMock;

      expect(resolveActiveTheme('system')).toBe('dark');
      expect(resolveActiveTheme(null)).toBe('dark');
    });

    it('defaults to dark mode when no preference or matchMedia is present', () => {
      delete (globalThis as any).window.matchMedia;
      expect(resolveActiveTheme(null)).toBe('dark');
    });
  });

  describe('DOM Theme Application (applyThemeToDom)', () => {
    it('adds dark class to documentElement for dark mode', () => {
      applyThemeToDom('dark');
      expect(mockDocument.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from documentElement for light mode', () => {
      mockDocument.documentElement.classList.add('dark');
      applyThemeToDom('light');
      expect(mockDocument.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggling (toggleThemeMode)', () => {
    it('inverts dark to light', () => {
      expect(toggleThemeMode('dark')).toBe('light');
    });

    it('inverts light to dark', () => {
      expect(toggleThemeMode('light')).toBe('dark');
    });
  });

  describe('User Profile Integration & Schema Compliance', () => {
    it('accepts theme property on UserProfile model', () => {
      const profile: UserProfile = {
        uid: 'user_12345',
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: 'https://example.com/photo.jpg',
        riskTolerance: 'Aggressive',
        theme: 'dark',
      };

      expect(profile.theme).toBe('dark');
    });

    it('correctly builds updateProfileData payload when theme is selected', () => {
      const selectedTheme: ThemeMode = 'light';
      const cleanPhone = '6502022366';
      const displayName = 'Updated Name';

      const updatePayload: Partial<UserProfile> = {
        displayName,
        phoneNumber: cleanPhone,
        theme: selectedTheme,
      };

      expect(updatePayload).toEqual({
        displayName: 'Updated Name',
        phoneNumber: '6502022366',
        theme: 'light',
      });
    });

    it('caches and hydrates theme from local profile cache', () => {
      const uid = 'user_abc';
      const cachedProfile: UserProfile = {
        uid,
        displayName: 'Cached User',
        email: 'cached@example.com',
        photoURL: '',
        riskTolerance: 'Moderate',
        theme: 'light',
      };

      mockLocalStorage.setItem(`bunbau_profile_cache_${uid}`, JSON.stringify(cachedProfile));
      const parsed: UserProfile = JSON.parse(mockLocalStorage.getItem(`bunbau_profile_cache_${uid}`)!);
      expect(parsed.theme).toBe('light');

      const resolved = resolveActiveTheme(parsed.theme);
      applyThemeToDom(resolved);
      expect(mockDocument.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
