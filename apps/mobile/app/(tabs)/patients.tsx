import { useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/api";
import { useSync } from "@/sync";
import { SyncStrip } from "@/SyncStrip";
import { Btn, H1, T, s } from "@/ui";
import { color } from "@/theme";

export default function Patients() {
  const { snapshot, online, sync } = useSync();
  const [msg, setMsg] = useState<string | null>(null);

  // Refill actions touch SMS and patient records, so they run online only.
  async function act(path: string, done: string) {
    try {
      const r = await api<{ warnings?: string[] }>(path, {});
      setMsg(r.warnings?.length ? r.warnings.join(" ") : done);
      await sync();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Could not reach the server");
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <SyncStrip />
      <View style={{ padding: 20, gap: 4 }}>
        <H1>Patients</H1>
        <T soft>{online ? "Record a collected refill or send a reminder." : "Connect to the internet to record refills or send reminders."}</T>
        {msg && <T bold style={{ color: color.leaf }}>{msg}</T>}
      </View>
      <FlatList
        data={snapshot?.patients ?? []}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<T soft style={{ paddingHorizontal: 20 }}>Add patients on the web app to see them here.</T>}
        renderItem={({ item: p }) => (
          <View style={s.row}>
            <T bold>{p.name}</T>
            <T soft>{p.phone}</T>
            {p.refillPlans.map((r) => {
              const overdue = new Date(r.nextDueDate) < new Date();
              return (
                <View key={r.id} style={{ marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: color.paper, gap: 8 }}>
                  <T>{r.product.name}, {r.quantityPerRefill} every {r.intervalDays} days</T>
                  <T bold style={{ color: overdue ? color.brick : color.inkSoft }}>
                    {overdue ? "Overdue" : "Due"} {new Date(r.nextDueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </T>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Btn quiet label="Remind" disabled={!online} onPress={() => act(`/refills/${r.id}/remind`, "Reminder sent")} /></View>
                    <View style={{ flex: 1 }}><Btn label="Collected" disabled={!online} onPress={() => act(`/refills/${r.id}/collect`, "Refill recorded")} /></View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
