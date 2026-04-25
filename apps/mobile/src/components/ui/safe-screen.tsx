import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../../lib/theme";

interface SafeScreenProps {
  children: React.ReactNode;
  // Default screens get horizontal padding; immersive screens (e.g. a future
  // QR scanner that paints to the edge) can opt out with edges={false}.
  padded?: boolean;
  style?: ViewStyle;
}

export function SafeScreen({
  children,
  padded = true,
  style,
}: SafeScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.lg },
});
