import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { colors } from "../theme";

const SIZE = 160;

type Props = {
  windDir: number | "VRB" | null;
  speed: number | null;
  runway: number | null; // runway heading in degrees, or null
};

export default function WindCompass({ windDir, speed, runway }: Props) {
  const v = useRef(new Animated.Value(0)).current;
  const hasArrow = typeof windDir === "number" && (speed ?? 0) > 0;
  const target = hasArrow ? ((windDir as number) + 180) % 360 : 0;

  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [v, target]);

  const rotate = v.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${target}deg`],
  });

  return (
    <View style={styles.ring}>
      <Text style={[styles.dir, { top: 6, alignSelf: "center" }]}>N</Text>
      <Text style={[styles.dir, { bottom: 6, alignSelf: "center" }]}>S</Text>
      <Text style={[styles.dir, { left: 10, top: SIZE / 2 - 8 }]}>W</Text>
      <Text style={[styles.dir, { right: 10, top: SIZE / 2 - 8 }]}>E</Text>

      {runway !== null && (
        <View
          style={[styles.runway, { transform: [{ rotate: `${runway}deg` }] }]}
        />
      )}

      {hasArrow ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.center,
            { transform: [{ rotate }] },
          ]}
        >
          <Ionicons name="arrow-up" size={64} color={colors.accent} />
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.centerText}>
            {windDir === "VRB" ? "VRB" : "CALM"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignSelf: "center",
  },
  dir: {
    position: "absolute",
    color: colors.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  center: { alignItems: "center", justifyContent: "center" },
  centerText: { color: colors.text, fontWeight: "800", fontSize: 18 },
  runway: {
    position: "absolute",
    left: SIZE / 2 - 7,
    top: 22,
    width: 14,
    height: SIZE - 44,
    borderRadius: 3,
    backgroundColor: "#3b4a68",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
