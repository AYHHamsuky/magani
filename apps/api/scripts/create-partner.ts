/**
 * Issue a partner API key: npm run partner:create -w @magani/api -- "Aminu Kano Teaching Hospital" HOSPITAL [webhookUrl]
 * The key is shown once; only its hash is stored.
 */
import { PrismaClient, type PartnerKind } from "@prisma/client";
import { newApiKey } from "../src/services/orders";

const [name, kind = "HOSPITAL", webhookUrl] = process.argv.slice(2);
if (!name || !["HOSPITAL", "PLATFORM"].includes(kind)) {
  console.error('Usage: npm run partner:create -w @magani/api -- "<name>" <HOSPITAL|PLATFORM> [webhookUrl]');
  process.exit(1);
}

async function main() {
  const db = new PrismaClient();
  const { key, keyPrefix, keyHash, webhookSecret } = newApiKey();
  const partner = await db.partner.create({ data: { name, kind: kind as PartnerKind, keyPrefix, keyHash, webhookSecret, webhookUrl } });
  console.log(`Partner:        ${partner.name} (${partner.kind})`);
  console.log(`Partner ID:     ${partner.id}`);
  console.log(`API key:        ${key}`);
  console.log(`Webhook secret: ${webhookSecret}`);
  console.log("Store the key now: it cannot be shown again.");
  await db.$disconnect();
}

main();
