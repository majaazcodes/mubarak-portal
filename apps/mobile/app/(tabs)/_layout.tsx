import { Redirect, Tabs } from "expo-router";
import { Home, QrCode, User } from "lucide-react-native";
import { useAuthStore } from "../../src/lib/stores/auth-store";
import { colors } from "../../src/lib/theme";

export default function TabsLayout(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  // First half of the auth gate — if the API client cleared the session
  // mid-session (e.g. refresh failed), this redirect kicks in immediately.
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
