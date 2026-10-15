import { db } from "./db";
import type { MaganiOrder } from "./magani";

export const describeItems = (items: { medicine: string; strength?: string | null; quantity: number }[]) =>
  items.map((i) => `${i.medicine}${i.strength ? ` ${i.strength}` : ""} ×${i.quantity}`).join(", ");

/**
 * Copy Magani's view of an order onto our record. When the pharmacy dispenses, the cost
 * becomes a disbursement due to that pharmacy (once: the order id is unique on disbursements).
 */
export async function syncOrder(localId: string, remote: MaganiOrder) {
  const local = await db.medicineOrder.update({
    where: { id: localId },
    data: {
      status: remote.status,
      totalKobo: remote.totalKobo,
      declineReason: remote.declineReason,
      dispensedAt: remote.dispensedAt ? new Date(remote.dispensedAt) : null,
    },
  });
  if (remote.status === "DISPENSED" && remote.totalKobo) {
    await db.disbursement.upsert({
      where: { medicineOrderId: local.id },
      create: {
        medicineOrderId: local.id,
        campaignId: local.campaignId,
        payeeType: "PHARMACY",
        payeeName: `${local.pharmacyName}, ${local.pharmacyLocation}`,
        amountKobo: remote.totalKobo,
        purpose: `Medicine dispensed: ${describeItems(remote.items.map((i) => ({ ...i, medicine: i.dispensedAs?.name ?? i.medicine, strength: i.dispensedAs?.strength ?? i.strength })))}`,
        evidence: `Magani order ${remote.id}`,
      },
      update: {},
    });
  }
  return local;
}
