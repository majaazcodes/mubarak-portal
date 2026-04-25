import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Layers, QrCode, Users } from "lucide-react-native";
import { Card } from "../../src/components/ui/card";
import { SafeScreen } from "../../src/components/ui/safe-screen";
import {
  useGroupsCount,
  usePilgrimsTotal,
} from "../../src/lib/hooks/use-stats";
import { useAuthStore } from "../../src/lib/stores/auth-store";
import { colors, spacing, typography } from "../../src/lib/theme";

export default function DashboardScreen(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const pilgrimsTotal = usePilgrimsTotal();
  const groupsCount = useGroupsCount();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([pilgrimsTotal.refetch(), groupsCount.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [pilgrimsTotal, groupsCount]);

  return (
    <SafeScreen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View>
          <Text style={styles.welcome}>
            Welcome back{user ? `, ${user.fullName}` : ""}
          </Text>
          <Text style={styles.subtitle}>
            Here&apos;s a quick snapshot of your agency.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Total Pilgrims"
            value={
              pilgrimsTotal.isLoading
                ? "…"
                : pilgrimsTotal.isError
                  ? "—"
                  : (pilgrimsTotal.data ?? 0).toLocaleString()
            }
            icon={<Users color={colors.mutedForeground} size={18} />}
          />
          <StatCard
            label="Active Groups"
            value={
              groupsCount.isLoading
                ? "…"
                : groupsCount.isError
                  ? "—"
                  : String(groupsCount.data ?? 0)
            }
            icon={<Layers color={colors.mutedForeground} size={18} />}
          />
          <StatCard
            label="Pending Visas"
            value="—"
            hint="Coming in Phase 2"
            icon={<Users color={colors.mutedForeground} size={18} />}
          />
          <StatCard
            label="Scans Today"
            value="—"
            hint="Coming in Phase 2"
            icon={<QrCode color={colors.mutedForeground} size={18} />}
          />
        </View>

        <Card>
          <Text style={typography.h3}>Recent activity</Text>
          <Text style={styles.muted}>
            Your recent actions will appear here.
          </Text>
        </Card>
      </ScrollView>
    </SafeScreen>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: StatCardProps): React.JSX.Element {
  return (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
  },
  welcome: { ...typography.h1, color: colors.foreground },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: { ...typography.caption, color: colors.mutedForeground },
  statValue: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.foreground,
  },
  statHint: { ...typography.small, color: colors.mutedForeground },
  muted: { ...typography.caption, color: colors.mutedForeground },
});
