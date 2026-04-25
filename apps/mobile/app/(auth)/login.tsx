import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LoginForm } from "../../src/components/auth/login-form";
import { SafeScreen } from "../../src/components/ui/safe-screen";
import { colors, spacing, typography } from "../../src/lib/theme";

export default function LoginScreen(): React.JSX.Element {
  return (
    <SafeScreen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.title}>Mubarak Travels</Text>
            <Text style={styles.subtitle}>Hajj 1447 / 2026 — operator app</Text>
          </View>

          <View style={styles.formWrap}>
            <Text style={styles.welcome}>Welcome back</Text>
            <Text style={styles.welcomeSub}>
              Sign in with your agency credentials.
            </Text>
            <View style={styles.spacer} />
            <LoginForm onSuccess={() => router.replace("/(tabs)")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
    gap: spacing["2xl"],
  },
  brand: { alignItems: "center", gap: spacing.sm },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoText: {
    color: colors.primaryForeground,
    fontSize: 32,
    fontWeight: "700",
  },
  title: { ...typography.h1, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground },
  formWrap: { width: "100%" },
  welcome: { ...typography.h2, color: colors.foreground },
  welcomeSub: { ...typography.body, color: colors.mutedForeground },
  spacer: { height: spacing.lg },
});
