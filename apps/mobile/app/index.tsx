import { Redirect } from "expo-router";
import { useAuthStore } from "../src/lib/stores/auth-store";

// `/` is just a router — actual UX lives under (auth) or (tabs). Routing here
// rather than in _layout keeps the layout itself a pure shell.
export default function Index(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
