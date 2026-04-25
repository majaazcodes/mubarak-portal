import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { PressableProps, TextStyle, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "../../lib/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  disabled,
  style,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "destructive"
              ? colors.primaryForeground
              : colors.primary
          }
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, labelStyles[variant], labelSize[size]]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { ...typography.bodyBold },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md - 2 },
};

const labelSize: Record<Size, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.muted },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: colors.destructive },
};

const labelStyles: Record<Variant, TextStyle> = {
  primary: { color: colors.primaryForeground },
  secondary: { color: colors.foreground },
  outline: { color: colors.foreground },
  ghost: { color: colors.foreground },
  destructive: { color: colors.destructiveForeground },
};
