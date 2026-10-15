import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma";
import { db } from "../db";
import { ah, HttpError, parse } from "../http";
import { balance } from "../ledger";
import { newReference, startPayment, testMode, verifyPayment } from "../payments";

/** Everything a donor or member of the public can see. No patient names, phones or case numbers. */
export const publicRoutes = Router();

const PUBLIC: Prisma.EnumCampaignStatusFilter = { in: ["LIVE", "FUNDED", "CLOSED"] };
const hospitalPublic = { select: { id: true, name: true, type: true, state: true, lga: true, verified: true } } as const;

publicRoutes.get(
  "/stats",
  ah(async (_req, res) => {
    const [raised, committed, dispensed, campaigns, hospitals] = await Promise.all([
      db.donation.aggregate({ where: { status: "PAID" }, _sum: { amountKobo: true }, _count: true }),
      db.disbursement.aggregate({ _sum: { amountKobo: true } }),
      db.medicineOrder.count({ where: { status: "DISPENSED" } }),
      db.campaign.count({ where: { status: PUBLIC } }),
      db.hospital.count({ where: { verified: true } }),
    ]);
    res.json({
      raisedKobo: raised._sum.amountKobo ?? 0,
      donations: raised._count,
      disbursedKobo: committed._sum.amountKobo ?? 0,
      medicineOrdersDispensed: dispensed,
      campaigns,
      verifiedHospitals: hospitals,
      testMode,
    });
  }),
);

publicRoutes.get(
  "/hospitals",
  ah(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const state = String(req.query.state ?? "").trim();
    const type = String(req.query.type ?? "").trim();
    const hospitals = await db.hospital.findMany({
      where: {
        ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { lga: { contains: q, mode: "insensitive" } }, { specialties: { has: q } }] }),
        ...(state && { state: { equals: state, mode: "insensitive" } }),
        ...(type && { type: type as never }),
      },
      include: { _count: { select: { campaigns: { where: { status: PUBLIC } } } } },
      orderBy: [{ state: "asc" }, { name: "asc" }],
    });
    const states = await db.hospital.findMany({ distinct: ["state"], select: { state: true }, orderBy: { state: "asc" } });
    res.json({ hospitals, states: states.map((s) => s.state) });
  }),
);

publicRoutes.get(
  "/campaigns",
  ah(async (req, res) => {
    const category = String(req.query.category ?? "");
    const state = String(req.query.state ?? "");
    const campaigns = await db.campaign.findMany({
      where: {
        status: req.query.all ? PUBLIC : { in: ["LIVE", "FUNDED"] },
        ...(category && { category: category as never }),
        ...(state && { hospital: { state: { equals: state, mode: "insensitive" } } }),
      },
      include: { hospital: hospitalPublic },
      orderBy: [{ status: "asc" }, { liveAt: "desc" }],
      take: 60,
    });
    const withMoney = await Promise.all(
      campaigns.map(async (c) => ({ ...publicCampaign(c), ...(await balance(c.id)) })),
    );
    res.json(withMoney);
  }),
);

function publicCampaign(c: Prisma.CampaignGetPayload<{ include: { hospital: typeof hospitalPublic } }>) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    patientAlias: c.patientAlias,
    story: c.story,
    category: c.category,
    status: c.status,
    targetKobo: c.targetKobo,
    liveAt: c.liveAt,
    hospital: c.hospital,
  };
}

publicRoutes.get(
  "/campaigns/:slug",
  ah(async (req, res) => {
    const c = await db.campaign.findFirst({
      where: { slug: req.params.slug, status: PUBLIC },
      include: {
        hospital: hospitalPublic,
        items: true,
        donations: { where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 30 },
        disbursements: { orderBy: { createdAt: "desc" } },
        medicineOrders: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!c) throw new HttpError(404, "Campaign not found");
    res.json({
      ...publicCampaign(c),
      ...(await balance(c.id)),
      costItems: c.items.map((i) => ({ description: i.description, amountKobo: i.amountKobo })),
      donations: c.donations.map((d) => ({ name: d.anonymous ? "Anonymous" : d.donorName, amountKobo: d.amountKobo, message: d.message, paidAt: d.paidAt })),
      disbursements: c.disbursements.map((d) => ({
        payeeType: d.payeeType, payeeName: d.payeeName, amountKobo: d.amountKobo, purpose: d.purpose, status: d.status, createdAt: d.createdAt, paidAt: d.paidAt,
      })),
      medicineOrders: c.medicineOrders.map((o) => ({
        pharmacy: `${o.pharmacyName}, ${o.pharmacyLocation}`, status: o.status, items: o.items, createdAt: o.createdAt, dispensedAt: o.dispensedAt, fulfilment: o.fulfilment,
      })),
    });
  }),
);

publicRoutes.get(
  "/fund",
  ah(async (_req, res) => {
    const [money, donations, orders] = await Promise.all([
      balance(null),
      db.donation.findMany({ where: { campaignId: null, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 20 }),
      db.medicineOrder.findMany({ where: { campaignId: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    res.json({
      ...money,
      donations: donations.map((d) => ({ name: d.anonymous ? "Anonymous" : d.donorName, amountKobo: d.amountKobo, message: d.message, paidAt: d.paidAt })),
      medicineOrders: orders.map((o) => ({ pharmacy: `${o.pharmacyName}, ${o.pharmacyLocation}`, status: o.status, items: o.items, createdAt: o.createdAt, dispensedAt: o.dispensedAt })),
    });
  }),
);

publicRoutes.get(
  "/ledger",
  ah(async (_req, res) => {
    const hospitals = await db.hospital.findMany({
      where: { campaigns: { some: { status: PUBLIC } } },
      select: { id: true, name: true, state: true, lga: true, campaigns: { where: { status: PUBLIC }, select: { id: true } } },
      orderBy: { name: "asc" },
    });
    const rows = await Promise.all(
      hospitals.map(async (h) => {
        const ids = h.campaigns.map((c) => c.id);
        const [raised, toHospital, toPharmacies] = await Promise.all([
          db.donation.aggregate({ where: { campaignId: { in: ids }, status: "PAID" }, _sum: { amountKobo: true } }),
          db.disbursement.aggregate({ where: { campaignId: { in: ids }, payeeType: "HOSPITAL" }, _sum: { amountKobo: true } }),
          db.disbursement.aggregate({ where: { campaignId: { in: ids }, payeeType: "PHARMACY" }, _sum: { amountKobo: true } }),
        ]);
        return {
          hospital: { id: h.id, name: h.name, state: h.state, lga: h.lga },
          campaigns: ids.length,
          raisedKobo: raised._sum.amountKobo ?? 0,
          toHospitalKobo: toHospital._sum.amountKobo ?? 0,
          toPharmaciesKobo: toPharmacies._sum.amountKobo ?? 0,
        };
      }),
    );
    res.json({ hospitals: rows, fund: await balance(null) });
  }),
);

const donationSchema = z.object({
  campaignSlug: z.string().optional(),
  donorName: z.string().min(2).max(80),
  donorEmail: z.string().email(),
  anonymous: z.boolean().default(false),
  message: z.string().max(280).optional(),
  amountKobo: z.number().int().min(50_000, "The smallest donation is ₦500").max(1_000_000_000),
});

publicRoutes.post(
  "/donations",
  ah(async (req, res) => {
    const input = parse(donationSchema, req.body);
    let campaignId: string | null = null;
    if (input.campaignSlug) {
      const c = await db.campaign.findUnique({ where: { slug: input.campaignSlug } });
      if (!c || c.status !== "LIVE") throw new HttpError(409, "This campaign is not accepting donations");
      campaignId = c.id;
    }
    const reference = newReference();
    const { campaignSlug: _slug, ...donor } = input;
    const donation = await db.donation.create({
      data: { ...donor, campaignId, reference, provider: testMode ? "TEST" : "PAYSTACK" },
    });
    const payment = await startPayment({ email: input.donorEmail, amountKobo: input.amountKobo, reference });
    if (!payment) {
      await markPaid(donation.id);
      return res.status(201).json({ status: "PAID", reference, testMode: true });
    }
    res.status(201).json({ status: "PENDING", reference, authorizationUrl: payment.authorizationUrl });
  }),
);

publicRoutes.get(
  "/donations/:reference",
  ah(async (req, res) => {
    const d = await db.donation.findUnique({ where: { reference: req.params.reference }, include: { campaign: { select: { slug: true, title: true } } } });
    if (!d) throw new HttpError(404, "Donation not found");
    if (d.status === "PENDING") {
      const v = await verifyPayment(d.reference);
      if (v.paid && v.amountKobo === d.amountKobo) await markPaid(d.id);
    }
    const fresh = await db.donation.findUniqueOrThrow({ where: { id: d.id } });
    res.json({ status: fresh.status, amountKobo: fresh.amountKobo, campaign: d.campaign });
  }),
);

/** Mark paid and, once a campaign reaches its target, stop taking donations for it. */
async function markPaid(id: string) {
  const d = await db.donation.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  if (!d.campaignId) return;
  const c = await db.campaign.findUniqueOrThrow({ where: { id: d.campaignId } });
  const { raisedKobo } = await balance(c.id);
  if (c.status === "LIVE" && raisedKobo >= c.targetKobo) await db.campaign.update({ where: { id: c.id }, data: { status: "FUNDED" } });
}
