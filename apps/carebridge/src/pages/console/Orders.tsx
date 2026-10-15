import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, useToast } from "@magani/ui";
import { Plus, RefreshCw } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { day, itemsText, money, orderPill, orderStatus } from "@/lib/format";
import type { ConsoleOrder, Money } from "@/lib/types";
import { OrderMedicineDialog } from "@/components/OrderMedicineDialog";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

/** Prescriptions sent to Magani pharmacies, with their live status. */
export function OrdersTable({ orders }: { orders: ConsoleOrder[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(o: ConsoleOrder, action: "refresh" | "cancel") {
    setBusy(o.id);
    try {
      await api(`/console/orders/${o.id}/${action}`, { method: "POST" });
      toast.success(action === "cancel" ? "Prescription cancelled at the pharmacy." : "Status updated from Magani.");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="table-wrap">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Pharmacy</th>
            <th>Paid from</th>
            <th>Cost</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                {itemsText(o.items)}
                <small>
                  For {o.patientName} · {o.fulfilment === "DELIVERY" ? "Delivery" : "Pickup"} · {day(o.createdAt)}
                </small>
              </td>
              <td>
                {o.pharmacyName}
                <small>{o.pharmacyLocation}</small>
              </td>
              <td>{o.campaign ? <Link to={`/console/cases/${o.campaign.id}`}>{o.campaign.patientAlias}</Link> : o.campaignId ? "This case" : "Medicine fund"}</td>
              <td>{o.totalKobo ? money(o.totalKobo) : <span className="muted">Pharmacy to confirm</span>}</td>
              <td>
                <span className={`pill ${orderPill(o.status)}`}>{orderStatus[o.status]}</span>
                {o.declineReason && <small>{o.declineReason}</small>}
                {o.status === "DISPENSED" && <small>{day(o.dispensedAt)}</small>}
              </td>
              <td>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" title="Refresh status from Magani" disabled={busy === o.id} onClick={() => act(o, "refresh")}>
                    <RefreshCw />
                  </Button>
                  {["SENT", "ACCEPTED", "READY"].includes(o.status) && (
                    <Button variant="ghost" size="sm" disabled={busy === o.id} onClick={() => act(o, "cancel")}>
                      Cancel
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <div className="empty">No prescriptions yet.</div>}
    </div>
  );
}

export default function Orders() {
  const { session } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const [ordering, setOrdering] = useState(false);
  const q = useQuery({ queryKey: ["console-orders"], queryFn: () => api<ConsoleOrder[]>("/console/orders"), refetchInterval: 20_000 });
  const fund = useQuery({ queryKey: ["fund-balance"], queryFn: () => api<Money>("/public/fund"), enabled: admin });

  return (
    <main className="page">
      <PageHeading
        title="Medicine"
        subtitle={admin ? `Prescriptions sent to Magani pharmacies · Medicine fund: ${fund.data ? money(fund.data.availableKobo) : "…"} available` : "Prescriptions for your hospital's patients, dispensed by Magani pharmacies"}
      >
        {admin && (
          <Button onClick={() => setOrdering(true)}>
            <Plus /> Order from medicine fund
          </Button>
        )}
      </PageHeading>
      {q.isLoading ? <Loading /> : q.error ? <Failed what="prescriptions" /> : <OrdersTable orders={q.data!} />}
      <p className="muted text-xs" style={{ marginTop: 12 }}>
        Statuses update automatically when the pharmacy accepts, prepares or dispenses. The cost is added to Payments once the medicine is dispensed.
      </p>
      {admin && <OrderMedicineDialog open={ordering} onClose={() => setOrdering(false)} campaignId={null} title="the Essential Medicine Fund" />}
      <Footer />
    </main>
  );
}
