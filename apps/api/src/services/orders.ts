import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "../db";

export const orderInclude = {
  items: { include: { product: { select: { name: true, strength: true, priceKobo: true } } } },
  pharmacy: { select: { id: true, name: true, state: true, lga: true } },
  partner: { select: { id: true, name: true, kind: true, webhookUrl: true, webhookSecret: true } },
} satisfies Prisma.MedicineOrderInclude;

export type FullOrder = Prisma.MedicineOrderGetPayload<{ include: typeof orderInclude }>;

/** The shape partners see. Stable: this is the public contract of the partner API. */
export function partnerView(o: FullOrder) {
  return {
    id: o.id,
    externalRef: o.externalRef,
    status: o.status,
    pharmacy: o.pharmacy,
    patient: { name: o.patientName },
    prescriber: o.prescriber,
    fulfilment: o.fulfilment,
    deliveryAddress: o.deliveryAddress,
    payer: o.payer,
    note: o.note,
    declineReason: o.declineReason,
    totalKobo: o.totalKobo,
    items: o.items.map((i) => ({
      id: i.id,
      medicine: i.medicine,
      strength: i.strength,
      quantity: i.quantity,
      instructions: i.instructions,
      dispensedAs: i.product ? { name: i.product.name, strength: i.product.strength, unitPriceKobo: i.product.priceKobo } : null,
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    dispensedAt: o.dispensedAt,
  };
}

/** What the pharmacy sees: everything, including the patient's phone and the sending partner. */
export function pharmacyView(o: FullOrder) {
  return { ...partnerView(o), partner: { id: o.partner.id, name: o.partner.name, kind: o.partner.kind }, patient: { name: o.patientName, phone: o.patientPhone } };
}

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function newApiKey() {
  const key = `mgk_${randomBytes(24).toString("base64url")}`;
  return { key, keyPrefix: key.slice(0, 10), keyHash: hashKey(key), webhookSecret: `whsec_${randomBytes(24).toString("base64url")}` };
}

/**
 * Tell the partner an order changed. Best effort: partners can always fetch the order, so a
 * failed delivery is logged rather than retried. Signed with HMAC-SHA256 of the raw body.
 */
export function notifyPartner(o: FullOrder) {
  const url = o.partner.webhookUrl;
  if (!url) return;
  const body = JSON.stringify({ event: "order.updated", order: partnerView(o) });
  const signature = createHmac("sha256", o.partner.webhookSecret).update(body).digest("hex");
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Magani-Signature": signature },
    body,
    signal: AbortSignal.timeout(5000),
  })
    .then((r) => !r.ok && console.warn(`[webhook] ${url} answered ${r.status} for order ${o.id}`))
    .catch((e) => console.warn(`[webhook] ${url} failed for order ${o.id}: ${e.message}`));
}

export const loadOrder = (where: Prisma.MedicineOrderWhereInput) => db.medicineOrder.findFirst({ where, include: orderInclude });
