import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/ui/button";
import { Card } from "../../src/components/ui/card";
import { SafeScreen } from "../../src/components/ui/safe-screen";
import { useLogout } from "../../src/lib/hooks/use-auth";
import { useAuthStore } from "../../src/lib/stores/auth-store";
import { colors, radius, spacing, typography } from "../../src/lib/theme";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function ProfileScreen(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const onLogout = async () => {
    await logout.mutateAsync(undefined);
    // The (tabs) layout's auth gate will boot us, but replace explicitly so
    // the back button can't return to the tabs after logout.
    router.replace("/(auth)/login");
  };

  return (
    <SafeScreen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? initials(user.fullName) : "?"}
            </Text>
          </View>
          <Text style={styles.name}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>

        <Card>
          <Row label="Role" value={formatRole(user?.role)} />
          <Row
            label="Agency"
            value={user?.agencyId ? "Mubarak Travels" : "—"}
          />
        </Card>

        <Button
          label="Log out"
          variant="outline"
          fullWidth
          loading={logout.isPending}
          onPress={onLogout}
          leftIcon={<LogOut color={colors.foreground} size={18} />}
        />
      </ScrollView>
    </SafeScreen>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatRole(role: string | undefined): string {
  if (!role) return "—";
  return role
    .split("_")
    .map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
  },
  header: { alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: 28,
    fontWeight: "700",
  },
  name: { ...typography.h2, color: colors.foreground },
  email: { ...typography.caption, color: colors.mutedForeground },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  rowLabel: { ...typography.caption, color: colors.mutedForeground },
  rowValue: { ...typography.body, color: colors.foreground, fontWeight: "500" },
});
