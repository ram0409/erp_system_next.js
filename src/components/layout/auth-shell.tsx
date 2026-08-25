import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Login-only auth frame: a violet canvas and one rounded card. There is
 * no sign-up column — staff accounts are created by an administrator.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, oklch(0.62 0.2 310) 0%, oklch(0.48 0.22 292) 48%, oklch(0.4 0.18 268) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 h-[32rem] w-[36rem] rounded-[100%] blur-3xl"
        style={{ background: "oklch(0.78 0.14 318 / 0.55)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[8%] -right-16 h-[28rem] w-[30rem] rounded-[100%] blur-3xl"
        style={{ background: "oklch(0.7 0.16 280 / 0.5)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 left-[18%] h-[30rem] w-[40rem] rounded-[100%] blur-3xl"
        style={{ background: "oklch(0.58 0.2 300 / 0.45)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-[100%] blur-3xl"
        style={{ background: "oklch(0.72 0.12 300 / 0.28)" }}
      />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle onBrand />
      </div>

      <div className="bg-card text-card-foreground relative w-full max-w-[26rem] overflow-hidden rounded-[1.75rem] px-8 py-10 shadow-[0_32px_80px_-24px_oklch(0.28_0.14_290_/_0.55)] sm:px-10">
        {children}
      </div>
    </div>
  );
}
