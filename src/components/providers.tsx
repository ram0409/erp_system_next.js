"use client";

import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_ACCENT, DEFAULT_THEME, type AccentColor, type Theme } from "@/constants/theme";

/**
 * Client-side context that the whole tree needs. Kept deliberately thin: server
 * state is fetched in server components, so there is no data-fetching provider
 * here to re-render the application on every cache change.
 */
export function Providers({
  children,
  theme = DEFAULT_THEME,
  accent = DEFAULT_ACCENT,
}: {
  children: ReactNode;
  theme?: Theme;
  accent?: AccentColor;
}) {
  return (
    <ThemeProvider initialTheme={theme} initialAccent={accent}>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
