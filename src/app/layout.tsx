import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { publicEnv } from "@/config/public-env";
import { THEME_BOOTSTRAP_SCRIPT, THEME_COOKIE_NAME, parseTheme } from "@/constants/theme";
import { CSP_NONCE_HEADER } from "@/lib/security-headers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: publicEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description: "Administration and reporting for the ERP platform.",
  // An internal business system should never appear in a search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce-based CSP is issued per request in `src/proxy.ts`. Waiting for the
  // incoming request opts every page out of static rendering so Next can stamp
  // that nonce onto framework scripts.
  await connection();

  const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? undefined;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <Providers theme={theme}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
