export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export const BUNBAU_THEME_KEY = 'bunbau_theme';

/**
 * Safely reads the stored theme preference from localStorage.
 */
export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(BUNBAU_THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch (_) {}
  return null;
}

/**
 * Safely persists the theme preference into localStorage.
 */
export function setStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BUNBAU_THEME_KEY, theme);
  } catch (_) {}
}

/**
 * Resolves the effective active theme ('light' or 'dark') given a user preference,
 * local storage fallback, and system dark mode detection.
 */
export function resolveActiveTheme(
  preferredTheme?: ThemeMode | null,
  systemPrefersDark?: boolean
): ActiveTheme {
  // If specific theme ('light' | 'dark') is requested
  if (preferredTheme === 'light' || preferredTheme === 'dark') {
    return preferredTheme;
  }

  // If preference is 'system' or omitted, query system preference
  if (systemPrefersDark !== undefined) {
    return systemPrefersDark ? 'dark' : 'light';
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'dark'; // Default BunBau theme is dark
}

/**
 * Applies or removes the 'dark' CSS class on document.documentElement.
 */
export function applyThemeToDom(activeTheme: ActiveTheme): void {
  if (typeof document === 'undefined') return;
  if (activeTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Inverts an active theme between 'light' and 'dark'.
 */
export function toggleThemeMode(current: ActiveTheme): ActiveTheme {
  return current === 'dark' ? 'light' : 'dark';
}
