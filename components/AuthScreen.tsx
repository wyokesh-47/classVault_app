import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Check the app .env values.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (signUpError) {
          throw signUpError;
        }
        if (data.session) {
          setNotice("Account created and signed in.");
        } else {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setIsSignUp(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          throw signInError;
        }
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CV</Text>
        </View>
        <Text style={styles.title}>{isSignUp ? "Create your account" : "Welcome to ClassVault"}</Text>
        <Text style={styles.subtitle}>Sign in to view and manage your real class groups.</Text>
        {isSignUp && (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            style={styles.input}
          />
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (at least 6 characters)"
          secureTextEntry
          autoComplete={isSignUp ? "new-password" : "current-password"}
          style={styles.input}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Pressable
          accessibilityRole="button"
          disabled={busy || !email.trim() || password.length < 6 || (isSignUp && !displayName.trim())}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, (busy || !email.trim() || password.length < 6 || (isSignUp && !displayName.trim())) && styles.disabled]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{isSignUp ? "Create account" : "Sign in"}</Text>}
        </Pressable>
        <Pressable onPress={() => { setIsSignUp((value) => !value); setError(null); setNotice(null); }}>
          <Text style={styles.toggle}>
            {isSignUp ? "Already have an account? Sign in" : "New to ClassVault? Create an account"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "#F4F6FC" },
  card: { width: "100%", maxWidth: 440, alignSelf: "center", padding: 24, borderRadius: 24, backgroundColor: "#FFFFFF", gap: 13, elevation: 5 },
  logo: { alignSelf: "center", width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: "#7557FF" },
  logoText: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  title: { color: "#17213D", textAlign: "center", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#64708A", textAlign: "center", fontSize: 13, lineHeight: 19, marginBottom: 6 },
  input: { color: "#17213D", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: "#E2E6F0", backgroundColor: "#FAFBFE", fontSize: 14 },
  button: { minHeight: 48, justifyContent: "center", alignItems: "center", backgroundColor: "#7557FF", borderRadius: 14, marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  toggle: { color: "#6347E8", textAlign: "center", fontSize: 13, fontWeight: "700", paddingVertical: 8 },
  error: { color: "#BA2525", fontSize: 12, lineHeight: 17 },
  notice: { color: "#127A48", fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
