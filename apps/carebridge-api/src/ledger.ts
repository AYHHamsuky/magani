import { db } from "./db";

/** Money in (paid donations), committed (disbursements due or paid) and what is left. */
export async function balance(campaignId: string | null) {
  const [raised, committed, paid] = await Promise.all([
    db.donation.aggregate({ where: { campaignId, status: "PAID" }, _sum: { amountKobo: true }, _count: true }),
    db.disbursement.aggregate({ where: { campaignId }, _sum: { amountKobo: true } }),
    db.disbursement.aggregate({ where: { campaignId, status: "PAID" }, _sum: { amountKobo: true } }),
  ]);
  const raisedKobo = raised._sum.amountKobo ?? 0;
  const committedKobo = committed._sum.amountKobo ?? 0;
  return {
    raisedKobo,
    donors: raised._count,
    committedKobo,
    paidOutKobo: paid._sum.amountKobo ?? 0,
    availableKobo: raisedKobo - committedKobo,
  };
}

export type Balance = Awaited<ReturnType<typeof balance>>;
