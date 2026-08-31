/**
 * Colour conversions for the accent picker. Values are integers in the ranges
 * the sliders use: hue 0–360, saturation/lightness/alpha 0–100.
 */

export const COLOR_FORMATS = ["hex", "hsl", "rgb"] as const;
export type ColorFormat = (typeof COLOR_FORMATS)[number];

export interface HslaColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly a: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHsla(input: HslaColor): HslaColor {
  const h = ((Math.round(input.h) % 360) + 360) % 360;
  return {
    h,
    s: clamp(Math.round(input.s), 0, 100),
    l: clamp(Math.round(input.l), 0, 100),
    a: clamp(Math.round(input.a), 0, 100),
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): readonly [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  if (ss === 0) {
    const value = Math.round(ll * 255);
    return [value, value, value];
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  return [
    Math.round(hueToRgb(p, q, hh + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hh) * 255),
    Math.round(hueToRgb(p, q, hh - 1 / 3) * 255),
  ];
}

export function rgbToHsl(r: number, g: number, b: number): readonly [number, number, number] {
  const rr = clamp(r, 0, 255) / 255;
  const gg = clamp(g, 0, 255) / 255;
  const bb = clamp(b, 0, 255) / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, Math.round(l * 100)];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) {
    h = (gg - bb) / d + (gg < bb ? 6 : 0);
  } else if (max === gg) {
    h = (bb - rr) / d + 2;
  } else {
    h = (rr - gg) / d + 4;
  }

  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

function toHexByte(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function hexToRgb(hex: string): readonly [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) {
    return null;
  }

  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw.slice(0, 6);

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

export function hslaToHex(color: HslaColor): string {
  const [r, g, b] = hslToRgb(color.h, color.s, color.l);
  return rgbToHex(r, g, b);
}

export function hslaToCss(color: HslaColor): string {
  const normalized = normalizeHsla(color);
  return `hsla(${String(normalized.h)} ${String(normalized.s)}% ${String(normalized.l)}% / ${String(normalized.a / 100)})`;
}

export function formatColor(color: HslaColor, format: ColorFormat): string {
  const normalized = normalizeHsla(color);
  const [r, g, b] = hslToRgb(normalized.h, normalized.s, normalized.l);
  if (format === "hex") {
    return hslaToHex(normalized).toUpperCase();
  }
  if (format === "rgb") {
    if (normalized.a < 100) {
      return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(normalized.a / 100)})`;
    }
    return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
  }
  if (normalized.a < 100) {
    return `hsla(${String(normalized.h)}, ${String(normalized.s)}%, ${String(normalized.l)}%, ${String(normalized.a / 100)})`;
  }
  return `hsl(${String(normalized.h)}, ${String(normalized.s)}%, ${String(normalized.l)}%)`;
}

export function parseColorInput(raw: string, fallback: HslaColor): HslaColor {
  const value = raw.trim();
  const hex = hexToRgb(value);
  if (hex) {
    const [h, s, l] = rgbToHsl(hex[0], hex[1], hex[2]);
    const alphaMatch = value.replace(/^#/, "");
    const a =
      alphaMatch.length === 8
        ? Math.round((Number.parseInt(alphaMatch.slice(6, 8), 16) / 255) * 100)
        : fallback.a;
    return normalizeHsla({ h, s, l, a: Number.isFinite(a) ? a : fallback.a });
  }

  const hsl = value.match(
    /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%?\s*[, ]\s*([\d.]+)%?(?:\s*[,/]\s*([\d.]+)%?)?\s*\)$/i,
  );
  if (hsl) {
    const aToken = hsl[4];
    const a =
      aToken === undefined
        ? fallback.a
        : Number(aToken) <= 1
          ? Math.round(Number(aToken) * 100)
          : Math.round(Number(aToken));
    return normalizeHsla({
      h: Number(hsl[1]),
      s: Number(hsl[2]),
      l: Number(hsl[3]),
      a,
    });
  }

  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgb) {
    const [h, s, l] = rgbToHsl(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
    const aToken = rgb[4];
    const a =
      aToken === undefined
        ? fallback.a
        : Number(aToken) <= 1
          ? Math.round(Number(aToken) * 100)
          : Math.round(Number(aToken));
    return normalizeHsla({ h, s, l, a });
  }

  return fallback;
}

export function colorsEqual(left: HslaColor, right: HslaColor): boolean {
  const a = normalizeHsla(left);
  const b = normalizeHsla(right);
  return a.h === b.h && a.s === b.s && a.l === b.l && a.a === b.a;
}

export function mixShade(base: HslaColor, saturation: number, lightness: number): HslaColor {
  return normalizeHsla({
    h: base.h,
    s: saturation,
    l: lightness,
    a: base.a,
  });
}

/** Five tints/shades in the same order as a typical design-tool palette. */
export function paletteShades(base: HslaColor): readonly HslaColor[] {
  return [
    mixShade(base, Math.round(base.s * 0.4), 36),
    mixShade(base, Math.round(base.s * 0.22), 93),
    normalizeHsla(base),
    mixShade(base, Math.min(100, Math.round(base.s * 0.85)), 22),
    mixShade(base, Math.round(base.s * 0.35), 8),
  ];
}

export function contrastingForeground(lightness: number): string {
  return lightness >= 58 ? "hsl(0 0% 12%)" : "hsl(0 0% 100%)";
}
