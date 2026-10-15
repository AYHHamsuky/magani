import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@magani/ui";
import { Building, HandHeart, MapPin } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { categories, day, itemsText, money, orderStatus, pct } from "@/lib/format";
import type { CampaignDetail } from "@/lib/types";
import { DonateDialog } from "@/components/DonateDialog";
import { Failed, Footer, Loading, Progress, VerifiedBadge } from "@/components/ui";
import { hospitalTypes } from "@/lib/format";

export default function Campaign() {
  const { slug } = useParams();
  const [donating, setDonating] = useState(false);
  const q = useQuery({ queryKey: ["campaign", slug], queryFn: () => api<CampaignDetail>(`/public/campaigns/${slug}`) });

  if (q.isLoading) return <main className="cb-page"><Loading /></main>;
  if (q.error || !q.data) return <main className="cb-page"><Failed what="this campaign" /></main>;
  const c = q.data;

  // One timeline of where the money went, newest first.
  const events = [
    ...c.disbursements.map((d) => ({
      at: d.paidAt ?? d.createdAt,
      title: `${money(d.amountKobo)} ${d.status === "PAID" ? "paid" : "owed"} to ${d.payeeName}`,
      detail: d.purpose,
    })),
    ...c.medicineOrders
      .filter((o) => o.status !== "DISPENSED")
      .map((o) => ({ at: o.createdAt, title: `Prescription ${orderStatus[o.status].toLowerCase()} · ${o.pharmacy}`, detail: itemsText(o.items) })),
    ...(c.liveAt ? [{ at: c.liveAt, title: "Campaign verified and published", detail: `Checked with ${c.hospital.name}` }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <main className="cb-page">
      <div className="cb-detail">
        <article>
          <div className="eyebrow">{categories[c.category]}</div>
          <h1 className="font-heading" style={{ fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.1, margin: "10px 0 14px" }}>
            {c.title}
          </h1>
          <p className="cb-card-hospital" style={{ marginBottom: 24 }}>
            <Building size={15} /> {c.hospital.name} · {hospitalTypes[c.hospital.type]} <MapPin size={15} /> {c.hospital.lga}, {c.hospital.state}{" "}
            <VerifiedBadge verified={c.hospital.verified} />
          </p>

          <section className="cb-panel" style={{ marginBottom: 20 }}>
            <h2>About {c.patientAlias}</h2>
            <p className="cb-story">{c.story}</p>
          </section>

          <section className="cb-panel" style={{ marginBottom: 20 }}>
            <h2>What the money pays for</h2>
            <table className="cb-cost">
              <tbody>
                {c.costItems.map((i) => (
                  <tr key={i.description}>
                    <td>{i.description}</td>
                    <td>{money(i.amountKobo)}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>{money(c.targetKobo)}</td>
                </tr>
              </tbody>
            </table>
            <p className="muted text-xs" style={{ marginTop: 10 }}>Costs come from the hospital's own charges and the pharmacy's prices.</p>
          </section>

          <section className="cb-panel">
            <h2>Where the money has gone</h2>
            {events.length ? (
              <ol className="cb-timeline">
                {events.map((e, i) => (
                  <li key={i}>
                    <div>
                      <strong>{e.title}</strong>
                      <small>
                        {day(e.at)} · {e.detail}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Nothing has been paid out yet.</p>
            )}
          </section>
        </article>

        <aside className="cb-sticky">
          <div className="cb-panel">
            <div className="cb-big-number">{money(c.raisedKobo)}</div>
            <p className="muted text-sm" style={{ margin: "6px 0 14px" }}>
              raised of {money(c.targetKobo)} · {c.donors} donors · {pct(c.raisedKobo, c.targetKobo)}%
            </p>
            <Progress raised={c.raisedKobo} target={c.targetKobo} />
            <div className="basket-total" style={{ marginTop: 16 }}>
              <span>Paid to care so far</span>
              <span>{money(c.committedKobo)}</span>
            </div>
            {c.status === "LIVE" ? (
              <Button className="w-full" onClick={() => setDonating(true)}>
                <HandHeart />
                Donate
              </Button>
            ) : (
              <p className="muted text-sm">This campaign is {c.status === "FUNDED" ? "fully funded. Thank you." : "closed."}</p>
            )}
          </div>
          <div className="cb-panel">
            <h2>Recent donations</h2>
            {c.donations.length ? (
              <ul className="cb-timeline">
                {c.donations.slice(0, 8).map((d, i) => (
                  <li key={i}>
                    <div>
                      <strong>
                        {d.name} · {money(d.amountKobo)}
                      </strong>
                      <small>
                        {day(d.paidAt)}
                        {d.message && ` · “${d.message}”`}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted text-sm">Be the first to give.</p>
            )}
          </div>
        </aside>
      </div>
      <DonateDialog open={donating} onClose={() => setDonating(false)} slug={c.slug} title={c.patientAlias} />
      <Footer />
    </main>
  );
}
