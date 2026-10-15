import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import FadeInView from "../../components/FadeInView";
import { Button, Card, Field, Screen, SectionTitle } from "../../components/ui";
import { minimumsFromRow } from "../../lib/profile";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme";

const PRESETS = [
  { name: "Cautious", ceiling: "3000", vis: "5", wind: "15", xw: "7" },
  { name: "Standard", ceiling: "2500", vis: "5", wind: "20", xw: "10" },
  { name: "Experienced", ceiling: "1500", vis: "4", wind: "25", xw: "15" },
];

export default function MinimumsScreen() {
  const [ceiling, setCeiling] = useState("");
  const [vis, setVis] = useState("");
  const [wind, setWind] = useState("");
  const [crosswind, setCrosswind] = useState("");
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .maybeSingle();
        const m = minimumsFromRow(data);
        setCeiling(String(m.ceilingFt));
        setVis(String(m.visibilitySM));
        setWind(String(m.windKt));
        setCrosswind(String(m.crosswindKt));
      })();
    }, []),
  );

  async function save() {
    const c = parseInt(ceiling, 10);
    const v = parseFloat(vis);
    const w = parseInt(wind, 10);
    const x = parseInt(crosswind, 10);

    if (
      [c, v, w, x].some((n) => isNaN(n)) ||
      c < 0 ||
      v < 0 ||
      w <= 0 ||
      x <= 0
    ) {
      setMessage("Enter valid numbers. Wind limits must be above 0.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("You're signed out. Please sign in again.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      min_ceiling_ft: c,
      min_visibility_sm: v,
      max_wind_kt: w,
      max_crosswind_kt: x,
    });
    setMessage(error ? error.message : "Saved");
  }

  return (
    <Screen
      title="Minimums"
      subtitle="Your own limits. The Weather tab checks against these."
    >
      <FadeInView delay={100}>
        <SectionTitle>Quick start</SectionTitle>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              title={p.name}
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                setCeiling(p.ceiling);
                setVis(p.vis);
                setWind(p.wind);
                setCrosswind(p.xw);
                setMessage("");
              }}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Starting points only. Adjust them to your experience, aircraft, and
          comfort.
        </Text>
      </FadeInView>

      <FadeInView delay={200}>
        <SectionTitle>Your limits</SectionTitle>
        <Card>
          <View style={styles.row}>
            <Field
              containerStyle={{ flex: 1 }}
              label="Min ceiling (ft)"
              keyboardType="number-pad"
              value={ceiling}
              onChangeText={setCeiling}
            />
            <Field
              containerStyle={{ flex: 1 }}
              label="Min visibility (SM)"
              keyboardType="decimal-pad"
              value={vis}
              onChangeText={setVis}
            />
          </View>
          <View style={styles.row}>
            <Field
              containerStyle={{ flex: 1 }}
              label="Max wind + gusts (kt)"
              keyboardType="number-pad"
              value={wind}
              onChangeText={setWind}
            />
            <Field
              containerStyle={{ flex: 1 }}
              label="Max crosswind (kt)"
              keyboardType="number-pad"
              value={crosswind}
              onChangeText={setCrosswind}
            />
          </View>

          <View style={styles.summary}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.accent}
            />
            <Text style={styles.summaryText}>
              I fly only when the ceiling is at least {ceiling || "--"} ft,
              visibility at least {vis || "--"} SM, wind and gusts at most{" "}
              {wind || "--"} kt, and crosswind at most {crosswind || "--"} kt.
            </Text>
          </View>

          {message ? (
            <Text
              style={[
                styles.message,
                message !== "Saved" && { color: colors.nogo },
              ]}
            >
              {message}
            </Text>
          ) : null}
          <Button title="Save minimums" icon="checkmark" onPress={save} />
        </Card>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: "row", gap: 10 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  row: { flexDirection: "row", gap: 10 },
  summary: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  summaryText: { flex: 1, color: colors.text, lineHeight: 20 },
  message: { color: colors.muted, marginBottom: 10 },
});
