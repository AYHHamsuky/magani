import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth";
import { ApiError } from "@/api";
import { Btn, H1, Input, T, s } from "@/ui";
import { color } from "@/theme";

export default function Login() {
  const { login, session } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login({ phone: phone.trim(), password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  if (session) return <Redirect href="/" />;

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={{ width: 26, height: 14, borderRadius: 99, backgroundColor: i < 4 ? color.leaf : color.line }} />
          ))}
        </View>
        <H1>Magani</H1>
        <T soft>Sign in with the phone number your pharmacy registered.</T>
        {error && <T style={{ color: color.brick }}>{error}</T>}
        <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08031234567" autoComplete="tel" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <Btn label={busy ? "Please wait…" : "Sign in"} onPress={submit} disabled={busy || !phone || !password} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
