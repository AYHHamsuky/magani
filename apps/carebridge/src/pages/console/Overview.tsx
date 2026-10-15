import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "@magani/ui";
import { ArrowRight, BadgeCheck, ClipboardList, HandHeart, Plus, Receipt, Truck, Users } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Money } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

interface Overview {
  campaigns: Record<string, number>;
  ordersOpen: number;
  due: { count: number; amountKobo: number };
  pendingOfficers: number;
  unverifiedHospitals: number;
  fund: Money;
}

export default function ConsoleOverview() {
  const { session } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const q = useQuery({ queryKey: ["overview"], queryFn: () => api<Overview>("/console/overview") });

  return (
    <main className="page">
      <PageHeading eyebrow={admin ? "CareBridge console" : session!.hospital?.name} title={admin ? "Platform overview" : `Welcome, ${session!.user.name.split(" ")[0]}`} subtitle={admin ? "Review cases, settle payments and run the Essential Medicine Fund." : "Submit cases for patients who cannot pay, and order their medicine."}>
        {!admin && (
          <ButtonLink to="/console/cases/new">
            <Plus /> Submit a case
          </ButtonLink>
        )}
      </PageHeading>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <Failed what="the overview" /> : (
        <>
          <div className="stats">
            {[
              { label: admin ? "Cases to review" : "Waiting for review", n: q.data.campaigns.PENDING_REVIEW ?? 0, icon: ClipboardList, bottom: "Checked before going public" },
              { label: "Live campaigns", n: (q.data.campaigns.LIVE ?? 0) + (q.data.campaigns.FUNDED ?? 0), icon: HandHeart, bottom: "Live or fully funded" },
              { label: "Prescriptions in progress", n: q.data.ordersOpen, icon: Truck, bottom: "At Magani pharmacies" },
              { label: "Owed to pharmacies", n: money(q.data.due.amountKobo), icon: Receipt, bottom: `${q.data.due.count} dispensed orders to settle` },
            ].map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-top">
                  {s.label}
                  <span className="stat-icon">
                    <s.icon />
                  </span>
                </div>
                <div className="stat-number">{s.n}</div>
                <div className="stat-bottom">{s.bottom}</div>
              </div>
            ))}
          </div>
          <section>
            <div className="section-heading">
              <h2>What needs you</h2>
            </div>
            {[
              admin && q.data.campaigns.PENDING_REVIEW && { text: `${q.data.campaigns.PENDING_REVIEW} case(s) waiting for review`, to: "/console/cases?status=PENDING_REVIEW", icon: ClipboardList },
              admin && q.data.pendingOfficers && { text: `${q.data.pendingOfficers} hospital officer(s) to approve`, to: "/console/officers", icon: Users },
              admin && q.data.unverifiedHospitals && { text: `${q.data.unverifiedHospitals} hospital(s) not yet verified`, to: "/console/hospitals", icon: BadgeCheck },
              q.data.due.count && admin && { text: `${money(q.data.due.amountKobo)} to pay pharmacies for dispensed medicine`, to: "/console/payments", icon: Receipt },
              !admin && q.data.campaigns.REJECTED && { text: `${q.data.campaigns.REJECTED} case(s) need changes`, to: "/console/cases", icon: ClipboardList },
              admin && { text: `Essential Medicine Fund: ${money(q.data.fund.availableKobo)} available`, to: "/console/orders", icon: HandHeart },
            ]
              .filter(Boolean)
              .map((r) => {
                const row = r as { text: string; to: string; icon: typeof Users };
                return (
                  <div className="attention-row" key={row.text}>
                    <div className="status-icon">
                      <row.icon />
                    </div>
                    <div className="row-text">
                      <h3>{row.text}</h3>
                    </div>
                    <ButtonLink to={row.to} variant="outline" size="sm">
                      Open <ArrowRight />
                    </ButtonLink>
                  </div>
                );
              })}
          </section>
        </>
      )}
      <Footer />
    </main>
  );
}
