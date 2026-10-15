import { Pressable, Text } from "react-native";
import { useSync } from "./sync";
import { color, font } from "./theme";

/** Always-visible sync status: the pharmacist must know whether today's sales are saved online. */
export function SyncStrip() {
  const { online, pending, syncing, sync } = useSync();
  const [bg, fg, text] = !online
    ? [color.amberTint, color.ink, pending ? `Offline. ${pending} change${pending > 1 ? "s" : ""} saved on this phone.` : "Offline. Sales still record on this phone."]
    : syncing
      ? [color.mist, color.inkSoft, "Syncing…"]
      : pending
        ? [color.amberTint, color.ink, `${pending} change${pending > 1 ? "s" : ""} waiting. Tap to sync.`]
        : [color.leafTint, color.ink, "All changes synced"];
  return (
    <Pressable onPress={() => void sync()} style={{ backgroundColor: bg, paddingHorizontal: 16, paddingVertical: 8 }} accessibilityRole="button">
      <Text style={{ fontFamily: font.bold, color: fg, fontSize: 14 }}>{text}</Text>
    </Pressable>
  );
}
