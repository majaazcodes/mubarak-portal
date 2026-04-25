import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, spacing } from "../../lib/theme";

export function Card({
  style,
  children,
  ...rest
}: ViewProps): React.JSX.Element {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
