import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { naira, type StockRow } from "@magani/shared";
import { useSync } from "@/sync";
import { SyncStrip } from "@/SyncStrip";
import { Btn, Input, T, s } from "@/ui";
import { color } from "@/theme";

export default function Sell() {
  const { snapshot, sell } = useSync();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, { p: StockRow; n: number }>>({});
  const [done, setDone] = useState<string | null>(null);

  const list = useMemo(
    () => (snapshot?.products ?? []).filter((p) => `${p.name} ${p.genericName ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [snapshot, q],
  );
  const lines = Object.values(cart);
  const total = lines.reduce((a, l) => a + l.p.priceKobo * l.n, 0);

  const bump = (p: StockRow, d: number) =>
    setCart((c) => {
      const n = (c[p.id]?.n ?? 0) + d;
      const next = { ...c };
      if (n <= 0) delete next[p.id];
      else next[p.id] = { p, n };
      return next;
    });

  async function record() {
    await sell({ items: lines.map((l) => ({ productId: l.p.id, quantity: l.n, priceKobo: l.p.priceKobo })) });
    setDone(`Recorded ${naira(total)}`);
    setCart({});
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <SyncStrip />
      <View style={{ padding: 16 }}>
        <Input label="Find a product" value={q} onChangeText={(t) => { setQ(t); setDone(null); }} placeholder="Name or generic" />
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => {
          const n = cart[p.id]?.n ?? 0;
          return (
            <View style={[s.row, { flexDirection: "row", alignItems: "center" }]}>
              <View style={{ flex: 1 }}>
                <T bold>{p.name} {p.strength}</T>
                <T soft>{naira(p.priceKobo)}, {p.onHand > 0 ? `${p.onHand} in stock` : "out of stock"}</T>
              </View>
              {n > 0 && (
                <Pressable onPress={() => bump(p, -1)} style={stepper} accessibilityLabel="One less"><T bold>−</T></Pressable>
              )}
              {n > 0 && <T bold style={{ width: 32, textAlign: "center" }}>{n}</T>}
              <Pressable onPress={() => bump(p, 1)} style={[stepper, n === 0 && { backgroundColor: color.ink }]} accessibilityLabel="Add one">
                <T bold style={n === 0 ? { color: color.white } : undefined}>+</T>
              </Pressable>
            </View>
          );
        }}
      />
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.white, gap: 10 }}>
        {done && <T style={{ color: color.leaf }} bold>{done}</T>}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T soft>{lines.length} item{lines.length === 1 ? "" : "s"}</T>
          <T bold style={{ fontSize: 22 }}>{naira(total)}</T>
        </View>
        <Btn label="Record sale" onPress={record} disabled={!lines.length} />
      </View>
    </SafeAreaView>
  );
}

const stepper = { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: color.line, alignItems: "center" as const, justifyContent: "center" as const };
