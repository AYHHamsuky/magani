import { Router } from "express";
import { patientSchema, refillPlanSchema } from "@magani/shared";
import { db } from "../db";
import { me } from "../auth";
import { ah, HttpError, parse } from "../http";
import { recordSale } from "../services/inventory";
import { sendReminder } from "../services/reminders";

const DAY = 86_400_000;
export const patientRoutes = Router();

patientRoutes.get(
  "/",
  ah(async (req, res) => {
    res.json(
      await db.patient.findMany({
        where: { pharmacyId: me(req).pharmacyId },
        include: {
          refillPlans: {
            where: { active: true },
            include: {
              product: { select: { name: true, strength: true, priceKobo: true } },
              reminders: { orderBy: { sentAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    );
  }),
);

patientRoutes.post(
  "/",
  ah(async (req, res) => {
    const { consent: _consent, ...input } = parse(patientSchema, req.body);
    res.status(201).json(await db.patient.create({ data: { ...input, consentAt: new Date(), pharmacyId: me(req).pharmacyId } }));
  }),
);

patientRoutes.post(
  "/:id/refills",
  ah(async (req, res) => {
    const u = me(req);
    const input = parse(refillPlanSchema, req.body);
    const patient = await db.patient.findFirst({ where: { id: req.params.id, pharmacyId: u.pharmacyId } });
    const product = await db.product.findFirst({ where: { id: input.productId, pharmacyId: u.pharmacyId } });
    if (!patient || !product) throw new HttpError(404, "Patient or product not found");
    res.status(201).json(await db.refillPlan.create({ data: { ...input, patientId: patient.id } }));
  }),
);

export const refillRoutes = Router();

refillRoutes.get(
  "/due",
  ah(async (req, res) => {
    const days = Number(req.query.days ?? 7);
    res.json(
      await db.refillPlan.findMany({
        where: {
          active: true,
          nextDueDate: { lte: new Date(Date.now() + days * DAY) },
          patient: { pharmacyId: me(req).pharmacyId },
        },
        include: { patient: true, product: { select: { name: true, strength: true, priceKobo: true } } },
        orderBy: { nextDueDate: "asc" },
      }),
    );
  }),
);

/** Patient collected their refill: record the sale and move the due date forward. */
refillRoutes.post(
  "/:id/collect",
  ah(async (req, res) => {
    const u = me(req);
    const plan = await db.refillPlan.findFirst({
      where: { id: req.params.id, patient: { pharmacyId: u.pharmacyId } },
      include: { product: true },
    });
    if (!plan) throw new HttpError(404, "Refill plan not found");
    const out = await db.$transaction(async (tx) => {
      const { sale, warnings } = await recordSale(tx, u.pharmacyId, u.id, {
        patientId: plan.patientId,
        items: [{ productId: plan.productId, quantity: plan.quantityPerRefill, priceKobo: plan.product.priceKobo }],
      });
      const updated = await tx.refillPlan.update({
        where: { id: plan.id },
        data: { nextDueDate: new Date(Date.now() + plan.intervalDays * DAY) },
      });
      return { sale, warnings, plan: updated };
    });
    res.json(out);
  }),
);

refillRoutes.post(
  "/:id/remind",
  ah(async (req, res) => {
    const plan = await db.refillPlan.findFirst({ where: { id: req.params.id, patient: { pharmacyId: me(req).pharmacyId } } });
    if (!plan) throw new HttpError(404, "Refill plan not found");
    res.json(await sendReminder(plan.id));
  }),
);

refillRoutes.delete(
  "/:id",
  ah(async (req, res) => {
    const { count } = await db.refillPlan.updateMany({
      where: { id: req.params.id, patient: { pharmacyId: me(req).pharmacyId } },
      data: { active: false },
    });
    if (!count) throw new HttpError(404, "Refill plan not found");
    res.json({ ok: true });
  }),
);
