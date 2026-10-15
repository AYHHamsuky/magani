import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DAY = 86_400_000;

async function main() {
  const pharmacy = await db.pharmacy.create({
    data: {
      name: "Barka Pharmacy",
      outletType: "PHARMACY",
      state: "Kaduna",
      lga: "Kaduna North",
      users: { create: { name: "Demo Owner", phone: "08000000000", role: "OWNER", passwordHash: await bcrypt.hash("demo1234", 10) } },
    },
    include: { users: true },
  });
  const userId = pharmacy.users[0].id;

  const catalogue = [
    { name: "Amlodipine", strength: "5mg", priceKobo: 150000, isNcd: true, qty: 180, rate: 6 },
    { name: "Lisinopril", strength: "10mg", priceKobo: 220000, isNcd: true, qty: 40, rate: 4 },
    { name: "Metformin", strength: "500mg", priceKobo: 120000, isNcd: true, qty: 12, rate: 5 },
    { name: "Glibenclamide", strength: "5mg", priceKobo: 90000, isNcd: true, qty: 0, rate: 2 },
    { name: "Paracetamol", strength: "500mg", priceKobo: 30000, isNcd: false, qty: 600, rate: 25 },
    { name: "Artemether/Lumefantrine", strength: "80/480mg", priceKobo: 250000, isNcd: false, qty: 45, rate: 3 },
  ];

  for (const [i, c] of catalogue.entries()) {
    const product = await db.product.create({
      data: { pharmacyId: pharmacy.id, name: c.name, strength: c.strength, priceKobo: c.priceKobo, isNcd: c.isNcd, reorderLevel: 20 },
    });
    const batch = await db.batch.create({
      data: { productId: product.id, batchNo: `B${2600 + i}`, expiry: new Date(Date.now() + (i === 5 ? 40 : 300) * DAY), quantity: c.qty },
    });
    // 28 days of sales history so forecasts have data
    for (let d = 27; d >= 0; d--) {
      const qty = Math.max(0, Math.round(c.rate + (Math.random() - 0.5) * c.rate));
      if (!qty) continue;
      const at = new Date(Date.now() - d * DAY);
      await db.sale.create({
        data: {
          pharmacyId: pharmacy.id,
          userId,
          soldAt: at,
          totalKobo: qty * c.priceKobo,
          items: { create: { productId: product.id, quantity: qty, priceKobo: c.priceKobo } },
          movements: { create: { pharmacyId: pharmacy.id, productId: product.id, batchId: batch.id, type: "SALE", quantity: -qty, userId, createdAt: at } },
        },
      });
    }
  }

  const amlo = await db.product.findFirstOrThrow({ where: { name: "Amlodipine", pharmacyId: pharmacy.id } });
  await db.patient.create({
    data: {
      pharmacyId: pharmacy.id,
      name: "Musa Ibrahim",
      phone: "08011111111",
      language: "HAUSA",
      programme: "HYPERTENSION",
      consentAt: new Date(),
      refillPlans: { create: { productId: amlo.id, quantityPerRefill: 30, intervalDays: 30, nextDueDate: new Date(Date.now() + DAY) } },
    },
  });
  console.log("Seeded. Sign in with 08000000000 / demo1234");
}

main().finally(() => db.$disconnect());
