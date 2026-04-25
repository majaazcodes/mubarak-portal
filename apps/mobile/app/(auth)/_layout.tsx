import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../src/lib/stores/auth-store";

export default function AuthLayout(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  // Already signed in — bounce to the tabs. This is the second half of the
  // auth gate (the first half lives in (tabs)/_layout.tsx).
  if (user) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
