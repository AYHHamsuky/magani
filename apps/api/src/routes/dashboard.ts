import { Router } from "express";
import type { DashboardData } from "@magani/shared";
import { db } from "../db";
import { me } from "../auth";
import { ah } from "../http";
import { stockView } from "../services/stockview";

const DAY = 86_400_000;
export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/",
  ah(async (req, res) => {
    const { pharmacyId } = me(req);
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const since = new Date(startToday.getTime() - 13 * DAY);

    const [stock, sales, expiring, refills] = await Promise.all([
      stockView(pharmacyId),
      db.sale.findMany({ where: { pharmacyId, soldAt: { gte: since } }, select: { soldAt: true, totalKobo: true } }),
      db.batch.findMany({
        where: { quantity: { gt: 0 }, expiry: { gt: now, lte: new Date(now.getTime() + 60 * DAY) }, product: { pharmacyId } },
        include: { product: { select: { name: true } } },
        orderBy: { expiry: "asc" },
      }),
      db.refillPlan.findMany({
        where: { active: true, nextDueDate: { lte: new Date(now.getTime() + 3 * DAY) }, patient: { pharmacyId } },
        include: { patient: { select: { name: true } }, product: { select: { name: true } } },
        orderBy: { nextDueDate: "asc" },
      }),
    ]);

    const salesByDay = Array.from({ length: 14 }, (_, i) => {
      const start = new Date(since.getTime() + i * DAY);
      const end = new Date(start.getTime() + DAY);
      return {
        day: start.toISOString().slice(0, 10),
        totalKobo: sales.filter((s) => s.soldAt >= start && s.soldAt < end).reduce((a, s) => a + s.totalKobo, 0),
      };
    });

    const fmt = (d: Date) => d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
    const attention: DashboardData["attention"] = [
      ...stock
        .filter((s) => s.health === "out")
        .map((s) => ({ kind: "out" as const, title: s.name, detail: "Out of stock", refId: s.id })),
      ...refills.map((r) => ({
        kind: "refill" as const,
        title: `${r.patient.name}, ${r.product.name}`,
        detail: r.nextDueDate < startToday ? `Refill overdue since ${fmt(r.nextDueDate)}` : `Refill due ${fmt(r.nextDueDate)}`,
        refId: r.id,
      })),
      ...stock
        .filter((s) => s.health === "low")
        .map((s) => ({
          kind: "low" as const,
          title: s.name,
          detail:
            s.cover !== null
              ? `${s.onHand} left, about ${s.cover} days at current sales`
              : `${s.onHand} left, at or below reorder level`,
          refId: s.id,
        })),
      ...expiring.map((b) => ({
        kind: "expiring" as const,
        title: b.product.name,
        detail: `${b.quantity} in batch ${b.batchNo} expire ${fmt(b.expiry)}`,
        refId: b.id,
      })),
    ];

    const data: DashboardData = {
      todayKobo: sales.filter((s) => s.soldAt >= startToday).reduce((a, s) => a + s.totalKobo, 0),
      salesByDay,
      counts: {
        out: stock.filter((s) => s.health === "out").length,
        low: stock.filter((s) => s.health === "low").length,
        expiring: expiring.length,
        refillsDue: refills.length,
      },
      attention,
      stock,
    };
    res.json(data);
  }),
);
