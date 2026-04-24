"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a value: returns the input, delayed by `delayMs` after the last
 * change. Used for URL-sync of the search input so we don't rewrite the URL
 * on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
