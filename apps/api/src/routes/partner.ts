import { Router, type Request, type RequestHandler } from "express";
import { partnerOrderSchema } from "@magani/shared";
import { db } from "../db";
import { ah, HttpError, parse } from "../http";
import { hashKey, loadOrder, notifyPartner, orderInclude, partnerView } from "../services/orders";

/**
 * Partner API v1 for hospitals and platforms (e.g. CareBridge).
 * Auth: `Authorization: Bearer mgk_...`. Partners only ever see pharmacies that opted in,
 * and only their own orders.
 */
export const partnerRoutes = Router();

declare global {
  namespace Express {
    interface Request {
      partner?: { id: string; name: string };
    }
  }
}

const requirePartner: RequestHandler = (req, _res, next) => {
  const key = req.headers.authorization?.replace(/^Bearer /, "");
  if (!key?.startsWith("mgk_")) return next(new HttpError(401, "Send your partner API key as a Bearer token"));
  db.partner
    .findUnique({ where: { keyHash: hashKey(key) } })
    .then((p) => {
      if (!p || !p.active) return next(new HttpError(401, "This API key is not valid"));
      req.partner = { id: p.id, name: p.name };
      next();
    })
    .catch(next);
};

const partnerId = (req: Request) => req.partner!.id;

partnerRoutes.use(requirePartner);

/** Pharmacies that accept partner orders. Patent medicine vendors are excluded: prescription medicines need a pharmacy. */
partnerRoutes.get(
  "/pharmacies",
  ah(async (req, res) => {
    const state = req.query.state ? String(req.query.state) : undefined;
    const lga = req.query.lga ? String(req.query.lga) : undefined;
    res.json(
      await db.pharmacy.findMany({
        where: {
          acceptsOrders: true,
          outletType: "PHARMACY",
          ...(state && { state: { equals: state, mode: "insensitive" } }),
          ...(lga && { lga: { equals: lga, mode: "insensitive" } }),
        },
        select: { id: true, name: true, state: true, lga: true },
        orderBy: [{ state: "asc" }, { name: "asc" }],
      }),
    );
  }),
);

/** Whether a pharmacy has each medicine in unexpired stock. Quantities stay private to the pharmacy. */
partnerRoutes.get(
  "/pharmacies/:id/availability",
  ah(async (req, res) => {
    const pharmacy = await db.pharmacy.findFirst({ where: { id: req.params.id, acceptsOrders: true, outletType: "PHARMACY" } });
    if (!pharmacy) throw new HttpError(404, "Pharmacy not found or not accepting orders");
    const wanted = String(req.query.medicines ?? "").split(",").map((m) => m.trim()).filter(Boolean).slice(0, 20);
    if (!wanted.length) throw new HttpError(400, "Pass medicines as a comma-separated list, e.g. ?medicines=Metformin,Amlodipine");
    const now = new Date();
    const results = await Promise.all(
      wanted.map(async (medicine) => {
        const products = await db.product.findMany({
          where: {
            pharmacyId: pharmacy.id,
            OR: [{ name: { contains: medicine, mode: "insensitive" } }, { genericName: { contains: medicine, mode: "insensitive" } }],
          },
          include: { batches: { where: { expiry: { gte: now }, quantity: { gt: 0 } }, select: { quantity: true } } },
        });
        return {
          medicine,
          available: products.some((p) => p.batches.length > 0),
          matches: products.map((p) => ({ name: p.name, strength: p.strength, inStock: p.batches.length > 0, priceKobo: p.priceKobo })),
        };
      }),
    );
    res.json({ pharmacy: { id: pharmacy.id, name: pharmacy.name }, results });
  }),
);

partnerRoutes.post(
  "/orders",
  ah(async (req, res) => {
    const input = parse(partnerOrderSchema, req.body);
    const existing = await loadOrder({ partnerId: partnerId(req), externalRef: input.externalRef });
    if (existing) return res.status(200).json(partnerView(existing));

    const pharmacy = await db.pharmacy.findFirst({ where: { id: input.pharmacyId, acceptsOrders: true, outletType: "PHARMACY" } });
    if (!pharmacy) throw new HttpError(404, "Pharmacy not found or not accepting orders");

    const order = await db.medicineOrder.create({
      data: {
        partnerId: partnerId(req),
        pharmacyId: pharmacy.id,
        externalRef: input.externalRef,
        patientName: input.patient.name,
        patientPhone: input.patient.phone,
        prescriber: input.prescriber,
        fulfilment: input.fulfilment,
        deliveryAddress: input.deliveryAddress,
        payer: input.payer,
        note: input.note,
        items: { create: input.items },
      },
      include: orderInclude,
    });
    res.status(201).json(partnerView(order));
  }),
);

partnerRoutes.get(
  "/orders",
  ah(async (req, res) => {
    const orders = await db.medicineOrder.findMany({
      where: { partnerId: partnerId(req), ...(req.query.externalRef && { externalRef: String(req.query.externalRef) }) },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(orders.map(partnerView));
  }),
);

partnerRoutes.get(
  "/orders/:id",
  ah(async (req, res) => {
    const order = await loadOrder({ id: req.params.id, partnerId: partnerId(req) });
    if (!order) throw new HttpError(404, "Order not found");
    res.json(partnerView(order));
  }),
);

partnerRoutes.post(
  "/orders/:id/cancel",
  ah(async (req, res) => {
    const order = await loadOrder({ id: req.params.id, partnerId: partnerId(req) });
    if (!order) throw new HttpError(404, "Order not found");
    if (!["SENT", "ACCEPTED", "READY"].includes(order.status)) throw new HttpError(409, `An order that is ${order.status.toLowerCase()} cannot be cancelled`);
    const updated = await db.medicineOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" }, include: orderInclude });
    notifyPartner(updated);
    res.json(partnerView(updated));
  }),
);
