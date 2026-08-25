"use client";

import "./globals.css";

/**
 * Last-resort boundary: the root layout itself failed, so this file must render
 * its own `html` and `body` and cannot rely on any provider or shared component.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The application could not be loaded. Please refresh the page.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground text-xs">Reference: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="brand-fill brand-glow rounded-full px-4 py-2 text-sm font-medium"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
