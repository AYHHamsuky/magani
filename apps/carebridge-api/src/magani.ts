import { env } from "./env";
import { HttpError } from "./http";

/** Order as returned by the Magani partner API. */
export interface MaganiOrder {
  id: string;
  externalRef: string;
  status: "SENT" | "ACCEPTED" | "READY" | "DISPENSED" | "DECLINED" | "CANCELLED";
  pharmacy: { id: string; name: string; state: string; lga: string };
  totalKobo: number | null;
  declineReason: string | null;
  dispensedAt: string | null;
  items: { medicine: string; strength: string | null; quantity: number; dispensedAs: { name: string; strength: string | null; unitPriceKobo: number } | null }[];
}
export interface MaganiPharmacy { id: string; name: string; state: string; lga: string }

/** Thin client for Magani's partner API. CareBridge never touches pharmacy data any other way. */
async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!env.MAGANI_API_KEY) throw new HttpError(503, "Magani is not connected. Set MAGANI_API_KEY on the CareBridge server.");
  let res: Response;
  try {
    res = await fetch(`${env.MAGANI_API_URL}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { Authorization: `Bearer ${env.MAGANI_API_KEY}`, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, "Could not reach the Magani pharmacy network. Try again shortly.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status === 401 ? 502 : res.status, `Magani: ${data.error ?? "request failed"}`);
  return data as T;
}

export const magani = {
  pharmacies: (state?: string) => call<MaganiPharmacy[]>(`/pharmacies${state ? `?state=${encodeURIComponent(state)}` : ""}`),
  availability: (pharmacyId: string, medicines: string[]) =>
    call<{ results: { medicine: string; available: boolean; matches: { name: string; strength: string | null; inStock: boolean; priceKobo: number }[] }[] }>(
      `/pharmacies/${pharmacyId}/availability?medicines=${encodeURIComponent(medicines.join(","))}`,
    ),
  createOrder: (body: unknown) => call<MaganiOrder>("/orders", { body }),
  order: (id: string) => call<MaganiOrder>(`/orders/${id}`),
  cancel: (id: string) => call<MaganiOrder>(`/orders/${id}/cancel`, { method: "POST" }),
};
