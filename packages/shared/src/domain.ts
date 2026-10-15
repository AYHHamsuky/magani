export type StockHealth = "out" | "low" | "ok";

/** Exponentially smoothed daily demand. `daily` is oldest -> newest units sold per day. */
export function dailyDemand(daily: number[], alpha = 0.3): number {
  if (daily.length === 0) return 0;
  let level = daily.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(7, daily.length);
  for (const d of daily) level = alpha * d + (1 - alpha) * level;
  return Math.max(0, level);
}

export function daysOfCover(onHand: number, perDay: number): number | null {
  if (perDay <= 0) return null; // no recent sales: cover unknown
  return onHand / perDay;
}

export function stockHealth(onHand: number, reorderLevel: number, cover: number | null): StockHealth {
  if (onHand <= 0) return "out";
  if (onHand <= reorderLevel || (cover !== null && cover < 7)) return "low";
  return "ok";
}

export function naira(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function reminderText(opts: {
  language: "HAUSA" | "ENGLISH";
  patient: string;
  product: string;
  pharmacy: string;
  due: Date;
}): string {
  const date = opts.due.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  // Hausa copy: have a native speaker review before pilot.
  return opts.language === "HAUSA"
    ? `Sannu ${opts.patient}. Maganinka na ${opts.product} zai kare ranar ${date}. Ka zo ${opts.pharmacy} don karbar sabo.`
    : `Hello ${opts.patient}, your ${opts.product} refill is due on ${date}. Please visit ${opts.pharmacy} to collect it.`;
}

export interface StockRow {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  form: string;
  priceKobo: number;
  reorderLevel: number;
  isNcd: boolean;
  onHand: number;
  perDay: number;
  cover: number | null;
  health: StockHealth;
  nextExpiry: string | null;
}

export interface DashboardData {
  todayKobo: number;
  salesByDay: { day: string; totalKobo: number }[];
  counts: { out: number; low: number; expiring: number; refillsDue: number };
  attention: {
    kind: "out" | "low" | "expiring" | "refill";
    title: string;
    detail: string;
    refId: string;
  }[];
  stock: StockRow[];
}
