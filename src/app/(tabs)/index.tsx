import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import FadeInView from "../../components/FadeInView";
import {
  Button,
  Card,
  Chip,
  Field,
  IconButton,
  Screen,
  SectionTitle,
  StatTile,
} from "../../components/ui";
import { todayString } from "../../lib/currency";
import { fromRow } from "../../lib/flights";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme";
import { Flight } from "../../types/flight";

export default function LogbookScreen() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayString());
  const [aircraft, setAircraft] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [total, setTotal] = useState("");
  const [night, setNight] = useState("");
  const [landings, setLandings] = useState("");
  const [nightLandings, setNightLandings] = useState("");
  const [error, setError] = useState("");

  const loadFlights = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("flights")
      .select("*")
      .order("date", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    const rows = (data ?? []).map(fromRow);
    setFlights(rows);
    // Remember the last aircraft you flew
    setAircraft((prev) => prev || rows[0]?.aircraft || "");
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFlights();
    }, [loadFlights]),
  );

  async function addFlight() {
    const totalHours = parseFloat(total);
    const nightHours = parseFloat(night || "0");
    const landingCount = parseInt(landings || "0", 10);
    const nightLandingCount = parseInt(nightLandings || "0", 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Date must look like 2026-10-14");
      return;
    }
    if (!aircraft.trim() || !from.trim() || !to.trim()) {
      setError("Aircraft, From and To are required");
      return;
    }
    if (isNaN(totalHours) || totalHours <= 0) {
      setError("Total hours must be a number above 0");
      return;
    }
    if (isNaN(nightHours) || nightHours < 0 || nightHours > totalHours) {
      setError("Night hours can't be more than total hours");
      return;
    }
    if (isNaN(landingCount) || landingCount < 0) {
      setError("Landings must be 0 or more");
      return;
    }
    if (
      isNaN(nightLandingCount) ||
      nightLandingCount < 0 ||
      nightLandingCount > landingCount
    ) {
      setError("Night landings can't be more than total landings");
      return;
    }

    const { error: insertError } = await supabase.from("flights").insert({
      date,
      aircraft: aircraft.trim().toUpperCase(),
      from_airport: from.trim().toUpperCase(),
      to_airport: to.trim().toUpperCase(),
      total_hours: totalHours,
      night_hours: nightHours,
      landings: landingCount,
      night_landings: nightLandingCount,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await loadFlights();
    setFrom("");
    setTo("");
    setTotal("");
    setNight("");
    setLandings("");
    setNightLandings("");
    setError("");
    setShowForm(false);
  }

  async function deleteFlight(id: string) {
    const { error: deleteError } = await supabase
      .from("flights")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setFlights((current) => current.filter((f) => f.id !== id));
  }

  const totalHours = flights.reduce((s, f) => s + f.totalHours, 0);
  const nightHoursSum = flights.reduce((s, f) => s + f.nightHours, 0);
  const landingsSum = flights.reduce((s, f) => s + f.landings, 0);

  return (
    <Screen
      title="Logbook"
      subtitle="Every flight, in one place"
      right={
        <IconButton
          icon="log-out-outline"
          onPress={() => supabase.auth.signOut()}
        />
      }
    >
      <FadeInView delay={100} style={styles.tiles}>
        <StatTile
          icon="airplane-outline"
          value={String(flights.length)}
          label="Flights"
        />
        <StatTile
          icon="time-outline"
          value={totalHours.toFixed(1)}
          label="Total hrs"
        />
        <StatTile
          icon="moon-outline"
          value={nightHoursSum.toFixed(1)}
          label="Night hrs"
        />
        <StatTile
          icon="arrow-down-circle-outline"
          value={String(landingsSum)}
          label="Landings"
        />
      </FadeInView>

      <Button
        title={showForm ? "Cancel" : "Log a flight"}
        icon={showForm ? "close" : "add"}
        variant={showForm ? "ghost" : "primary"}
        onPress={() => {
          setShowForm(!showForm);
          setError("");
        }}
      />

      {showForm && (
        <FadeInView style={{ marginTop: 12 }}>
          <Card>
            <Field
              label="Date"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
            />
            <Field
              label="Aircraft"
              placeholder="N172SP"
              autoCapitalize="characters"
              value={aircraft}
              onChangeText={setAircraft}
            />
            <View style={styles.row}>
              <Field
                containerStyle={{ flex: 1 }}
                label="From"
                placeholder="KFDK"
                autoCapitalize="characters"
                value={from}
                onChangeText={setFrom}
              />
              <Field
                containerStyle={{ flex: 1 }}
                label="To"
                placeholder="KHGR"
                autoCapitalize="characters"
                value={to}
                onChangeText={setTo}
              />
            </View>
            <View style={styles.row}>
              <Field
                containerStyle={{ flex: 1 }}
                label="Total hrs"
                placeholder="1.2"
                keyboardType="decimal-pad"
                value={total}
                onChangeText={setTotal}
              />
              <Field
                containerStyle={{ flex: 1 }}
                label="Night hrs"
                placeholder="0"
                keyboardType="decimal-pad"
                value={night}
                onChangeText={setNight}
              />
            </View>
            <View style={styles.row}>
              <Field
                containerStyle={{ flex: 1 }}
                label="Landings"
                placeholder="0"
                keyboardType="number-pad"
                value={landings}
                onChangeText={setLandings}
              />
              <Field
                containerStyle={{ flex: 1 }}
                label="Night full-stop"
                placeholder="0"
                keyboardType="number-pad"
                value={nightLandings}
                onChangeText={setNightLandings}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Save flight" icon="checkmark" onPress={addFlight} />
          </Card>
        </FadeInView>
      )}

      {!showForm && error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionTitle>Recent flights</SectionTitle>

      {flights.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <Ionicons name="airplane-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>No flights yet</Text>
          <Text style={styles.emptyText}>
            Tap "Log a flight" to add your first one.
          </Text>
        </Card>
      ) : (
        flights.map((f, i) => (
          <FadeInView key={f.id} delay={Math.min(i, 8) * 60}>
            <Card>
              <View style={styles.routeRow}>
                <Text style={styles.icao}>{f.from}</Text>
                <View style={styles.routeLine}>
                  <View style={styles.dash} />
                  <Ionicons name="airplane" size={16} color={colors.accent} />
                  <View style={styles.dash} />
                </View>
                <Text style={styles.icao}>{f.to}</Text>
                <IconButton
                  icon="trash-outline"
                  size={18}
                  onPress={() => deleteFlight(f.id)}
                />
              </View>
              <View style={styles.chips}>
                <Chip icon="calendar-outline" label={f.date} />
                <Chip icon="airplane-outline" label={f.aircraft} />
                <Chip
                  icon="time-outline"
                  label={`${f.totalHours.toFixed(1)} h`}
                  color={colors.accent}
                />
                {f.nightHours > 0 && (
                  <Chip
                    icon="moon-outline"
                    label={`${f.nightHours.toFixed(1)} h night`}
                    color="#a78bfa"
                  />
                )}
                <Chip
                  icon="arrow-down-circle-outline"
                  label={`${f.landings} ldg${f.nightLandings ? ` (${f.nightLandings} night)` : ""}`}
                />
              </View>
            </Card>
          </FadeInView>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", gap: 10, marginBottom: 16 },
  row: { flexDirection: "row", gap: 10 },
  error: { color: colors.nogo, marginBottom: 10 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  icao: { color: colors.text, fontSize: 22, fontWeight: "800" },
  routeLine: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  dash: { flex: 1, height: 1, backgroundColor: colors.border },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyText: { color: colors.muted, marginTop: 4 },
});
