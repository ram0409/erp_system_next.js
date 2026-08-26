"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Immediate feedback while a menu click waits on the server page. Next keeps
 * the previous screen until the RSC payload arrives; without this the UI looks
 * frozen.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
          return;
        }
        if (url.pathname === pathname) {
          return;
        }
        setPending(true);
      } catch {
        return;
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!pending) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="bg-primary h-full w-full origin-left animate-[nav-progress_1s_ease-out_forwards]" />
    </div>
  );
}
