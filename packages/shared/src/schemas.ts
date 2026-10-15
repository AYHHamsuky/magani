import { z } from "zod";

const phone = z.string().regex(/^\+?\d{10,14}$/, "Enter a valid phone number, e.g. 08031234567");

export const loginSchema = z.object({ phone, password: z.string().min(6) });

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
  pharmacyName: z.string().min(2),
  outletType: z.enum(["PHARMACY", "PPMV"]),
  state: z.string().min(2),
  lga: z.string().min(2),
});

/** What an owner can change after sign-up: their name and the pharmacy's details. */
export const settingsSchema = registerSchema
  .pick({ name: true, pharmacyName: true, outletType: true, state: true, lga: true })
  .extend({ acceptsOrders: z.boolean().default(false) });

export const dosageForms = ["TABLET", "CAPSULE", "SYRUP", "INJECTION", "CREAM", "OTHER"] as const;

export const productSchema = z.object({
  name: z.string().min(2),
  genericName: z.string().optional(),
  strength: z.string().optional(),
  form: z.enum(dosageForms).default("TABLET"),
  packSize: z.number().int().positive().default(1),
  priceKobo: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative().default(10),
  isNcd: z.boolean().default(false),
  barcode: z.string().optional(),
});

export const receiveSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  batchNo: z.string().min(1),
  expiry: z.coerce.date(),
  quantity: z.number().int().positive(),
  costKobo: z.number().int().nonnegative().default(0),
});

export const adjustSchema = z.object({
  batchId: z.string().uuid(),
  quantity: z.number().int().refine((n) => n !== 0, "Quantity cannot be zero"),
  reason: z.enum(["DAMAGED", "EXPIRED", "COUNT_CORRECTION"]),
});

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  priceKobo: z.number().int().nonnegative(),
});

export const saleSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  soldAt: z.coerce.date().optional(),
});

export const patientSchema = z.object({
  name: z.string().min(2),
  phone,
  language: z.enum(["HAUSA", "ENGLISH"]).default("HAUSA"),
  programme: z.enum(["HYPERTENSION", "DIABETES", "OTHER"]),
  consent: z.literal(true, { errorMap: () => ({ message: "Patient consent is required for reminders" }) }),
});

export const refillPlanSchema = z.object({
  productId: z.string().uuid(),
  quantityPerRefill: z.number().int().positive(),
  intervalDays: z.number().int().min(7).max(90),
  nextDueDate: z.coerce.date(),
});

/** Partner API: a prescription order sent by a hospital or platform to a pharmacy. */
export const partnerOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  externalRef: z.string().min(1).max(100),
  patient: z.object({ name: z.string().min(2), phone }),
  prescriber: z.string().max(200).optional(),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  deliveryAddress: z.string().max(300).optional(),
  payer: z.enum(["PARTNER", "PATIENT"]).default("PARTNER"),
  note: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        medicine: z.string().min(2).max(120),
        strength: z.string().max(60).optional(),
        quantity: z.number().int().positive().max(1000),
        instructions: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(20),
}).refine((o) => o.fulfilment === "PICKUP" || !!o.deliveryAddress, {
  message: "A delivery address is required for delivery orders",
  path: ["deliveryAddress"],
});

export const acceptOrderSchema = z.object({
  items: z.array(z.object({ itemId: z.string().uuid(), productId: z.string().uuid() })).min(1),
});
export const declineOrderSchema = z.object({ reason: z.string().min(3).max(300) });

export const syncOpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sale"), payload: saleSchema.extend({ id: z.string().uuid() }) }),
  z.object({ type: z.literal("receive"), payload: receiveSchema.extend({ id: z.string().uuid() }) }),
]);
export const syncPushSchema = z.object({ ops: z.array(syncOpSchema).max(200) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ReceiveInput = z.infer<typeof receiveSchema>;
export type AdjustInput = z.infer<typeof adjustSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type RefillPlanInput = z.infer<typeof refillPlanSchema>;
export type SyncOp = z.infer<typeof syncOpSchema>;
export type PartnerOrderInput = z.infer<typeof partnerOrderSchema>;
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;
