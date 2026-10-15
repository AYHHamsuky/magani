import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/auth";
import { SyncProvider } from "@/sync";
import { color, font } from "@/theme";

export default function TabsLayout() {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  return (
    <SyncProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.ink,
          tabBarInactiveTintColor: color.inkSoft,
          tabBarStyle: { borderTopColor: color.line, height: 62, paddingBottom: 10 },
          tabBarLabelStyle: { fontFamily: font.bold, fontSize: 13 },
          tabBarIconStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Today" }} />
        <Tabs.Screen name="sell" options={{ title: "Sell" }} />
        <Tabs.Screen name="stock" options={{ title: "Stock" }} />
        <Tabs.Screen name="patients" options={{ title: "Patients" }} />
      </Tabs>
    </SyncProvider>
  );
}
