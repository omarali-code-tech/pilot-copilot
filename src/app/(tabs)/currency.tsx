import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../lib/auth";
import {
  computeCurrency,
  CurrencyItem,
  Status,
  todayString,
} from "../../lib/currency";
import { fromRow } from "../../lib/flights";
import { supabase } from "../../lib/supabase";

const COLORS: Record<Status, string> = {
  current: "#1a9e3f",
  expiring: "#e0a100",
  expired: "#d00",
};

const LABELS: Record<Status, string> = {
  current: "CURRENT",
  expiring: "EXPIRING SOON",
  expired: "NOT CURRENT",
};

export default function CurrencyScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<CurrencyItem[]>([]);
  const [review, setReview] = useState("");
  const [medical, setMedical] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: flightRows, error: flightError } = await supabase
      .from("flights")
      .select("*");
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .maybeSingle();
    if (flightError) {
      setMessage(flightError.message);
      return;
    }

    setReview(profile?.last_flight_review ?? "");
    setMedical(profile?.medical_expiry ?? "");
    setItems(
      computeCurrency(
        (flightRows ?? []).map(fromRow),
        {
          lastFlightReview: profile?.last_flight_review ?? null,
          medicalExpiry: profile?.medical_expiry ?? null,
        },
        todayString(),
      ),
    );
  }, []);

  // Reload every time this tab is opened so new flights show up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function saveProfile() {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (review && !pattern.test(review)) ||
      (medical && !pattern.test(medical))
    ) {
      setMessage("Dates must look like 2026-10-14");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      user_id: session!.user.id,
      last_flight_review: review || null,
      medical_expiry: medical || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Saved");
    load();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Currency</Text>
      <Text style={styles.subtitle}>Based on your logbook, as of today</Text>

      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.card, { borderLeftColor: COLORS[item.status] }]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.status, { color: COLORS[item.status] }]}>
            {LABELS[item.status]}
          </Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
      ))}

      <Text style={styles.section}>Your dates</Text>
      <TextInput
        style={styles.input}
        placeholder="Last flight review (YYYY-MM-DD)"
        value={review}
        onChangeText={setReview}
      />
      <TextInput
        style={styles.input}
        placeholder="Medical expiry (YYYY-MM-DD)"
        value={medical}
        onChangeText={setMedical}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable style={styles.button} onPress={saveProfile}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f7" },
  content: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#666", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderLeftWidth: 6,
    padding: 14,
    marginBottom: 10,
  },
  label: { fontSize: 18, fontWeight: "bold" },
  status: { fontWeight: "700", marginTop: 2 },
  detail: { color: "#555", marginTop: 2 },
  section: { fontSize: 20, fontWeight: "bold", marginTop: 20, marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  message: { color: "#666", marginBottom: 8 },
  button: {
    backgroundColor: "#0a84ff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
