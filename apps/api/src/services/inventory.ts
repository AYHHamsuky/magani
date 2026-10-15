import type { ReceiveInput, SaleInput } from "@magani/shared";
import type { Tx } from "../db";
import { HttpError } from "../http";

export async function receiveStock(tx: Tx, pharmacyId: string, userId: string, input: ReceiveInput) {
  const product = await tx.product.findFirst({ where: { id: input.productId, pharmacyId } });
  if (!product) throw new HttpError(404, "Product not found");
  const batch = await tx.batch.upsert({
    where: { productId_batchNo: { productId: product.id, batchNo: input.batchNo } },
    update: { quantity: { increment: input.quantity }, expiry: input.expiry },
    create: {
      productId: product.id,
      batchNo: input.batchNo,
      expiry: input.expiry,
      quantity: input.quantity,
      costKobo: input.costKobo,
    },
  });
  await tx.stockMovement.create({
    data: { id: input.id, pharmacyId, productId: product.id, batchId: batch.id, type: "RECEIVE", quantity: input.quantity, userId },
  });
  return batch;
}

/**
 * Records a sale and deducts stock first-expiry-first-out.
 * `allowShortfall` is used for offline sales that already happened physically:
 * the sale is kept and the shortfall reported instead of rejected.
 */
export async function recordSale(
  tx: Tx,
  pharmacyId: string,
  userId: string,
  input: SaleInput,
  allowShortfall = false,
) {
  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await tx.product.findMany({ where: { id: { in: ids }, pharmacyId } });
  if (products.length !== ids.length) throw new HttpError(404, "One or more products were not found");

  if (input.patientId) {
    const p = await tx.patient.findFirst({ where: { id: input.patientId, pharmacyId } });
    if (!p) throw new HttpError(404, "Patient not found");
  }

  const sale = await tx.sale.create({
    data: {
      id: input.id,
      pharmacyId,
      userId,
      patientId: input.patientId,
      soldAt: input.soldAt ?? new Date(),
      totalKobo: input.items.reduce((s, i) => s + i.priceKobo * i.quantity, 0),
      items: { create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, priceKobo: i.priceKobo })) },
    },
  });

  const warnings: string[] = [];
  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId)!;
    const batches = await tx.batch.findMany({
      where: { productId: item.productId, quantity: { gt: 0 }, expiry: { gt: new Date() } },
      orderBy: { expiry: "asc" },
    });
    let remaining = item.quantity;
    for (const b of batches) {
      if (remaining === 0) break;
      const take = Math.min(remaining, b.quantity);
      await tx.batch.update({ where: { id: b.id }, data: { quantity: { decrement: take } } });
      await tx.stockMovement.create({
        data: { pharmacyId, productId: item.productId, batchId: b.id, saleId: sale.id, type: "SALE", quantity: -take, userId },
      });
      remaining -= take;
    }
    if (remaining > 0) {
      if (!allowShortfall) throw new HttpError(409, `Only ${item.quantity - remaining} of ${product.name} left in stock`);
      await tx.stockMovement.create({
        data: { pharmacyId, productId: item.productId, saleId: sale.id, type: "SALE", quantity: -remaining, userId, note: "shortfall" },
      });
      warnings.push(`${product.name}: sold ${remaining} more than recorded stock. Recount this product.`);
    }
  }
  return { sale, warnings };
}
