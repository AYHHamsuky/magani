import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import type { ReceiveInput, SaleInput, StockRow, SyncOp } from "@magani/shared";
import { stockHealth, daysOfCover } from "@magani/shared";
import { api } from "./api";

export interface MobilePatient {
  id: string;
  name: string;
  phone: string;
  refillPlans: { id: string; productId: string; quantityPerRefill: number; intervalDays: number; nextDueDate: string; product: { name: string; priceKobo: number } }[];
}
interface Snapshot { products: StockRow[]; patients: MobilePatient[]; pulledAt: string }

interface SyncCtx {
  snapshot: Snapshot | null;
  pending: number;
  online: boolean;
  syncing: boolean;
  notices: string[];
  sell: (s: Omit<SaleInput, "id">) => Promise<void>;
  receive: (r: Omit<ReceiveInput, "id">) => Promise<void>;
  sync: () => Promise<void>;
  clearNotices: () => void;
  reset: () => Promise<void>;
}

const SNAP = "magani.snapshot";
const OUTBOX = "magani.outbox";
const Ctx = createContext<SyncCtx | null>(null);

/** Apply a local change to cached stock so the screen reflects it before sync. */
function applyLocal(s: Snapshot, productId: string, delta: number): Snapshot {
  return {
    ...s,
    products: s.products.map((p) => {
      if (p.id !== productId) return p;
      const onHand = Math.max(0, p.onHand + delta);
      const cover = daysOfCover(onHand, p.perDay);
      return { ...p, onHand, cover: cover === null ? null : Math.round(cover), health: stockHealth(onHand, p.reorderLevel, cover) };
    }),
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [outbox, setOutbox] = useState<SyncOp[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const busy = useRef(false);
  const outboxRef = useRef<SyncOp[]>([]);

  const persist = async (snap: Snapshot | null, ops: SyncOp[]) => {
    outboxRef.current = ops;
    setOutbox(ops);
    await AsyncStorage.setItem(OUTBOX, JSON.stringify(ops));
    if (snap) {
      setSnapshot(snap);
      await AsyncStorage.setItem(SNAP, JSON.stringify(snap));
    }
  };

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      const ops = outboxRef.current;
      if (ops.length) {
        const { results } = await api<{ results: { id: string; status: string; warnings?: string[]; error?: string }[] }>(
          "/sync/push",
          { ops },
        );
        const msgs = results.flatMap((r) => (r.status === "failed" ? [`Not synced: ${r.error}`] : r.warnings ?? []));
        if (msgs.length) setNotices((n) => [...n, ...msgs]);
        // Every answered op leaves the queue; failures are reported above so they don't block it forever
        const answered = new Set(results.map((r) => r.id));
        await persist(null, outboxRef.current.filter((o) => !answered.has(o.payload.id)));
      }
      const snap = await api<Snapshot>("/sync/pull");
      await persist(snap, outboxRef.current);
    } catch {
      // offline or server unreachable: keep the outbox for next time
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [s, o] = await Promise.all([AsyncStorage.getItem(SNAP), AsyncStorage.getItem(OUTBOX)]);
      if (s) setSnapshot(JSON.parse(s));
      outboxRef.current = o ? JSON.parse(o) : [];
      setOutbox(outboxRef.current);
      void sync();
    })();
    return NetInfo.addEventListener((st) => {
      const isOn = !!st.isConnected && st.isInternetReachable !== false;
      setOnline(isOn);
      if (isOn) void sync();
    });
  }, [sync]);

  const enqueue = async (op: SyncOp, productDeltas: [string, number][]) => {
    let snap = snapshot;
    if (snap) for (const [id, d] of productDeltas) snap = applyLocal(snap, id, d);
    await persist(snap, [...outboxRef.current, op]);
    if (online) void sync();
  };

  return (
    <Ctx.Provider
      value={{
        snapshot,
        pending: outbox.length,
        online,
        syncing,
        notices,
        clearNotices: () => setNotices([]),
        sync,
        sell: (s) =>
          enqueue(
            { type: "sale", payload: { ...s, id: Crypto.randomUUID(), soldAt: new Date() } },
            s.items.map((i) => [i.productId, -i.quantity]),
          ),
        receive: (r) => enqueue({ type: "receive", payload: { ...r, id: Crypto.randomUUID() } }, [[r.productId, r.quantity]]),
        reset: async () => {
          await AsyncStorage.multiRemove([SNAP, OUTBOX]);
          outboxRef.current = [];
          setOutbox([]);
          setSnapshot(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSync = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSync outside SyncProvider");
  return c;
};
