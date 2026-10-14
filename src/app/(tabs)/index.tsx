import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Flight } from "../../types/flight";

function fromRow(r: any): Flight {
  return {
    id: r.id,
    date: r.date,
    aircraft: r.aircraft,
    from: r.from_airport,
    to: r.to_airport,
    totalHours: Number(r.total_hours),
    nightHours: Number(r.night_hours),
    landings: r.landings,
  };
}

export default function LogbookScreen() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [date, setDate] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [total, setTotal] = useState("");
  const [night, setNight] = useState("");
  const [landings, setLandings] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadFlights();
  }, []);

  async function loadFlights() {
    const { data, error: loadError } = await supabase
      .from("flights")
      .select("*")
      .order("date", { ascending: false });
    if (loadError) setError(loadError.message);
    else setFlights((data ?? []).map(fromRow));
  }

  async function addFlight() {
    const totalHours = parseFloat(total);
    const nightHours = parseFloat(night || "0");
    const landingCount = parseInt(landings || "0", 10);

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

    const { error: insertError } = await supabase.from("flights").insert({
      date,
      aircraft: aircraft.trim().toUpperCase(),
      from_airport: from.trim().toUpperCase(),
      to_airport: to.trim().toUpperCase(),
      total_hours: totalHours,
      night_hours: nightHours,
      landings: landingCount,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await loadFlights();
    setDate("");
    setAircraft("");
    setFrom("");
    setTo("");
    setTotal("");
    setNight("");
    setLandings("");
    setError("");
  }

  async function deleteFlight(id: string) {
    const { error: deleteError } = await supabase
      .from("flights")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setFlights(flights.filter((f) => f.id !== id));
  }

  const totalLogged = flights.reduce((sum, f) => sum + f.totalHours, 0);

  const form = (
    <View style={styles.form}>
      <Text style={styles.title}>Logbook</Text>
      <Text style={styles.subtitle}>
        {flights.length} flights · {totalLogged.toFixed(1)} hours total
      </Text>

      <Pressable onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Aircraft (e.g. N172SP)"
        autoCapitalize="characters"
        value={aircraft}
        onChangeText={setAircraft}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="From (KFDK)"
          autoCapitalize="characters"
          value={from}
          onChangeText={setFrom}
        />
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="To (KHGR)"
          autoCapitalize="characters"
          value={to}
          onChangeText={setTo}
        />
      </View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.third]}
          placeholder="Total hrs"
          keyboardType="decimal-pad"
          value={total}
          onChangeText={setTotal}
        />
        <TextInput
          style={[styles.input, styles.third]}
          placeholder="Night hrs"
          keyboardType="decimal-pad"
          value={night}
          onChangeText={setNight}
        />
        <TextInput
          style={[styles.input, styles.third]}
          placeholder="Landings"
          keyboardType="number-pad"
          value={landings}
          onChangeText={setLandings}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={addFlight}>
        <Text style={styles.buttonText}>Add flight</Text>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      data={flights}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={form}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No flights yet. Add your first one above.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.route}>
              {item.from} → {item.to}
            </Text>
            <Text style={styles.meta}>
              {item.date} · {item.aircraft}
            </Text>
            <Text style={styles.meta}>
              {item.totalHours.toFixed(1)} hrs · {item.nightHours.toFixed(1)}{" "}
              night · {item.landings} landings
            </Text>
          </View>
          <Pressable onPress={() => deleteFlight(item.id)}>
            <Text style={styles.delete}>Delete</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f7" },
  form: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#666", marginBottom: 16 },
  signOut: { color: "#d00", fontWeight: "600", marginBottom: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  third: { flex: 1 },
  error: { color: "#d00", marginBottom: 8 },
  button: {
    backgroundColor: "#0a84ff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
  },
  route: { fontSize: 18, fontWeight: "bold" },
  meta: { color: "#555", marginTop: 2 },
  delete: { color: "#d00", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 20 },
});
