import { Router, type Request } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../generated/prisma";
import { db } from "../db";
import { me, requireAdmin } from "../auth";
import { ah, HttpError, parse } from "../http";
import { balance } from "../ledger";
import { magani } from "../magani";
import { syncOrder } from "../orders";

/** Hospital officers and CareBridge admins. Officers only ever see their own hospital's cases. */
export const consoleRoutes = Router();

const isAdmin = (req: Request) => me(req).role === "ADMIN";
const scope = (req: Request): Prisma.CampaignWhereInput => (isAdmin(req) ? {} : { hospitalId: me(req).hospitalId ?? "none" });

async function ownCampaign(req: Request, id: string) {
  const c = await db.campaign.findFirst({ where: { id, ...scope(req) }, include: { hospital: true } });
  if (!c) throw new HttpError(404, "Campaign not found");
  return c;
}

consoleRoutes.get(
  "/overview",
  ah(async (req, res) => {
    const where = scope(req);
    const [byStatus, ordersOpen, due, pendingOfficers, unverified, fund] = await Promise.all([
      db.campaign.groupBy({ by: ["status"], where, _count: true }),
      db.medicineOrder.count({ where: { status: { in: ["SENT", "ACCEPTED", "READY"] }, ...(isAdmin(req) ? {} : { campaign: where }) } }),
      db.disbursement.aggregate({ where: { status: "DUE", ...(isAdmin(req) ? {} : { campaign: where }) }, _sum: { amountKobo: true }, _count: true }),
      isAdmin(req) ? db.user.count({ where: { approved: false } }) : 0,
      isAdmin(req) ? db.hospital.count({ where: { verified: false } }) : 0,
      balance(null),
    ]);
    res.json({
      campaigns: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      ordersOpen,
      due: { count: due._count, amountKobo: due._sum.amountKobo ?? 0 },
      pendingOfficers,
      unverifiedHospitals: unverified,
      fund,
    });
  }),
);

consoleRoutes.get(
  "/campaigns",
  ah(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const campaigns = await db.campaign.findMany({
      where: { ...scope(req), ...(status && { status: status as never }) },
      include: { hospital: { select: { name: true, state: true, verified: true } }, createdBy: { select: { name: true, jobTitle: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(await Promise.all(campaigns.map(async (c) => ({ ...c, ...(await balance(c.id)) }))));
  }),
);

consoleRoutes.get(
  "/campaigns/:id",
  ah(async (req, res) => {
    await ownCampaign(req, req.params.id);
    const c = await db.campaign.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        hospital: true,
        createdBy: { select: { name: true, jobTitle: true, email: true, phone: true } },
        items: true,
        donations: { where: { status: "PAID" }, orderBy: { paidAt: "desc" } },
        disbursements: { orderBy: { createdAt: "desc" } },
        medicineOrders: { orderBy: { createdAt: "desc" } },
      },
    });
    res.json({ ...c, ...(await balance(c.id)) });
  }),
);

const campaignSchema = z.object({
  title: z.string().min(8).max(120),
  patientAlias: z.string().min(2).max(40),
  patientName: z.string().min(2),
  patientPhone: z.string().regex(/^\+?\d{10,14}$/, "Enter a valid phone number"),
  story: z.string().min(60, "Tell donors a little more (at least 60 characters)").max(3000),
  category: z.enum(["NCD_MEDICATION", "DIALYSIS", "CANCER", "SURGERY", "MATERNAL_CHILD", "EMERGENCY", "OTHER"]),
  caseReference: z.string().min(2).max(60),
  consent: z.literal(true, { errorMap: () => ({ message: "The patient or guardian must consent to a public campaign" }) }),
  items: z.array(z.object({ description: z.string().min(2).max(140), amountKobo: z.number().int().positive() })).min(1).max(20),
});

/** Officers submit cases for their own hospital. A CareBridge admin reviews before anything goes public. */
consoleRoutes.post(
  "/campaigns",
  ah(async (req, res) => {
    const u = me(req);
    if (u.role !== "OFFICER" || !u.hospitalId) throw new HttpError(403, "Only hospital officers can submit cases");
    const input = parse(campaignSchema, req.body);
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}-${randomBytes(3).toString("hex")}`;
    const { items, consent: _consent, ...rest } = input;
    const c = await db.campaign.create({
      data: {
        ...rest,
        slug,
        hospitalId: u.hospitalId,
        createdById: u.id,
        consentAt: new Date(),
        targetKobo: items.reduce((t, i) => t + i.amountKobo, 0),
        items: { create: items },
      },
    });
    res.status(201).json(c);
  }),
);

consoleRoutes.post(
  "/campaigns/:id/review",
  requireAdmin,
  ah(async (req, res) => {
    const { decision, note } = parse(z.object({ decision: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }), req.body);
    const c = await ownCampaign(req, req.params.id);
    if (c.status !== "PENDING_REVIEW") throw new HttpError(409, "This campaign has already been reviewed");
    if (decision === "approve" && !c.hospital.verified) throw new HttpError(409, `Verify ${c.hospital.name} before approving its campaigns`);
    if (decision === "reject" && !note) throw new HttpError(422, "Say why the campaign was rejected so the officer can fix it");
    res.json(
      await db.campaign.update({
        where: { id: c.id },
        data: decision === "approve" ? { status: "LIVE", liveAt: new Date(), reviewNote: note } : { status: "REJECTED", reviewNote: note },
      }),
    );
  }),
);

consoleRoutes.post(
  "/campaigns/:id/close",
  requireAdmin,
  ah(async (req, res) => {
    const c = await ownCampaign(req, req.params.id);
    res.json(await db.campaign.update({ where: { id: c.id }, data: { status: "CLOSED" } }));
  }),
);

// ---- Medicine through Magani -------------------------------------------------------------

consoleRoutes.get("/pharmacies", ah(async (req, res) => res.json(await magani.pharmacies(req.query.state ? String(req.query.state) : undefined))));

consoleRoutes.post(
  "/pharmacies/:id/availability",
  ah(async (req, res) => {
    const { medicines } = parse(z.object({ medicines: z.array(z.string().min(2)).min(1).max(20) }), req.body);
    res.json(await magani.availability(req.params.id, medicines));
  }),
);

const orderSchema = z.object({
  campaignId: z.string().uuid().nullable(),
  pharmacy: z.object({ id: z.string().uuid(), name: z.string(), state: z.string(), lga: z.string() }),
  patientName: z.string().min(2).optional(),
  patientPhone: z.string().regex(/^\+?\d{10,14}$/).optional(),
  prescriber: z.string().max(200).optional(),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().max(300).optional(),
  items: z.array(z.object({ medicine: z.string().min(2), strength: z.string().optional(), quantity: z.number().int().positive(), instructions: z.string().optional() })).min(1).max(20),
});

/** Send a prescription to a Magani pharmacy, paid from a campaign or the Essential Medicine Fund. */
consoleRoutes.post(
  "/orders",
  ah(async (req, res) => {
    const u = me(req);
    const input = parse(orderSchema, req.body);
    let patient = { name: input.patientName, phone: input.patientPhone };
    let prescriber = input.prescriber;
    if (input.campaignId) {
      const c = await ownCampaign(req, input.campaignId);
      if (!["LIVE", "FUNDED"].includes(c.status)) throw new HttpError(409, "Only live or funded campaigns can order medicine");
      patient = { name: c.patientName, phone: c.patientPhone };
      prescriber = prescriber ?? c.hospital.name;
    } else if (u.role !== "ADMIN") {
      throw new HttpError(403, "Only administrators can spend the Essential Medicine Fund");
    }
    if (!patient.name || !patient.phone) throw new HttpError(422, "Enter the patient's name and phone number");
    if ((await balance(input.campaignId)).availableKobo <= 0) throw new HttpError(409, "There is no money left to pay for this order");

    const local = await db.medicineOrder.create({
      data: {
        campaignId: input.campaignId,
        pharmacyId: input.pharmacy.id,
        pharmacyName: input.pharmacy.name,
        pharmacyLocation: `${input.pharmacy.lga}, ${input.pharmacy.state}`,
        patientName: patient.name,
        patientPhone: patient.phone,
        fulfilment: input.fulfilment,
        deliveryAddress: input.deliveryAddress,
        items: input.items,
        createdById: u.id,
      },
    });
    try {
      const remote = await magani.createOrder({
        pharmacyId: input.pharmacy.id,
        externalRef: local.id,
        patient,
        prescriber,
        fulfilment: input.fulfilment,
        deliveryAddress: input.deliveryAddress,
        payer: "PARTNER",
        note: input.campaignId ? "Paid by CareBridge campaign" : "Paid by the CareBridge Essential Medicine Fund",
        items: input.items,
      });
      await db.medicineOrder.update({ where: { id: local.id }, data: { maganiOrderId: remote.id } });
      res.status(201).json(await syncOrder(local.id, remote));
    } catch (e) {
      await db.medicineOrder.delete({ where: { id: local.id } });
      throw e;
    }
  }),
);

consoleRoutes.get(
  "/orders",
  ah(async (req, res) => {
    res.json(
      await db.medicineOrder.findMany({
        where: isAdmin(req) ? {} : { campaign: scope(req) },
        include: { campaign: { select: { id: true, title: true, patientAlias: true } }, disbursement: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);

async function ownOrder(req: Request, id: string) {
  const o = await db.medicineOrder.findFirst({ where: { id, ...(isAdmin(req) ? {} : { campaign: scope(req) }) } });
  if (!o || !o.maganiOrderId) throw new HttpError(404, "Order not found");
  return o as typeof o & { maganiOrderId: string };
}

consoleRoutes.post(
  "/orders/:id/refresh",
  ah(async (req, res) => {
    const o = await ownOrder(req, req.params.id);
    res.json(await syncOrder(o.id, await magani.order(o.maganiOrderId)));
  }),
);

consoleRoutes.post(
  "/orders/:id/cancel",
  ah(async (req, res) => {
    const o = await ownOrder(req, req.params.id);
    res.json(await syncOrder(o.id, await magani.cancel(o.maganiOrderId)));
  }),
);

// ---- Disbursements ---------------------------------------------------------------------

consoleRoutes.get(
  "/disbursements",
  ah(async (req, res) => {
    res.json(
      await db.disbursement.findMany({
        where: isAdmin(req) ? {} : { campaign: scope(req) },
        include: { campaign: { select: { id: true, title: true, patientAlias: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);

/** Record a payment to the treating hospital (e.g. for a dialysis session), with its receipt or invoice number. */
consoleRoutes.post(
  "/disbursements",
  requireAdmin,
  ah(async (req, res) => {
    const input = parse(
      z.object({ campaignId: z.string().uuid(), amountKobo: z.number().int().positive(), purpose: z.string().min(5).max(200), evidence: z.string().min(3).max(300) }),
      req.body,
    );
    const c = await ownCampaign(req, input.campaignId);
    const { availableKobo } = await balance(c.id);
    if (input.amountKobo > availableKobo) throw new HttpError(409, `Only ${availableKobo / 100} naira is available on this campaign`);
    res.status(201).json(
      await db.disbursement.create({
        data: { ...input, payeeType: "HOSPITAL", hospitalId: c.hospitalId, payeeName: c.hospital.name, status: "PAID", paidAt: new Date() },
      }),
    );
  }),
);

/** Settle what is owed to a pharmacy for dispensed medicine. */
consoleRoutes.post(
  "/disbursements/:id/paid",
  requireAdmin,
  ah(async (req, res) => {
    const { evidence } = parse(z.object({ evidence: z.string().min(3).max(300) }), req.body);
    const d = await db.disbursement.findUnique({ where: { id: req.params.id } });
    if (!d) throw new HttpError(404, "Disbursement not found");
    if (d.status === "PAID") throw new HttpError(409, "Already marked as paid");
    res.json(await db.disbursement.update({ where: { id: d.id }, data: { status: "PAID", paidAt: new Date(), evidence: `${d.evidence ?? ""} · ${evidence}`.replace(/^ · /, "") } }));
  }),
);

// ---- Hospitals and officers (admin) ----------------------------------------------------

const hospitalSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["FEDERAL_TEACHING", "FEDERAL_MEDICAL_CENTRE", "STATE_SPECIALIST", "GENERAL", "PRIMARY_HEALTH"]),
  state: z.string().min(2),
  lga: z.string().min(2),
  address: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  specialties: z.array(z.string().min(2)).max(20).default([]),
});

consoleRoutes.post(
  "/hospitals",
  requireAdmin,
  ah(async (req, res) => res.status(201).json(await db.hospital.create({ data: parse(hospitalSchema, req.body) }))),
);

consoleRoutes.post(
  "/hospitals/:id/verify",
  requireAdmin,
  ah(async (req, res) => res.json(await db.hospital.update({ where: { id: req.params.id }, data: { verified: true } }))),
);

consoleRoutes.get(
  "/officers",
  requireAdmin,
  ah(async (_req, res) => {
    res.json(
      await db.user.findMany({
        where: { role: "OFFICER" },
        select: { id: true, name: true, email: true, phone: true, jobTitle: true, approved: true, createdAt: true, hospital: { select: { name: true, state: true } } },
        orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
      }),
    );
  }),
);

consoleRoutes.post(
  "/officers/:id/approve",
  requireAdmin,
  ah(async (req, res) => {
    const { approved } = parse(z.object({ approved: z.boolean() }), req.body);
    res.json(await db.user.update({ where: { id: req.params.id }, data: { approved }, select: { id: true, approved: true } }));
  }),
);

