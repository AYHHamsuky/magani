import { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { StockRow } from "@magani/shared";
import { useSync } from "@/sync";
import { SyncStrip } from "@/SyncStrip";
import { Blister, Btn, H1, Input, T, s } from "@/ui";

export default function Stock() {
  const { snapshot, receive } = useSync();
  const [target, setTarget] = useState<StockRow | null>(null);
  const [form, setForm] = useState({ batchNo: "", expiry: "", quantity: "" });
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!target) return;
    const expiry = new Date(form.expiry);
    const quantity = Number(form.quantity);
    if (!form.batchNo || isNaN(expiry.getTime()) || !(quantity > 0)) {
      setErr("Enter a batch number, an expiry date as YYYY-MM-DD, and a quantity above zero.");
      return;
    }
    await receive({ productId: target.id, batchNo: form.batchNo, expiry, quantity, costKobo: 0 });
    setTarget(null);
    setForm({ batchNo: "", expiry: "", quantity: "" });
    setErr(null);
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <SyncStrip />
      <View style={{ padding: 20 }}><H1>Stock</H1><T soft>Tap a product to record a delivery.</T></View>
      <FlatList
        data={snapshot?.products ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => setTarget(p)} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <T bold>{p.name} {p.strength}  <T soft>{p.onHand} on hand</T></T>
            <Blister cover={p.cover} health={p.health} />
          </Pressable>
        )}
      />
      <Modal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTarget(null)}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} style={s.screen}>
          <H1>Receive {target?.name}</H1>
          {err && <T style={{ color: "#B3362B" }}>{err}</T>}
          <Input label="Batch number" value={form.batchNo} onChangeText={(v) => setForm({ ...form, batchNo: v })} autoCapitalize="characters" />
          <Input label="Expiry date" value={form.expiry} onChangeText={(v) => setForm({ ...form, expiry: v })} placeholder="2027-06-30" />
          <Input label="Quantity received" value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} keyboardType="number-pad" />
          <Btn label="Record delivery" onPress={save} />
          <Btn quiet label="Cancel" onPress={() => setTarget(null)} />
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
