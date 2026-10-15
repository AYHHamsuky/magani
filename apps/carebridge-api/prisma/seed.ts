/**
 * Demo data: an admin, a starter hospital directory, an approved officer and two cases.
 * Hospital entries are a starting list only: confirm each one before verifying it in the console.
 */
import bcrypt from "bcryptjs";
import { PrismaClient, type HospitalType } from "../src/generated/prisma";

const db = new PrismaClient();

const hospitals: { name: string; type: HospitalType; state: string; lga: string; specialties: string[] }[] = [
  { name: "Barau Dikko Teaching Hospital", type: "STATE_SPECIALIST", state: "Kaduna", lga: "Kaduna North", specialties: ["Internal medicine", "Nephrology", "Surgery"] },
  { name: "Ahmadu Bello University Teaching Hospital", type: "FEDERAL_TEACHING", state: "Kaduna", lga: "Giwa", specialties: ["Oncology", "Nephrology", "Cardiology"] },
  { name: "Yusuf Dantsoho Memorial Hospital", type: "GENERAL", state: "Kaduna", lga: "Kaduna South", specialties: ["General medicine", "Maternity"] },
  { name: "Aminu Kano Teaching Hospital", type: "FEDERAL_TEACHING", state: "Kano", lga: "Tarauni", specialties: ["Oncology", "Nephrology", "Paediatrics"] },
  { name: "Murtala Muhammad Specialist Hospital", type: "STATE_SPECIALIST", state: "Kano", lga: "Kano Municipal", specialties: ["Emergency", "Maternity", "Surgery"] },
  { name: "Lagos University Teaching Hospital", type: "FEDERAL_TEACHING", state: "Lagos", lga: "Mushin", specialties: ["Oncology", "Cardiology", "Nephrology"] },
  { name: "University College Hospital", type: "FEDERAL_TEACHING", state: "Oyo", lga: "Ibadan North", specialties: ["Oncology", "Neurology", "Cardiology"] },
];

async function main() {
  if (await db.user.findFirst({ where: { role: "ADMIN" } })) {
    console.log("Already seeded.");
    return;
  }
  const created = [];
  for (const h of hospitals) created.push(await db.hospital.create({ data: { ...h, verified: h.state === "Kaduna" } }));
  const barau = created[0];

  await db.user.create({
    data: { name: "CareBridge Admin", email: "admin@carebridge.test", passwordHash: await bcrypt.hash("admin12345", 10), role: "ADMIN", approved: true },
  });
  const officer = await db.user.create({
    data: {
      name: "Hajara Bello",
      email: "officer@carebridge.test",
      phone: "08020000001",
      jobTitle: "Medical social worker",
      passwordHash: await bcrypt.hash("officer12345", 10),
      role: "OFFICER",
      approved: true,
      hospitalId: barau.id,
    },
  });

  const live = await db.campaign.create({
    data: {
      slug: "three-months-of-blood-pressure-and-diabetes-medicine-for-aisha-demo01",
      hospitalId: barau.id,
      createdById: officer.id,
      title: "Three months of blood pressure and diabetes medicine for Aisha",
      patientAlias: "Aisha, 54",
      patientName: "Aisha Ibrahim",
      patientPhone: "08012340001",
      story:
        "Aisha is a market trader who was diagnosed with high blood pressure and type 2 diabetes last year. Since her husband passed away she has struggled to buy her monthly medicine, and she has twice been admitted with very high blood pressure. Three months of medicine will keep her stable while the hospital enrols her in the state health insurance scheme.",
      category: "NCD_MEDICATION",
      caseReference: "BDTH/MED/2026/0412",
      consentAt: new Date(),
      targetKobo: 4_200_000,
      status: "LIVE",
      liveAt: new Date(),
      items: {
        create: [
          { description: "Metformin 500mg, 2 packs a month for 3 months", amountKobo: 720_000 },
          { description: "Amlodipine 5mg, 1 pack a month for 3 months", amountKobo: 450_000 },
          { description: "Lisinopril 10mg, 1 pack a month for 3 months", amountKobo: 660_000 },
          { description: "Kidney function and HbA1c tests at review", amountKobo: 2_370_000 },
        ],
      },
    },
  });
  await db.donation.createMany({
    data: [
      { campaignId: live.id, donorName: "Musa Danladi", donorEmail: "musa@example.com", amountKobo: 1_000_000, status: "PAID", reference: "cb_seed_1", provider: "TEST", paidAt: new Date(), message: "Get well soon, Mama." },
      { campaignId: live.id, donorName: "Anonymous donor", donorEmail: "anon@example.com", anonymous: true, amountKobo: 500_000, status: "PAID", reference: "cb_seed_2", provider: "TEST", paidAt: new Date() },
      { campaignId: null, donorName: "Kaduna Rotary Club", donorEmail: "rotary@example.com", amountKobo: 5_000_000, status: "PAID", reference: "cb_seed_3", provider: "TEST", paidAt: new Date(), message: "For insulin and blood pressure medicine." },
    ],
  });

  await db.campaign.create({
    data: {
      slug: "dialysis-sessions-for-ibrahim-demo02",
      hospitalId: barau.id,
      createdById: officer.id,
      title: "Six dialysis sessions for Ibrahim while he waits for a transplant assessment",
      patientAlias: "Ibrahim, 37",
      patientName: "Ibrahim Sule",
      patientPhone: "08012340005",
      story:
        "Ibrahim is a secondary school teacher with kidney failure. He needs dialysis twice a week and his family has already sold their car to pay for the first month. These six sessions will carry him to his transplant assessment at the teaching hospital.",
      category: "DIALYSIS",
      caseReference: "BDTH/NEP/2026/0077",
      consentAt: new Date(),
      targetKobo: 21_000_000,
      items: { create: [{ description: "Haemodialysis session ×6 (hospital tariff)", amountKobo: 21_000_000 }] },
    },
  });

  console.log("Seeded CareBridge demo data.");
  console.log("  Admin:   admin@carebridge.test / admin12345");
  console.log("  Officer: officer@carebridge.test / officer12345 (Barau Dikko Teaching Hospital)");
  console.log("Change these passwords before anyone else can reach the server.");
}

main().finally(() => db.$disconnect());
