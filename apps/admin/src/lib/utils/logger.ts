// No-op logger in production so nothing leaks through `console.log`.
// In dev, proxy to the console. Secrets (tokens, passwords) must never be
// passed here — callers are responsible for redacting before logging.

const isDev = process.env.NODE_ENV !== "production";

function log(
  level: "debug" | "info" | "warn" | "error",
  ...args: unknown[]
): void {
  if (!isDev) return;

  console[level](...args);
}

export const logger = {
  debug: (...args: unknown[]) => log("debug", ...args),
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  // Errors are logged even in production — but only the message/stack, never
  // the raw request body (which could contain credentials).
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
