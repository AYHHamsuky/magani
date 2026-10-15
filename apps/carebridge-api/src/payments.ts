import { randomBytes } from "node:crypto";
import { env } from "./env";
import { HttpError } from "./http";

export const testMode = !env.PAYSTACK_SECRET_KEY;
export const newReference = () => `cb_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;

/**
 * Start a card/bank payment. With no Paystack key the platform runs in test mode and the
 * caller marks the donation paid straight away. Money goes to the platform's Paystack
 * balance and is only ever disbursed to hospitals and pharmacies.
 */
export async function startPayment(p: { email: string; amountKobo: number; reference: string }): Promise<{ authorizationUrl: string } | null> {
  if (testMode) return null;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: p.email,
      amount: p.amountKobo,
      reference: p.reference,
      currency: "NGN",
      callback_url: `${env.PUBLIC_URL}/donate/thanks?reference=${p.reference}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new HttpError(502, data.message ?? "Could not start the payment");
  return { authorizationUrl: data.data.authorization_url };
}

/** Ask Paystack whether a payment succeeded, and for how much. */
export async function verifyPayment(reference: string): Promise<{ paid: boolean; amountKobo: number }> {
  if (testMode) return { paid: true, amountKobo: 0 };
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, data.message ?? "Could not verify the payment");
  return { paid: data.data?.status === "success", amountKobo: data.data?.amount ?? 0 };
}
