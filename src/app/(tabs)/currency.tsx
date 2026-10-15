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
  IconName,
  Screen,
  SectionTitle,
} from "../../components/ui";
import {
  computeCurrency,
  CurrencyItem,
  Status,
  todayString,
} from "../../lib/currency";
import { fromRow } from "../../lib/flights";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme";

const STATUS_COLORS: Record<Status, string> = {
  current: colors.go,
  expiring: colors.caution,
  expired: colors.nogo,
};

const STATUS_LABELS: Record<Status, string> = {
  current: "CURRENT",
  expiring: "EXPIRING SOON",
  expired: "NOT CURRENT",
};

const ITEM_ICONS: Record<string, IconName> = {
  "Day passengers": "sunny",
  "Night passengers": "moon",
  "Flight review": "school",
  Medical: "medkit",
};

function daysLeft(expires: string | null): number | null {
  if (!expires) return null;
  const [y, m, d] = expires.split("-").map(Number);
  const [ty, tm, td] = todayString().split("-").map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000,
  );
}

export default function CurrencyScreen() {
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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("You're signed out. Please sign in again.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
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

  const expired = items.filter((i) => i.status === "expired").length;
  const expiring = items.filter((i) => i.status === "expiring").length;
  const bannerColor = expired
    ? colors.nogo
    : expiring
      ? colors.caution
      : colors.go;
  const bannerIcon: IconName = expired
    ? "close-circle"
    : expiring
      ? "alert-circle"
      : "checkmark-circle";
  const bannerText =
    items.length === 0
      ? "Loading..."
      : expired
        ? `${expired} item${expired > 1 ? "s" : ""} not current`
        : expiring
          ? `${expiring} item${expiring > 1 ? "s" : ""} expiring soon`
          : "Everything is current";

  return (
    <Screen
      title="Currency"
      subtitle="Calculated from your logbook, as of today"
    >
      <FadeInView delay={100}>
        <Card
          style={[
            styles.banner,
            { borderColor: bannerColor, backgroundColor: bannerColor + "1f" },
          ]}
        >
          <Ionicons name={bannerIcon} size={32} color={bannerColor} />
          <Text style={[styles.bannerText, { color: bannerColor }]}>
            {bannerText}
          </Text>
        </Card>
      </FadeInView>

      {items.map((item, i) => {
        const color = STATUS_COLORS[item.status];
        const left = daysLeft(item.expires);
        return (
          <FadeInView key={item.label} delay={150 + i * 80}>
            <Card accent={color}>
              <View style={styles.itemRow}>
                <View
                  style={[styles.iconCircle, { backgroundColor: color + "26" }]}
                >
                  <Ionicons
                    name={ITEM_ICONS[item.label] ?? "ellipse"}
                    size={22}
                    color={color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.detail}>{item.detail}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Chip label={STATUS_LABELS[item.status]} color={color} />
                  {left !== null && left >= 0 && (
                    <Text style={styles.days}>{left} days left</Text>
                  )}
                </View>
              </View>
            </Card>
          </FadeInView>
        );
      })}

      <SectionTitle>Your dates</SectionTitle>
      <Card>
        <Field
          label="Last flight review"
          placeholder="YYYY-MM-DD"
          value={review}
          onChangeText={setReview}
        />
        <Field
          label="Medical expiry"
          placeholder="YYYY-MM-DD"
          value={medical}
          onChangeText={setMedical}
        />
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
        <Button title="Save dates" icon="checkmark" onPress={saveProfile} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerText: { fontSize: 18, fontWeight: "800" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.text, fontSize: 17, fontWeight: "700" },
  detail: { color: colors.muted, marginTop: 2, fontSize: 13 },
  days: { color: colors.muted, fontSize: 12 },
  message: { color: colors.muted, marginBottom: 10 },
});
