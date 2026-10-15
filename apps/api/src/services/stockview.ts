import { dailyDemand, daysOfCover, stockHealth, type StockRow } from "@magani/shared";
import { db } from "../db";

const DAY = 86_400_000;
const WINDOW = 28;

/** Stock on hand, smoothed demand and days of cover for every product in a pharmacy. */
export async function stockView(pharmacyId: string): Promise<StockRow[]> {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW * DAY);
  const [products, sales] = await Promise.all([
    db.product.findMany({
      where: { pharmacyId },
      include: { batches: { where: { quantity: { gt: 0 }, expiry: { gt: now } }, orderBy: { expiry: "asc" } } },
      orderBy: { name: "asc" },
    }),
    db.stockMovement.findMany({
      where: { pharmacyId, type: "SALE", createdAt: { gte: since } },
      select: { productId: true, quantity: true, createdAt: true },
    }),
  ]);

  const series = new Map<string, number[]>();
  for (const m of sales) {
    const arr = series.get(m.productId) ?? Array(WINDOW).fill(0);
    const idx = Math.min(WINDOW - 1, Math.floor((m.createdAt.getTime() - since.getTime()) / DAY));
    arr[idx] += -m.quantity;
    series.set(m.productId, arr);
  }

  return products.map((p) => {
    const onHand = p.batches.reduce((s, b) => s + b.quantity, 0);
    const perDay = dailyDemand(series.get(p.id) ?? []);
    const cover = daysOfCover(onHand, perDay);
    return {
      id: p.id,
      name: p.name,
      genericName: p.genericName,
      strength: p.strength,
      form: p.form,
      priceKobo: p.priceKobo,
      reorderLevel: p.reorderLevel,
      isNcd: p.isNcd,
      onHand,
      perDay: Math.round(perDay * 10) / 10,
      cover: cover === null ? null : Math.round(cover),
      health: stockHealth(onHand, p.reorderLevel, cover),
      nextExpiry: p.batches[0]?.expiry.toISOString() ?? null,
    };
  });
}
