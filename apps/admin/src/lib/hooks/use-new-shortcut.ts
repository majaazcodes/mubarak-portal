"use client";

import { useEffect } from "react";

/**
 * Subscribe to the global Cmd/Ctrl+N shortcut. Pages call this with a handler
 * that opens their "Create" dialog. The shortcut is dispatched by
 * KeyboardShortcutsProvider via a CustomEvent so we don't need a context.
 */
export function useNewShortcut(handler: () => void): void {
  useEffect(() => {
    const onNew = () => handler();
    window.addEventListener("admin:new", onNew);
    return () => window.removeEventListener("admin:new", onNew);
  }, [handler]);
}
