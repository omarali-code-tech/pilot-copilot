import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, ReactNode } from "react";
import {
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from "react-native";
import { colors, radius } from "../theme";
import FadeInView from "./FadeInView";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>
        <FadeInView style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </FadeInView>
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.card,
        accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Field({
  label,
  containerStyle,
  style,
  ...props
}: TextInputProps & { label?: string; containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, style]}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnGhost,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={primary ? colors.bg : colors.accent}
        />
      ) : null}
      <Text
        style={[styles.btnText, { color: primary ? colors.bg : colors.accent }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.muted,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [{ padding: 6 }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  icon,
  color = colors.muted,
}: {
  label: string;
  icon?: IconName;
  color?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "26" }]}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export function StatTile({
  icon,
  value,
  label,
  style,
}: {
  icon: IconName;
  value: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tile, style]}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 10,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: radius.md,
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnGhost: { borderWidth: 1, borderColor: colors.accent },
  btnText: { fontWeight: "800", fontSize: 15 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  tileValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  tileLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
