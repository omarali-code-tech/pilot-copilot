import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import { colors, radius } from "../theme";

const NATIVE = Platform.OS !== "web";

// If your plane points up instead of right, set this to 90
const PLANE_BASE_DEG = 0;

type CloudProps = {
  top: number;
  size: number;
  duration: number;
  startAt: number; // 0 to 1, where in its path the cloud begins
  opacity: number;
  width: number;
};

function Cloud({ top, size, duration, startAt, opacity, width }: CloudProps) {
  const v = useRef(new Animated.Value(startAt)).current;

  useEffect(() => {
    let stopped = false;
    const run = (from: number) => {
      v.setValue(from);
      Animated.timing(v, {
        toValue: 1,
        duration: duration * (1 - from),
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }).start(({ finished }) => {
        if (finished && !stopped) run(0);
      });
    };
    run(startAt);
    return () => {
      stopped = true;
      v.stopAnimation();
    };
  }, [v, duration, startAt]);

  const translateX = v.interpolate({
    inputRange: [0, 1],
    outputRange: [width + 20, -size - 20],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        opacity,
        transform: [{ translateX }],
      }}
    >
      <Ionicons name="cloud" size={size} color="#ffffff" />
    </Animated.View>
  );
}

function Plane() {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -10],
  });
  const rotate = v.interpolate({
    inputRange: [0, 1],
    outputRange: [`${PLANE_BASE_DEG + 4}deg`, `${PLANE_BASE_DEG - 4}deg`],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
      <Ionicons name="airplane" size={84} color={colors.accent} />
    </Animated.View>
  );
}

export default function SkyHero({ height = 220 }: { height?: number }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, 800) - 48; // matches the screen padding

  return (
    <View style={[styles.sky, { height }]}>
      <Cloud
        top={18}
        size={60}
        duration={26000}
        startAt={0.1}
        opacity={0.18}
        width={cardWidth}
      />
      <Cloud
        top={height - 70}
        size={90}
        duration={34000}
        startAt={0.55}
        opacity={0.12}
        width={cardWidth}
      />
      <Cloud
        top={height / 2 - 60}
        size={44}
        duration={20000}
        startAt={0.8}
        opacity={0.25}
        width={cardWidth}
      />
      <Plane />
      <View style={styles.horizon} />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  horizon: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: colors.bg,
    opacity: 0.55,
  },
});
