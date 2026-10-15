import { Router } from "express";
import { acceptOrderSchema, declineOrderSchema } from "@magani/shared";
import type { OrderStatus } from "@prisma/client";
import { db } from "../db";
import { me } from "../auth";
import { ah, HttpError, parse } from "../http";
import { recordSale } from "../services/inventory";
import { loadOrder, notifyPartner, orderInclude, pharmacyView, type FullOrder } from "../services/orders";

/** Prescription orders a pharmacy has received from partners. */
export const orderRoutes = Router();

async function own(pharmacyId: string, id: string, allowed: OrderStatus[]): Promise<FullOrder> {
  const order = await loadOrder({ id, pharmacyId });
  if (!order) throw new HttpError(404, "Order not found");
  if (!allowed.includes(order.status)) throw new HttpError(409, `This order is already ${order.status.toLowerCase()}`);
  return order;
}

orderRoutes.get(
  "/",
  ah(async (req, res) => {
    const orders = await db.medicineOrder.findMany({
      where: { pharmacyId: me(req).pharmacyId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(orders.map(pharmacyView));
  }),
);

orderRoutes.post(
  "/:id/accept",
  ah(async (req, res) => {
    const u = me(req);
    const order = await own(u.pharmacyId, req.params.id, ["SENT"]);
    const input = parse(acceptOrderSchema, req.body);
    const matches = new Map(input.items.map((i) => [i.itemId, i.productId]));
    if (order.items.some((i) => !matches.has(i.id))) throw new HttpError(422, "Choose a product for every prescribed item");

    const products = await db.product.findMany({ where: { pharmacyId: u.pharmacyId, id: { in: [...matches.values()] } } });
    const price = new Map(products.map((p) => [p.id, p.priceKobo]));
    if (price.size !== new Set(matches.values()).size) throw new HttpError(404, "One or more products were not found");

    const updated = await db.$transaction(async (tx) => {
      for (const item of order.items) await tx.medicineOrderItem.update({ where: { id: item.id }, data: { productId: matches.get(item.id) } });
      const totalKobo = order.items.reduce((t, i) => t + price.get(matches.get(i.id)!)! * i.quantity, 0);
      return tx.medicineOrder.update({ where: { id: order.id }, data: { status: "ACCEPTED", totalKobo }, include: orderInclude });
    });
    notifyPartner(updated);
    res.json(pharmacyView(updated));
  }),
);

orderRoutes.post(
  "/:id/ready",
  ah(async (req, res) => {
    const order = await own(me(req).pharmacyId, req.params.id, ["ACCEPTED"]);
    const updated = await db.medicineOrder.update({ where: { id: order.id }, data: { status: "READY" }, include: orderInclude });
    notifyPartner(updated);
    res.json(pharmacyView(updated));
  }),
);

/** Hand over the medicine: records a sale (first-expiry-first-out) and closes the order. */
orderRoutes.post(
  "/:id/dispense",
  ah(async (req, res) => {
    const u = me(req);
    const order = await own(u.pharmacyId, req.params.id, ["ACCEPTED", "READY"]);
    const { updated, warnings } = await db.$transaction(async (tx) => {
      const { sale, warnings } = await recordSale(tx, u.pharmacyId, u.id, {
        items: order.items.map((i) => ({ productId: i.productId!, quantity: i.quantity, priceKobo: i.product!.priceKobo })),
      });
      const updated = await tx.medicineOrder.update({
        where: { id: order.id },
        data: { status: "DISPENSED", saleId: sale.id, totalKobo: sale.totalKobo, dispensedAt: new Date() },
        include: orderInclude,
      });
      return { updated, warnings };
    });
    notifyPartner(updated);
    res.json({ order: pharmacyView(updated), warnings });
  }),
);

orderRoutes.post(
  "/:id/decline",
  ah(async (req, res) => {
    const order = await own(me(req).pharmacyId, req.params.id, ["SENT", "ACCEPTED", "READY"]);
    const { reason } = parse(declineOrderSchema, req.body);
    const updated = await db.medicineOrder.update({
      where: { id: order.id },
      data: { status: "DECLINED", declineReason: reason },
      include: orderInclude,
    });
    notifyPartner(updated);
    res.json(pharmacyView(updated));
  }),
);
