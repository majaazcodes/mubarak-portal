import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  // useState ensures we get one client per app boot — recreating it on every
  // re-render would dump the cache and break dedup mid-session.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tunnel mode is slow; one retry cushions a flaky tunnel without
            // making every error feel sticky.
            retry: 1,
            staleTime: 30_000,
            // RN doesn't have a window-focus event the way the web does, so
            // disabling this prevents the legacy default from firing on
            // app-state changes and re-fetching everything.
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
