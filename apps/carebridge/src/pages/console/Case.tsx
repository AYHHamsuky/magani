import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, useToast } from "@magani/ui";
import { ArrowUpRight, Check, Receipt, Truck } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { campaignPill, campaignStatus, categories, day, money } from "@/lib/format";
import type { ConsoleCampaignDetail } from "@/lib/types";
import { OrderMedicineDialog } from "@/components/OrderMedicineDialog";
import { Failed, Footer, Loading, PageHeading, Progress } from "@/components/ui";
import { OrdersTable } from "./Orders";

export default function Case() {
  const { id } = useParams();
  const { session } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const toast = useToast();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<"order" | "pay" | "reject" | null>(null);
  const q = useQuery({ queryKey: ["console-campaign", id], queryFn: () => api<ConsoleCampaignDetail>(`/console/campaigns/${id}`) });

  async function act(path: string, body: unknown, done: string) {
    try {
      await api(path, { body });
      toast.success(done);
      setPanel(null);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  if (q.isLoading) return <main className="page"><Loading /></main>;
  if (q.error || !q.data) return <main className="page"><Failed what="this case" /></main>;
  const c = q.data;
  const active = c.status === "LIVE" || c.status === "FUNDED";

  return (
    <main className="page">
      <PageHeading eyebrow={`${categories[c.category]} · ${c.hospital.name}`} title={c.title} subtitle={<span className={`pill ${campaignPill(c.status)}`}>{campaignStatus[c.status]}</span>}>
        {active && (
          <Button variant="outline" onClick={() => setPanel("order")}>
            <Truck /> Order medicine
          </Button>
        )}
        {active && admin && (
          <Button variant="outline" onClick={() => setPanel("pay")}>
            <Receipt /> Record hospital payment
          </Button>
        )}
        {active && (
          <a className="inline-flex items-center gap-2 text-sm text-primary" href={`/campaigns/${c.slug}`} target="_blank" rel="noreferrer">
            Public page <ArrowUpRight size={14} />
          </a>
        )}
      </PageHeading>

      {c.status === "PENDING_REVIEW" && admin && (
        <section className="welcome">
          <div>
            <h2>Check this case before it goes public</h2>
            <p>
              Confirm case number <strong>{c.caseReference}</strong> with {c.hospital.name}, and that {c.createdBy.name} ({c.createdBy.jobTitle}) works there.
              {!c.hospital.verified && (
                <>
                  <br />
                  The hospital itself is not verified yet: <Link to="/console/hospitals">verify it first</Link>.
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPanel("reject")}>
              Ask for changes
            </Button>
            <Button onClick={() => act(`/console/campaigns/${c.id}/review`, { decision: "approve" }, "Approved. The campaign is now live.")}>
              <Check /> Approve and publish
            </Button>
          </div>
        </section>
      )}
      {c.status === "REJECTED" && c.reviewNote && (
        <section className="welcome">
          <div>
            <h2>The reviewer asked for changes</h2>
            <p>{c.reviewNote}</p>
          </div>
        </section>
      )}

      <div className="stats">
        {[
          { label: "Raised", value: money(c.raisedKobo), bottom: `of ${money(c.targetKobo)} · ${c.donors} donors` },
          { label: "Committed to care", value: money(c.committedKobo), bottom: `${money(c.paidOutKobo)} already paid` },
          { label: "Available", value: money(c.availableKobo), bottom: "For medicine or hospital bills" },
          { label: "Prescriptions", value: c.medicineOrders.length, bottom: "Sent through Magani" },
        ].map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-top">{s.label}</div>
            <div className="stat-number">{s.value}</div>
            <div className="stat-bottom">{s.bottom}</div>
          </div>
        ))}
      </div>
      <Progress raised={c.raisedKobo} target={c.targetKobo} />

      <div className="work-grid" style={{ marginTop: 28 }}>
        <div>
          <section>
            <div className="section-heading">
              <h2>Prescriptions</h2>
            </div>
            <OrdersTable orders={c.medicineOrders.map((o) => ({ ...o, campaign: null }))} />
          </section>
          <section className="stock-overview">
            <div className="section-heading">
              <h2>Payments</h2>
            </div>
            <div className="table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Paid to</th>
                    <th>For</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {c.disbursements.map((d) => (
                    <tr key={d.id}>
                      <td>
                        {d.payeeName}
                        <small>{d.payeeType === "HOSPITAL" ? "Hospital" : "Pharmacy"}</small>
                      </td>
                      <td>
                        {d.purpose}
                        <small>{d.evidence}</small>
                      </td>
                      <td>{money(d.amountKobo)}</td>
                      <td>
                        <span className={`pill ${d.status === "DUE" ? "low" : ""}`}>{d.status === "DUE" ? "Owed" : `Paid ${day(d.paidAt)}`}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!c.disbursements.length && <div className="empty">Nothing paid out yet.</div>}
            </div>
          </section>
        </div>
        <aside>
          <div className="section-heading">
            <h2>Patient (private)</h2>
          </div>
          <div className="basket-item">
            <strong className="text-sm">{c.patientName}</strong>
            <div className="muted text-xs">
              {c.patientPhone} · shown publicly as “{c.patientAlias}”
              <br />
              Case number {c.caseReference}
              <br />
              Submitted by {c.createdBy.name}, {c.createdBy.jobTitle}, on {day(c.createdAt)}
            </div>
          </div>
          <div className="section-heading" style={{ marginTop: 22 }}>
            <h2>Costs</h2>
          </div>
          <table className="cb-cost">
            <tbody>
              {c.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.description}</td>
                  <td>{money(i.amountKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="section-heading" style={{ marginTop: 22 }}>
            <h2>Donations</h2>
          </div>
          <ul className="cb-timeline">
            {c.donations.slice(0, 10).map((d) => (
              <li key={d.id}>
                <div>
                  <strong>
                    {d.anonymous ? `${d.donorName} (anonymous)` : d.donorName} · {money(d.amountKobo)}
                  </strong>
                  <small>{day(d.paidAt)}</small>
                </div>
              </li>
            ))}
          </ul>
          {!c.donations.length && <p className="muted text-sm">No donations yet.</p>}
        </aside>
      </div>

      <OrderMedicineDialog open={panel === "order"} onClose={() => setPanel(null)} campaignId={c.id} state={c.hospital.state} title={`${c.patientAlias}'s campaign`} />
      <Dialog open={panel === "pay"} onClose={() => setPanel(null)} title="Record a hospital payment" description={`Money paid to ${c.hospital.name} for this patient's treatment. ${money(c.availableKobo)} is available.`}>
        <form
          className="form-grid"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act("/console/disbursements", { campaignId: c.id, amountKobo: Math.round(Number(f.get("amount")) * 100), purpose: String(f.get("purpose")).trim(), evidence: String(f.get("evidence")).trim() }, "Payment recorded and shown on the campaign.");
          }}
        >
          <label>
            Amount (₦)
            <input name="amount" type="number" min={1} max={c.availableKobo / 100} required />
          </label>
          <label>
            What it paid for
            <input name="purpose" required minLength={5} placeholder="e.g. Haemodialysis sessions 1 and 2" />
          </label>
          <label>
            Receipt or transfer reference
            <input name="evidence" required minLength={3} placeholder="e.g. Hospital receipt BDTH-R-55120, transfer ref 0045..." />
          </label>
          <Button type="submit">
            <Receipt /> Record payment
          </Button>
        </form>
      </Dialog>
      <Dialog open={panel === "reject"} onClose={() => setPanel(null)} title="Ask for changes" description="The officer will see your note and can submit a corrected case.">
        <form
          className="form-grid"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            act(`/console/campaigns/${c.id}/review`, { decision: "reject", note: String(new FormData(e.currentTarget).get("note")).trim() }, "Sent back to the officer.");
          }}
        >
          <label>
            What needs to change
            <textarea name="note" required minLength={5} rows={4} placeholder="e.g. The hospital could not match this case number. Please check and resubmit." />
          </label>
          <Button type="submit">Send back</Button>
        </form>
      </Dialog>
      <Footer />
    </main>
  );
}
