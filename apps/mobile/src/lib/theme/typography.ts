import type { TextStyle } from "react-native";

// Font families default to the system stack — RN's null/undefined family means
// "platform default" which gives San Francisco on iOS and Roboto on Android,
// the right native feel without bundling custom fonts.
export const typography = {
  h1: { fontSize: 28, fontWeight: "700", lineHeight: 34 } as TextStyle,
  h2: { fontSize: 22, fontWeight: "600", lineHeight: 28 } as TextStyle,
  h3: { fontSize: 18, fontWeight: "600", lineHeight: 24 } as TextStyle,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } as TextStyle,
  bodyBold: { fontSize: 15, fontWeight: "600", lineHeight: 22 } as TextStyle,
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 } as TextStyle,
  small: { fontSize: 12, fontWeight: "400", lineHeight: 16 } as TextStyle,
} as const;
