import type { NextConfig } from "next";

import { API_CONTENT_SECURITY_POLICY, STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const isDevelopment = process.env.NODE_ENV === "development";

const securityHeaders = [
  ...STATIC_SECURITY_HEADERS,
  ...(isDevelopment
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Menu clicks stay on the previous page until the server finishes. A short
    // client cache plus full link prefetch makes the next visit feel instant.
    staleTimes: { dynamic: 30 },
    transitionIndicator: true,
  },
  // Native / driver packages must load through Node, not the Turbopack bundle.
  // Missing this is a common cause of INTERNAL_ERROR on the first database write
  // in a Server Action (sign-in records a login_attempts row).
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "@prisma/driver-adapter-utils",
    "pg",
    "@node-rs/argon2",
    "nodemailer",
    "@vercel/functions",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Authenticated ERP HTML is covered by the proxy (`no-store`). JSON
        // routes never execute script, so they get a lock-down CSP instead of a
        // nonce, and must not be cached by a proxy or shared browser cache.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Content-Security-Policy", value: API_CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;
