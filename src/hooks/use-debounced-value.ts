"use client";

import { useEffect, useState } from "react";

/** Delays propagation of a fast-changing value, e.g. a search box keystroke. */
export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
