/**
 * Per-request CSP and the headers that do not depend on a nonce.
 *
 * Script policy uses a nonce plus `strict-dynamic` so Next's own bootstrap can
 * run without `'unsafe-inline'`. Style policy keeps `'unsafe-inline'` because a
 * nonce on `style-src` would disable that keyword, and Radix positioning plus
 * a few layout measurements still set `style=` in the DOM.
 *
 * This module is imported from `src/proxy.ts`, which runs on the Edge runtime,
 * so nonce generation uses Web Crypto rather than `node:crypto`.
 */

export const CSP_NONCE_HEADER = "x-nonce";

export const HTML_CACHE_CONTROL = "private, no-store, max-age=0";

/** JSON endpoints never execute script; a nonce would be wasted here. */
export const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export interface CspOptions {
  readonly nonce: string;
  readonly isDevelopment: boolean;
}

export function createCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export function buildContentSecurityPolicy({ nonce, isDevelopment }: CspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

/**
 * Headers that are identical on every response. Applied from `next.config.ts`
 * so static assets and `/api` inherit them even when the proxy matcher skips
 * the request. CSP for HTML is issued per-request from `src/proxy.ts`.
 */
export const STATIC_SECURITY_HEADERS: readonly { readonly key: string; readonly value: string }[] =
  [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
