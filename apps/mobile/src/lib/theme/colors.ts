// Slate palette — kept in sync with admin web's tailwind theme so a user
// switching between admin laptop and operator phone sees the same brand.
export const colors = {
  primary: "#0f172a", // slate-900
  primaryForeground: "#f8fafc", // slate-50
  background: "#ffffff",
  foreground: "#020617", // slate-950
  card: "#ffffff",
  cardForeground: "#020617",
  muted: "#f1f5f9", // slate-100
  mutedForeground: "#64748b", // slate-500
  border: "#e2e8f0", // slate-200
  input: "#e2e8f0",
  ring: "#0f172a",
  destructive: "#ef4444", // red-500
  destructiveForeground: "#ffffff",
  success: "#10b981", // emerald-500
  successForeground: "#ffffff",
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
} as const;

export type ColorName = keyof typeof colors;
