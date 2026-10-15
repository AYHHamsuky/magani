import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import type { StockHealth } from "@magani/shared";
import { color, font } from "./theme";

export function H1({ children }: { children: ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}
export function T({ children, soft, bold, style }: { children: ReactNode; soft?: boolean; bold?: boolean; style?: object }) {
  return <Text style={[s.t, soft && { color: color.inkSoft }, bold && { fontFamily: font.bold }, style]}>{children}</Text>;
}

export function Btn({ label, onPress, quiet, disabled }: { label: string; onPress: () => void; quiet?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, quiet && s.btnQuiet, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[s.btnText, quiet && { color: color.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Input({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T bold>{label}</T>
      <TextInput placeholderTextColor={color.inkSoft} {...p} style={s.input} />
    </View>
  );
}

const fill: Record<StockHealth, string> = { ok: color.leaf, low: color.amber, out: color.brick };

export function Blister({ cover, health }: { cover: number | null; health: StockHealth }) {
  const filled = cover === null ? 0 : Math.min(10, Math.ceil(cover / 3));
  const label = health === "out" ? "Out of stock" : cover === null ? "No recent sales" : cover > 30 ? "30+ days left" : `${cover} days left`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityLabel={label}>
      <View style={s.pack}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[s.cap, i < filled ? { backgroundColor: fill[health] } : s.capEmpty]} />
        ))}
      </View>
      <T soft={health !== "out"} bold={health === "out"} style={health === "out" ? { color: color.brick } : undefined}>
        {label}
      </T>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

export const s = StyleSheet.create({
  h1: { fontFamily: font.display, fontSize: 32, color: color.ink, letterSpacing: -0.5 },
  t: { fontFamily: font.body, fontSize: 16, color: color.ink },
  btn: { backgroundColor: color.ink, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  btnQuiet: { backgroundColor: "transparent", borderWidth: 1, borderColor: color.line },
  btnText: { fontFamily: font.bold, fontSize: 16, color: color.white },
  input: {
    fontFamily: font.body, fontSize: 17, color: color.ink, backgroundColor: color.white,
    borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  pack: { flexDirection: "row", flexWrap: "wrap", width: 5 * 24 + 4 * 4 + 10, gap: 4, padding: 4, borderRadius: 8, borderWidth: 1, borderColor: color.line, backgroundColor: color.white },
  cap: { width: 24, height: 13, borderRadius: 99 },
  capEmpty: { borderWidth: 1, borderStyle: "dashed", borderColor: color.line, backgroundColor: color.paper },
  row: { backgroundColor: color.white, borderBottomWidth: 1, borderColor: color.line, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  screen: { flex: 1, backgroundColor: color.paper },
});
