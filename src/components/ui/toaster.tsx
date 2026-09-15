"use client";

import { Toaster as SonnerToaster } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";

/**
 * Single toast host, mounted once in the root layout. Corner notifications only —
 * not a centered modal with backdrop.
 */
export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      className="app-toaster"
      position="top-right"
      closeButton
      offset={16}
      gap={10}
      visibleToasts={4}
      toastOptions={{
        unstyled: true,
        duration: 3200,
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          icon: "app-toast-icon",
          closeButton: "app-toast-close",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
          success: "app-toast--success",
          error: "app-toast--error",
          warning: "app-toast--warning",
          info: "app-toast--info",
        },
      }}
    />
  );
}
