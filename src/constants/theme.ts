/**
 * Appearance preference. Stored as a cookie so the root layout can paint the
 * matching theme on the first byte, and mirrored to localStorage as a fallback
 * when cookies are blocked.
 */

export const THEME_VALUES = ["light", "dark"] as const;
export type Theme = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: Theme = "light";

export const THEME_COOKIE_NAME = "erp.theme";
export const THEME_STORAGE_KEY = "erp.theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseTheme(value: string | null | undefined): Theme {
  return THEME_VALUES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Runs before paint so a stored dark preference never flashes the light canvas.
 * Cookie name and storage key must stay in lockstep with the constants above.
 */
const THEME_COOKIE_PATTERN = THEME_COOKIE_NAME.replaceAll(".", "\\.");

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_PATTERN}=([^;]*)/);var t=m?decodeURIComponent(m[1]):localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){}})();`;
