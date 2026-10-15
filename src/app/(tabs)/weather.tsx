import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import FadeInView from "../../components/FadeInView";
import WindCompass from "../../components/WindCompass";
import {
  Button,
  Card,
  Chip,
  Field,
  IconName,
  Screen,
  SectionTitle,
  StatTile,
} from "../../components/ui";
import { computeCurrency, CurrencyItem, todayString } from "../../lib/currency";
import { fromRow } from "../../lib/flights";
import {
  assess,
  Assessment,
  DEFAULT_MINIMUMS,
  Level,
  Minimums,
  Verdict,
} from "../../lib/gonogo";
import {
  DecodedMetar,
  decodeMetar,
  describeWind,
  FlightCategory,
} from "../../lib/metar";
import { minimumsFromRow } from "../../lib/profile";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme";

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: "#22c55e",
  MVFR: "#38bdf8",
  IFR: "#ef4444",
  LIFR: "#d946ef",
  UNKNOWN: "#8a97b0",
};

const VERDICT_COLORS: Record<Verdict, string> = {
  GO: colors.go,
  CAUTION: colors.caution,
  "NO-GO": colors.nogo,
};

const VERDICT_ICONS: Record<Verdict, IconName> = {
  GO: "checkmark-circle",
  CAUTION: "alert-circle",
  "NO-GO": "close-circle",
};

const LEVEL_ICONS: Record<Level, IconName> = {
  ok: "checkmark-circle-outline",
  caution: "alert-circle-outline",
  nogo: "close-circle-outline",
};

const LEVEL_COLORS: Record<Level, string> = {
  ok: colors.go,
  caution: colors.caution,
  nogo: colors.nogo,
};

function minutesAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
}

function VerdictHero({ assessment }: { assessment: Assessment }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const color = VERDICT_COLORS[assessment.verdict];

  useEffect(() => {
    scale.setValue(0.6);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [scale, assessment.verdict]);

  const problems = assessment.reasons.filter((r) => r.level !== "ok").length;

  return (
    <Card style={{ borderColor: color, backgroundColor: color + "1a" }}>
      <Animated.View style={[styles.verdictRow, { transform: [{ scale }] }]}>
        <Ionicons
          name={VERDICT_ICONS[assessment.verdict]}
          size={56}
          color={color}
        />
        <View>
          <Text style={[styles.verdictText, { color }]}>
            {assessment.verdict}
          </Text>
          <Text style={styles.verdictSub}>
            {problems === 0
              ? "All checks passed"
              : `${problems} item${problems > 1 ? "s" : ""} to review`}
          </Text>
        </View>
      </Animated.View>

      {assessment.reasons.map((r, i) => (
        <View key={i} style={styles.reasonRow}>
          <Ionicons
            name={LEVEL_ICONS[r.level]}
            size={18}
            color={LEVEL_COLORS[r.level]}
          />
          <Text style={styles.reasonText}>{r.text}</Text>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        Decision aid only. Get an official briefing and use your own judgment as
        pilot in command.
      </Text>
    </Card>
  );
}

export default function WeatherScreen() {
  const [input, setInput] = useState("");
  const [metar, setMetar] = useState<DecodedMetar | null>(null);
  const [taf, setTaf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [minimums, setMinimums] = useState<Minimums>(DEFAULT_MINIMUMS);
  const [currencyItems, setCurrencyItems] = useState<CurrencyItem[]>([]);
  const [runway, setRunway] = useState("");
  const [passengers, setPassengers] = useState(false);

  const runwayNum = parseInt(runway, 10);
  const runwayHeading =
    runwayNum >= 1 && runwayNum <= 36 ? runwayNum * 10 : null;

  const assessment = useMemo(() => {
    if (!metar) return null;
    return assess({
      metar,
      minimums,
      runway: runwayHeading,
      currency: currencyItems,
      passengers,
      nowMs: Date.now(),
    });
  }, [metar, minimums, runwayHeading, currencyItems, passengers]);

  async function loadContext() {
    const { data: flightRows } = await supabase.from("flights").select("*");
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .maybeSingle();

    setMinimums(minimumsFromRow(profile));
    setCurrencyItems(
      computeCurrency(
        (flightRows ?? []).map(fromRow),
        {
          lastFlightReview: profile?.last_flight_review ?? null,
          medicalExpiry: profile?.medical_expiry ?? null,
        },
        todayString(),
      ),
    );
  }

  async function lookup() {
    let id = input.trim().toUpperCase();
    // US convenience: FDK becomes KFDK
    if (/^[A-Z]{3}$/.test(id)) id = "K" + id;

    setError("");
    setMetar(null);
    setTaf("");
    if (!/^[A-Z0-9]{4}$/.test(id)) {
      setError("Enter a 4-letter airport ID like KFDK.");
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "weather",
      {
        body: { ids: id },
      },
    );

    if (fnError) {
      setLoading(false);
      setError(
        "Couldn't reach the weather function. Is it deployed and named 'weather'?",
      );
      return;
    }
    if (data?.error) {
      setLoading(false);
      setError(data.error);
      return;
    }
    if (!data?.metar) {
      setLoading(false);
      setError(
        `No METAR found for ${id}. Many small airports don't report one, so try a nearby larger airport.`,
      );
      return;
    }

    await loadContext();
    setMetar(decodeMetar(data.metar));
    setTaf(data.taf?.rawTAF ?? "");
    setLoading(false);
  }

  return (
    <Screen
      title="Weather"
      subtitle="Live METAR and TAF, checked against your minimums"
    >
      <Card>
        <View style={styles.searchRow}>
          <Field
            containerStyle={{ flex: 1, marginBottom: 0 }}
            placeholder="Airport ID (KFDK)"
            autoCapitalize="characters"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={lookup}
          />
          <Button
            title={loading ? "..." : "Get"}
            icon="search"
            onPress={lookup}
            disabled={loading}
            style={{ minWidth: 100 }}
          />
        </View>

        <View
          style={[styles.searchRow, { marginTop: 12, alignItems: "center" }]}
        >
          <Field
            containerStyle={{ flex: 1, marginBottom: 0 }}
            placeholder="Runway in use (e.g. 23)"
            keyboardType="number-pad"
            value={runway}
            onChangeText={setRunway}
          />
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>Passengers</Text>
            <Switch value={passengers} onValueChange={setPassengers} />
          </View>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metar && assessment && (
        <>
          <FadeInView>
            <VerdictHero assessment={assessment} />
          </FadeInView>

          <FadeInView delay={150}>
            <Card>
              <View style={styles.stationRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.station}>{metar.station}</Text>
                  <Text style={styles.stationName}>{metar.name}</Text>
                  <Text style={styles.stationName}>
                    Observed {minutesAgo(metar.observedAt)}
                  </Text>
                </View>
                <Chip
                  label={metar.category}
                  color={CATEGORY_COLORS[metar.category]}
                />
              </View>

              <WindCompass
                windDir={metar.windDir}
                speed={metar.windSpeed}
                runway={runwayHeading}
              />
              <Text style={styles.windText}>{describeWind(metar)}</Text>
              {runwayHeading !== null && (
                <Text style={styles.runwayNote}>
                  Runway {String(runwayHeading / 10).padStart(2, "0")} shown on
                  the compass
                </Text>
              )}
            </Card>
          </FadeInView>

          <FadeInView delay={250}>
            <View style={styles.grid}>
              <StatTile
                style={styles.gridTile}
                icon="eye-outline"
                value={
                  metar.visibilitySM === null
                    ? "--"
                    : `${metar.visibilitySM} SM`
                }
                label="Visibility"
              />
              <StatTile
                style={styles.gridTile}
                icon="cloud-outline"
                value={
                  metar.ceilingFt === null ? "None" : `${metar.ceilingFt} ft`
                }
                label="Ceiling"
              />
              <StatTile
                style={styles.gridTile}
                icon="thermometer-outline"
                value={`${metar.tempC ?? "--"}° / ${metar.dewpointC ?? "--"}°`}
                label="Temp / Dewpoint"
              />
              <StatTile
                style={styles.gridTile}
                icon="speedometer-outline"
                value={
                  metar.altimeterInHg === null
                    ? "--"
                    : metar.altimeterInHg.toFixed(2)
                }
                label="Altimeter (inHg)"
              />
            </View>
            <Card>
              <Text style={styles.cloudLabel}>Clouds</Text>
              <Text style={styles.cloudValue}>{metar.clouds}</Text>
            </Card>
          </FadeInView>

          <FadeInView delay={350}>
            <SectionTitle>Raw reports</SectionTitle>
            <Card>
              <Text style={styles.rawLabel}>METAR</Text>
              <Text style={styles.raw}>{metar.raw}</Text>
              <Text style={[styles.rawLabel, { marginTop: 14 }]}>TAF</Text>
              <Text style={styles.raw}>
                {taf || "No TAF issued for this airport."}
              </Text>
            </Card>
          </FadeInView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  error: { color: colors.nogo, marginBottom: 12 },
  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  verdictText: { fontSize: 38, fontWeight: "900" },
  verdictSub: { color: colors.muted },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  reasonText: { flex: 1, color: colors.text },
  disclaimer: { color: colors.muted, fontSize: 12, marginTop: 16 },
  stationRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  station: { color: colors.text, fontSize: 28, fontWeight: "900" },
  stationName: { color: colors.muted },
  windText: {
    color: colors.text,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
  },
  runwayNote: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  gridTile: { flexBasis: "47%", flexGrow: 1 },
  cloudLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  cloudValue: { color: colors.text, fontWeight: "700", marginTop: 4 },
  rawLabel: { color: colors.accent, fontWeight: "800", marginBottom: 4 },
  raw: {
    color: colors.text,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
});
