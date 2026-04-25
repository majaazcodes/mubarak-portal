import { Camera } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { SafeScreen } from "../../src/components/ui/safe-screen";
import { colors, radius, spacing, typography } from "../../src/lib/theme";

export default function ScanScreen(): React.JSX.Element {
  return (
    <SafeScreen>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Camera color={colors.mutedForeground} size={32} />
        </View>
        <Text style={styles.title}>QR scanner coming soon</Text>
        <Text style={styles.subtitle}>
          The pilgrim QR scanner will land in Prompt #10 with offline-first scan
          logging.
        </Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h2, color: colors.foreground, textAlign: "center" },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
