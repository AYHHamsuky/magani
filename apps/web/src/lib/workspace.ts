import type { StockHealth, StockRow } from "@magani/shared";
import { useExpiring, usePatients, useSales, useStock, type Patient } from "./queries";

const LAGOS = "Africa/Lagos";

/** YYYY-MM-DD in West Africa Time, so "today" matches the pharmacy's clock. */
export function lagosDate(d: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(d),
  );
}

/** "Sunday, 4 October 2026" */
export function longDate(d = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

const formLabel: Record<string, string> = {
  TABLET: "Tablets", CAPSULE: "Capsules", SYRUP: "Syrup", INJECTION: "Injection", CREAM: "Cream", OTHER: "Other",
};
const conditionLabel = { HYPERTENSION: "Hypertension", DIABETES: "Diabetes", OTHER: "Other chronic condition" };

export interface Product {
  id: string;
  name: string;
  strength: string;
  category: string;
  price: number;
  onHand: number;
  /** Days of cover; Infinity when there are no recent sales to forecast from. */
  cover: number;
  health: "out" | "low" | "good";
  chronic: boolean;
}

export interface CarePatient {
  id: string;
  name: string;
  phone: string;
  language: "Hausa" | "English";
  condition: string;
  plan: { id: string; productId: string; product: string; quantity: number; interval: number; due: string } | null;
}

export interface SaleLine { id: string; saleId: string; product: string; quantity: number; total: number; date: string }
export interface ExpiringBatch { id: string; productId: string; product: string; batchNo: string; expiry: string }

const health = (h: StockHealth): Product["health"] => (h === "ok" ? "good" : h);

function toProduct(s: StockRow): Product {
  return {
    id: s.id,
    name: s.name,
    strength: [s.strength, formLabel[s.form]].filter(Boolean).join(" · "),
    category: s.genericName ?? "",
    price: s.priceKobo,
    onHand: s.onHand,
    cover: s.onHand <= 0 ? 0 : s.cover ?? Infinity,
    health: health(s.health),
    chronic: s.isNcd,
  };
}

function toPatient(p: Patient): CarePatient {
  const plan = [...p.refillPlans].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    language: p.language === "HAUSA" ? "Hausa" : "English",
    condition: conditionLabel[p.programme],
    plan: plan
      ? {
          id: plan.id,
          productId: plan.productId,
          product: plan.product.name,
          quantity: plan.quantityPerRefill,
          interval: plan.intervalDays,
          due: lagosDate(plan.nextDueDate),
        }
      : null,
  };
}

export function useWorkspace() {
  const stock = useStock();
  const patients = usePatients();
  const sales = useSales();
  const expiring = useExpiring();
  const queries = [stock, patients, sales, expiring];

  return {
    today: lagosDate(),
    loading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
    products: (stock.data ?? []).map(toProduct),
    patients: (patients.data ?? []).map(toPatient),
    sales: (sales.data ?? []).flatMap((s) =>
      s.items.map((i) => ({ id: i.id, saleId: s.id, product: i.product.name, quantity: i.quantity, total: i.quantity * i.priceKobo, date: s.soldAt })),
    ) as SaleLine[],
    expiring: (expiring.data ?? []).map((b) => ({
      id: b.id, productId: b.productId, product: b.product.name, batchNo: b.batchNo, expiry: lagosDate(b.expiry),
    })) as ExpiringBatch[],
  };
}
