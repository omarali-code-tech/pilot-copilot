import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DecodedMetar,
  decodeMetar,
  describeWind,
  FlightCategory,
} from "../../lib/metar";
import { supabase } from "../../lib/supabase";

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: "#1a9e3f",
  MVFR: "#0a84ff",
  IFR: "#d00",
  LIFR: "#b000b0",
  UNKNOWN: "#888",
};

function minutesAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
}

export default function WeatherScreen() {
  const [input, setInput] = useState("");
  const [metar, setMetar] = useState<DecodedMetar | null>(null);
  const [taf, setTaf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(false);

    if (fnError) {
      setError(
        "Couldn't reach the weather function. Is it deployed and named 'weather'?",
      );
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    if (!data?.metar) {
      setError(
        `No METAR found for ${id}. Many small airports don't report one, so try a nearby larger airport.`,
      );
      return;
    }

    setMetar(decodeMetar(data.metar));
    setTaf(data.taf?.rawTAF ?? "");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weather</Text>
      <Text style={styles.subtitle}>
        Live METAR and TAF from aviationweather.gov
      </Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Airport ID (KFDK)"
          autoCapitalize="characters"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={lookup}
        />
        <Pressable style={styles.button} onPress={lookup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "..." : "Get"}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metar && (
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.station}>{metar.station}</Text>
              <Text style={styles.meta}>{metar.name}</Text>
              <Text style={styles.meta}>
                Observed {minutesAgo(metar.observedAt)}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: CATEGORY_COLORS[metar.category] },
              ]}
            >
              <Text style={styles.badgeText}>{metar.category}</Text>
            </View>
          </View>

          <Row label="Wind" value={describeWind(metar)} />
          <Row
            label="Visibility"
            value={
              metar.visibilitySM === null
                ? "Not reported"
                : `${metar.visibilitySM} SM`
            }
          />
          <Row
            label="Ceiling"
            value={
              metar.ceilingFt === null
                ? "None (no broken or overcast)"
                : `${metar.ceilingFt} ft`
            }
          />
          <Row label="Clouds" value={metar.clouds} />
          <Row
            label="Temp / Dewpoint"
            value={`${metar.tempC ?? "--"}°C / ${metar.dewpointC ?? "--"}°C`}
          />
          <Row
            label="Altimeter"
            value={
              metar.altimeterInHg === null
                ? "--"
                : `${metar.altimeterInHg.toFixed(2)} inHg`
            }
          />

          <Text style={styles.rawLabel}>Raw METAR</Text>
          <Text style={styles.raw}>{metar.raw}</Text>

          <Text style={styles.rawLabel}>Raw TAF</Text>
          <Text style={styles.raw}>
            {taf || "No TAF issued for this airport."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f7" },
  content: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#666", marginBottom: 16 },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  button: {
    backgroundColor: "#0a84ff",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  error: { color: "#d00", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  station: { fontSize: 26, fontWeight: "bold" },
  meta: { color: "#666" },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  dataLabel: { color: "#666" },
  dataValue: {
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  rawLabel: { fontWeight: "bold", marginTop: 16, marginBottom: 4 },
  raw: { fontFamily: "monospace", color: "#333" },
});
