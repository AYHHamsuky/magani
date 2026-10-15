import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth";
import { useSync } from "@/sync";
import { SyncStrip } from "@/SyncStrip";
import { Blister, Btn, H1, Row, T, s } from "@/ui";
import { color } from "@/theme";

const DAY = 86_400_000;

export default function Today() {
  const { session, logout } = useAuth();
  const { snapshot, syncing, sync, notices, clearNotices, reset } = useSync();
  const products = snapshot?.products ?? [];
  const out = products.filter((p) => p.health === "out");
  const low = products.filter((p) => p.health === "low");
  const refills = (snapshot?.patients ?? []).flatMap((pt) =>
    pt.refillPlans
      .filter((r) => new Date(r.nextDueDate).getTime() - Date.now() < 3 * DAY)
      .map((r) => ({ ...r, patient: pt.name })),
  );
  const ncd = products.filter((p) => p.isNcd).sort((a, b) => (a.cover ?? 999) - (b.cover ?? 999));

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <SyncStrip />
      <ScrollView refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} />} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ padding: 20, gap: 6 }}>
          <T soft>{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</T>
          <H1>{session?.pharmacy.name || "Today"}</H1>
          <T soft>
            {out.length} out of stock, {low.length} running low, {refills.length} refill{refills.length === 1 ? "" : "s"} due.
          </T>
        </View>

        {notices.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 10, backgroundColor: color.amberTint, gap: 6 }}>
            {notices.map((n, i) => <T key={i}>{n}</T>)}
            <Btn quiet label="Dismiss" onPress={clearNotices} />
          </View>
        )}

        {[...out, ...low].length > 0 && (
          <>
            <T bold style={{ paddingHorizontal: 20, paddingBottom: 8 }}>Restock</T>
            {[...out, ...low].map((p) => (
              <Row key={p.id}>
                <T bold>{p.name} {p.strength}</T>
                <Blister cover={p.cover} health={p.health} />
              </Row>
            ))}
          </>
        )}

        {refills.length > 0 && (
          <>
            <T bold style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>Refills due</T>
            {refills.map((r) => (
              <Row key={r.id}>
                <T bold>{r.patient}</T>
                <T soft>
                  {r.product.name}, {new Date(r.nextDueDate) < new Date() ? "overdue" : `due ${new Date(r.nextDueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`}
                </T>
              </Row>
            ))}
          </>
        )}

        <T bold style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>Chronic-care medicines</T>
        {ncd.length === 0 ? (
          <T soft style={{ paddingHorizontal: 20 }}>None marked yet. Mark them on the web app.</T>
        ) : (
          ncd.map((p) => (
            <Row key={p.id}>
              <T bold>{p.name} {p.strength}</T>
              <Blister cover={p.cover} health={p.health} />
            </Row>
          ))
        )}

        <View style={{ padding: 20 }}>
          <Btn quiet label="Sign out" onPress={async () => { await reset(); await logout(); }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
