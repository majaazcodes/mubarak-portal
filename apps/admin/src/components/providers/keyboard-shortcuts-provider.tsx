"use client";

import { useEffect } from "react";

// Minimal global keyboard shortcuts. Pages that care about Cmd/Ctrl+N opt in
// by listening for the custom 'admin:new' event below. Search focus is
// implemented by finding an input with [aria-label*="Search"] on the page —
// good enough for Phase 1; a full command palette lands later.

const SEARCH_SELECTOR = 'input[aria-label*="Search" i], input[type="search"]';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K → focus search
      if (mod && (e.key === "k" || e.key === "K")) {
        const input = document.querySelector<HTMLInputElement>(SEARCH_SELECTOR);
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      // Cmd/Ctrl + N → open create dialog (page dispatches on this event)
      if (mod && (e.key === "n" || e.key === "N")) {
        // Don't steal Ctrl+N from the browser if the user is typing in a form.
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("admin:new"));
        return;
      }

      // `/` → focus search (but not while typing in a field)
      if (e.key === "/" && !isTypingTarget(e.target) && !mod) {
        const input = document.querySelector<HTMLInputElement>(SEARCH_SELECTOR);
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <>{children}</>;
}
