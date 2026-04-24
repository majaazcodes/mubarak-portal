"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read the current URL search params as a typed record, and write them back
 * via router.replace (no history pollution). Pass `undefined` or empty string
 * to delete a key.
 *
 * Usage:
 *   const { params, set } = useQueryParams();
 *   set({ search: 'mohammed', page: '1' });
 */
export function useQueryParams(): {
  params: Record<string, string>;
  set: (patch: Record<string, string | undefined>) => void;
  get: (key: string) => string | undefined;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });

  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  return { params, set, get };
}
