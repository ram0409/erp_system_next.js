"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_STORAGE_EVENT = "erp:local-storage";

function subscribe(onChange: () => void): () => void {
  // `storage` fires for other tabs; the custom event covers this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_STORAGE_EVENT, onChange);
  };
}

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    // Private browsing modes can deny storage access; the preference is not
    // important enough to break the page over.
    return fallback;
  }
}

/**
 * A boolean UI preference backed by localStorage, read through
 * `useSyncExternalStore` so the server render uses the fallback and the client
 * adopts the stored value without an effect-driven second render.
 */
export function usePersistedBoolean(
  key: string,
  fallback = false,
): readonly [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // Ignore quota or permission failures; state still updates in memory
        // for the current page via the dispatched event below.
      }
      window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}
