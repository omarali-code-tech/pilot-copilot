import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FadeInView from "../components/FadeInView";
import SkyHero from "../components/SkyHero";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMessage("");
    if (!email.trim() || password.length < 6) {
      setMessage("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) setMessage(error.message);
      else if (!data.session)
        setMessage("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMessage(error.message);
    }

    setBusy(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>
        <FadeInView>
          <SkyHero />
        </FadeInView>

        <FadeInView delay={150}>
          <Text style={styles.title}>Pilot Copilot</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Create your account"
              : "Weather, currency, and a clear go/no-go"}
          </Text>
        </FadeInView>

        <FadeInView delay={300}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
            ]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
            </Text>
          </Pressable>

          <Pressable onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.link}>
              {isSignUp
                ? "Have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </FadeInView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  inner: { width: "100%", maxWidth: 480, alignSelf: "center" },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: 24,
  },
  subtitle: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    marginBottom: 12,
  },
  message: { color: colors.nogo, marginBottom: 12 },
  button: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
  link: { color: colors.accent, textAlign: "center", marginTop: 18 },
});
