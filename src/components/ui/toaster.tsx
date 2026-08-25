"use client";

import { Toaster as SonnerToaster } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";

/**
 * Single toast host, mounted once in the root layout. Server actions surface
 * their result through this rather than each page inventing its own banner.
 */
export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-lg !text-sm",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-muted-foreground",
          error: "!border-destructive/30",
          success: "!border-success/30",
        },
      }}
    />
  );
}
