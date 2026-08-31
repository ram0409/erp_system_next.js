/**
 * Appearance preference. Stored as cookies so the root layout can paint the
 * matching theme and accent on the first byte, and mirrored to localStorage as
 * a fallback when cookies are blocked.
 *
 * The accent is a full HSLA colour. Light and dark palettes keep their own
 * lightness offsets so the same pick stays readable on both canvases.
 */

import type { CSSProperties } from "react";

import {
  contrastingForeground,
  normalizeHsla,
  type HslaColor,
} from "@/lib/color";

export const THEME_VALUES = ["light", "dark"] as const;
export type Theme = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: Theme = "light";

export const THEME_COOKIE_NAME = "erp.theme";
export const THEME_STORAGE_KEY = "erp.theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type AccentColor = HslaColor;

export const ACCENT_PALETTES = [
  { id: "navy", label: "Navy", color: { h: 250, s: 42, l: 32, a: 100 } },
  { id: "grass", label: "Grass", color: { h: 67, s: 54, l: 43, a: 100 } },
  { id: "teal", label: "Teal", color: { h: 192, s: 55, l: 36, a: 100 } },
  { id: "emerald", label: "Emerald", color: { h: 155, s: 50, l: 34, a: 100 } },
  { id: "violet", label: "Violet", color: { h: 292, s: 48, l: 38, a: 100 } },
  { id: "rose", label: "Rose", color: { h: 12, s: 62, l: 46, a: 100 } },
  { id: "amber", label: "Amber", color: { h: 38, s: 80, l: 48, a: 100 } },
] as const;

export type AccentPaletteId = (typeof ACCENT_PALETTES)[number]["id"];

export const DEFAULT_ACCENT: AccentColor = ACCENT_PALETTES[0].color;

export const ACCENT_COOKIE_NAME = "erp.accent";
export const ACCENT_STORAGE_KEY = "erp.accent";
export const ACCENT_SWATCHES_STORAGE_KEY = "erp.accent.swatches";
export const ACCENT_SWATCHES_MAX = 8;

const ACCENT_SERIAL_PATTERN = /^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/;
const PALETTE_BY_ID: Readonly<Record<string, AccentColor>> = Object.fromEntries(
  ACCENT_PALETTES.map((palette) => [palette.id, palette.color]),
);

export function parseTheme(value: string | null | undefined): Theme {
  return THEME_VALUES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

export function serializeAccent(color: AccentColor): string {
  const next = normalizeHsla(color);
  return `${String(next.h)}-${String(next.s)}-${String(next.l)}-${String(next.a)}`;
}

export function parseAccent(value: string | null | undefined): AccentColor {
  if (!value) {
    return DEFAULT_ACCENT;
  }

  const named = PALETTE_BY_ID[value];
  if (named) {
    return named;
  }

  const match = ACCENT_SERIAL_PATTERN.exec(value.trim());
  if (!match) {
    return DEFAULT_ACCENT;
  }

  return normalizeHsla({
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
    a: Number(match[4]),
  });
}

export function matchingPaletteId(color: AccentColor): AccentPaletteId | "custom" {
  const next = normalizeHsla(color);
  const found = ACCENT_PALETTES.find(
    (palette) =>
      palette.color.h === next.h &&
      palette.color.s === next.s &&
      palette.color.l === next.l &&
      palette.color.a === next.a,
  );
  return found?.id ?? "custom";
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function accentCookie(color: AccentColor): string {
  return `${ACCENT_COOKIE_NAME}=${serializeAccent(color)}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function accentStyle(color: AccentColor): CSSProperties {
  const next = normalizeHsla(color);
  const darkL = Math.min(78, next.l + 18);
  return {
    "--accent-h": String(next.h),
    "--accent-s": String(next.s),
    "--accent-l": String(next.l),
    "--accent-a": String(next.a / 100),
    "--accent-hue": String(next.h),
    "--accent-fg-light": contrastingForeground(next.l),
    "--accent-fg-dark": contrastingForeground(darkL),
  } as CSSProperties;
}

export function applyAccentToDocument(color: AccentColor, root: HTMLElement): void {
  const style = accentStyle(color);
  for (const [property, value] of Object.entries(style)) {
    if (typeof value === "string") {
      root.style.setProperty(property, value);
    }
  }
  root.dataset.accent = serializeAccent(color);
}

/**
 * Runs before paint so a stored dark preference never flashes the light canvas,
 * and so the chosen accent is on `html` before the first frame.
 */
const THEME_COOKIE_PATTERN = THEME_COOKIE_NAME.replaceAll(".", "\\.");
const ACCENT_COOKIE_PATTERN = ACCENT_COOKIE_NAME.replaceAll(".", "\\.");
const PALETTE_LITERAL = ACCENT_PALETTES.map(
  (palette) =>
    `${JSON.stringify(palette.id)}:[${String(palette.color.h)},${String(palette.color.s)},${String(palette.color.l)},${String(palette.color.a)}]`,
).join(",");
const DEFAULT_SERIAL = serializeAccent(DEFAULT_ACCENT);

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement;var tm=document.cookie.match(/(?:^|; )${THEME_COOKIE_PATTERN}=([^;]*)/);var t=tm?decodeURIComponent(tm[1]):localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"){d.classList.add("dark");d.style.colorScheme="dark";}else{d.classList.remove("dark");d.style.colorScheme="light";}var am=document.cookie.match(/(?:^|; )${ACCENT_COOKIE_PATTERN}=([^;]*)/);var a=am?decodeURIComponent(am[1]):localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});var named={${PALETTE_LITERAL}};var h=250,s=42,l=32,aa=100;var m=/^(\\d{1,3})-(\\d{1,3})-(\\d{1,3})-(\\d{1,3})$/.exec(a||"");if(m){h=+m[1];s=+m[2];l=+m[3];aa=+m[4];}else if(named[a]){h=named[a][0];s=named[a][1];l=named[a][2];aa=named[a][3];}function fg(x){return x>=58?"hsl(0 0% 12%)":"hsl(0 0% 100%)";}d.style.setProperty("--accent-h",String(h));d.style.setProperty("--accent-s",String(s));d.style.setProperty("--accent-l",String(l));d.style.setProperty("--accent-a",String(aa/100));d.style.setProperty("--accent-hue",String(h));d.style.setProperty("--accent-fg-light",fg(l));d.style.setProperty("--accent-fg-dark",fg(Math.min(78,l+18)));d.setAttribute("data-accent",[h,s,l,aa].join("-"));}catch(e){d&&d.setAttribute("data-accent",${JSON.stringify(DEFAULT_SERIAL)});}})();`;
