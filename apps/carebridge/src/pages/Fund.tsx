import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@magani/ui";
import { HandHeart } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { day, itemsText, money, orderStatus } from "@/lib/format";
import type { Money, OrderItem } from "@/lib/types";
import { DonateDialog } from "@/components/DonateDialog";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

interface Fund extends Money {
  donations: { name: string; amountKobo: number; message: string | null; paidAt: string }[];
  medicineOrders: { pharmacy: string; status: string; items: OrderItem[]; createdAt: string; dispensedAt: string | null }[];
}

export default function FundPage() {
  const [donating, setDonating] = useState(false);
  const q = useQuery({ queryKey: ["fund"], queryFn: () => api<Fund>("/public/fund") });

  return (
    <main className="cb-page">
      <PageHeading
        eyebrow="Chronic care that does not stop"
        title="Essential Medicine Fund"
        subtitle="Pays registered pharmacies to dispense insulin, blood pressure and other chronic-care medicine for patients referred by partner hospitals."
      >
        <Button onClick={() => setDonating(true)}>
          <HandHeart />
          Give to the fund
        </Button>
      </PageHeading>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <Failed what="the fund" /> : (
        <>
          <div className="stats">
            {[
              { label: "Given to the fund", value: money(q.data.raisedKobo), bottom: `${q.data.donors} donations` },
              { label: "Spent on medicine", value: money(q.data.committedKobo), bottom: "Dispensed by pharmacies" },
              { label: "Available now", value: money(q.data.availableKobo), bottom: "For the next prescriptions" },
              { label: "Prescriptions", value: q.data.medicineOrders.length, bottom: "Sent to Magani pharmacies" },
            ].map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-top">{s.label}</div>
                <div className="stat-number">{s.value}</div>
                <div className="stat-bottom">{s.bottom}</div>
              </div>
            ))}
          </div>
          <div className="work-grid">
            <section>
              <div className="section-heading">
                <h2>Prescriptions paid by the fund</h2>
              </div>
              <div className="table-wrap">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Pharmacy</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.medicineOrders.map((o, i) => (
                      <tr key={i}>
                        <td>{itemsText(o.items)}</td>
                        <td>{o.pharmacy}</td>
                        <td>
                          <span className={`pill ${o.status === "DISPENSED" ? "" : "low"}`}>{orderStatus[o.status]}</span>
                        </td>
                        <td>{day(o.dispensedAt ?? o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!q.data.medicineOrders.length && <div className="empty">No prescriptions paid from the fund yet.</div>}
              </div>
            </section>
            <aside>
              <div className="section-heading">
                <h2>Recent gifts</h2>
              </div>
              <ul className="cb-timeline">
                {q.data.donations.map((d, i) => (
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
            </aside>
          </div>
        </>
      )}
      <DonateDialog open={donating} onClose={() => setDonating(false)} title="the Essential Medicine Fund" />
      <Footer />
    </main>
  );
}
