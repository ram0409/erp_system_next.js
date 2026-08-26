import type { ReactNode } from "react";

import { AuthAtmosphere } from "@/components/layout/auth-atmosphere";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Login-only auth frame: an animated canvas and one rounded card. There is
 * no sign-up column — staff accounts are created by an administrator.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <AuthAtmosphere />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle onBrand />
      </div>

      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2">
          <div className="auth-card-halo size-full rounded-full" />
        </div>
        <div className="bg-card text-card-foreground auth-card relative overflow-hidden rounded-[1.75rem] px-8 py-10 shadow-[0_32px_80px_-24px_oklch(0.28_0.14_290_/_0.55)] sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
