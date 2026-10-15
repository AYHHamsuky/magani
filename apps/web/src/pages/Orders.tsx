import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useOrderAction, useOrders, type MedicineOrder, type OrderStatus } from "@/lib/queries";
import { lagosDate, money, useWorkspace, type Product } from "@/lib/workspace";
import { Button, Dialog, useToast } from "@magani/ui";
import { useShell } from "@/components/Shell";
import { LoadError, Loading, PageFooter, PageHeading } from "@/components/care";
import { Check, Inbox, Package, Truck } from "@magani/ui/icons";

const statusLabel: Record<OrderStatus, string> = {
  SENT: "New",
  ACCEPTED: "Accepted",
  READY: "Ready",
  DISPENSED: "Dispensed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};
const statusPill: Record<OrderStatus, string> = { SENT: "low", ACCEPTED: "", READY: "", DISPENSED: "", DECLINED: "out", CANCELLED: "out" };

const tabs = {
  "To do": ["SENT", "ACCEPTED", "READY"],
  Dispensed: ["DISPENSED"],
  Closed: ["DECLINED", "CANCELLED"],
} satisfies Record<string, OrderStatus[]>;
type Tab = keyof typeof tabs;

/** Best guess at which product a prescribed item refers to. */
function guess(item: MedicineOrder["items"][number], products: Product[]) {
  const name = item.medicine.toLowerCase();
  const strength = item.strength?.replace(/\s/g, "").toLowerCase();
  const byName = products.filter((p) => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase()) || p.category.toLowerCase().includes(name));
  return (strength && byName.find((p) => p.strength.replace(/\s/g, "").toLowerCase().includes(strength))) || byName[0];
}

export default function Orders() {
  const { session } = useAuth();
  const { openSettings } = useShell();
  const orders = useOrders();
  const ws = useWorkspace();
  const [tab, setTab] = useState<Tab>("To do");
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.isLoading || ws.loading) return <Loading />;
  if (orders.error || ws.error) return <LoadError />;

  const all = orders.data ?? [];
  const shown = all.filter((o) => (tabs[tab] as OrderStatus[]).includes(o.status));
  const open = all.find((o) => o.id === openId) ?? null;

  return (
    <main className="page">
      <PageHeading title="Orders" subtitle="Prescriptions sent by hospitals and partners · Dispensed first-expiry-first-out" />

      {!session!.pharmacy.acceptsOrders && (
        <section className="welcome">
          <div>
            <h2>Receive prescriptions from hospitals.</h2>
            <p>
              Turn on partner orders and hospitals connected to Magani can send prescriptions to your pharmacy for pickup or delivery.
              <br />
              Only registered pharmacies are listed to partners.
            </p>
          </div>
          <Button onClick={openSettings}>Turn on in Pharmacy settings</Button>
        </section>
      )}

      <div className="tabs">
        {(Object.keys(tabs) as Tab[]).map((t) => (
          <Button key={t} variant="ghost" className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
            {t} ({all.filter((o) => (tabs[t] as OrderStatus[]).includes(o.status)).length})
          </Button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Received</th>
              <th>From</th>
              <th>Patient</th>
              <th>Medicines</th>
              <th>Fulfilment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id}>
                <td>
                  {lagosDate(o.createdAt)}
                  <small>Ref {o.externalRef}</small>
                </td>
                <td>
                  <strong>{o.partner.name}</strong>
                  <small>{o.payer === "PARTNER" ? "Paid by partner" : "Patient pays"}</small>
                </td>
                <td>
                  {o.patient.name}
                  <small>{o.patient.phone}</small>
                </td>
                <td>
                  {o.items.map((i) => `${i.medicine}${i.strength ? ` ${i.strength}` : ""} ×${i.quantity}`).join(", ")}
                </td>
                <td>{o.fulfilment === "DELIVERY" ? "Delivery" : "Pickup"}</td>
                <td>
                  <span className={`pill ${statusPill[o.status]}`}>{statusLabel[o.status]}</span>
                </td>
                <td>
                  <Button variant="outline" size="sm" onClick={() => setOpenId(o.id)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <div className="empty">
            <Inbox className="mx-auto mb-3" />
            {tab === "To do" ? "No prescriptions waiting." : "Nothing here yet."}
          </div>
        )}
      </div>

      <OrderDialog order={open} products={ws.products} onClose={() => setOpenId(null)} />
      <PageFooter />
    </main>
  );
}

function OrderDialog({ order, products, onClose }: { order: MedicineOrder | null; products: Product[]; onClose: () => void }) {
  const act = useOrderAction();
  const toast = useToast();
  const [declining, setDeclining] = useState(false);

  function run(action: "accept" | "ready" | "dispense" | "decline", body?: Parameters<typeof act.mutate>[0]["body"], done?: string) {
    act.mutate(
      { id: order!.id, action, body },
      {
        onSuccess: (r) => {
          if (done) toast.success(done);
          r.warnings?.forEach((w) => toast.info(w));
          setDeclining(false);
          if (action === "dispense" || action === "decline") onClose();
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not reach the server."),
      },
    );
  }

  return (
    <Dialog
      open={!!order}
      onClose={() => {
        setDeclining(false);
        onClose();
      }}
      title={order ? `Order from ${order.partner.name}` : ""}
      description={
        order && (
          <>
            For <strong>{order.patient.name}</strong> ({order.patient.phone}) · {order.fulfilment === "DELIVERY" ? `Deliver to ${order.deliveryAddress}` : "Patient will pick up"}
            {order.prescriber && <> · Prescribed by {order.prescriber}</>}
          </>
        )
      }
    >
      {order && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (declining) return run("decline", { reason: String(f.get("reason") ?? "") }, "Order declined. The partner has been told.");
            run("accept", { items: order.items.map((i) => ({ itemId: i.id, productId: String(f.get(`item-${i.id}`)) })) }, "Order accepted. Total sent to the partner.");
          }}
        >
          {order.items.map((i) =>
            order.status === "SENT" ? (
              <label key={i.id}>
                {i.medicine} {i.strength} × {i.quantity}
                {i.instructions && <span className="muted text-xs"> · {i.instructions}</span>}
                <select name={`item-${i.id}`} required defaultValue={guess(i, products)?.id ?? ""}>
                  <option value="" disabled>
                    Choose the product to dispense
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.onHand < i.quantity}>
                      {p.name} {p.strength} · {p.onHand} packs · {money(p.price)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div key={i.id} className="basket-item">
                <strong className="text-sm">
                  {i.medicine} {i.strength} × {i.quantity}
                </strong>
                <div className="muted text-xs">
                  {i.dispensedAs ? `Dispense as ${i.dispensedAs.name} ${i.dispensedAs.strength ?? ""} · ${money(i.dispensedAs.unitPriceKobo * i.quantity)}` : "Not matched"}
                  {i.instructions && ` · ${i.instructions}`}
                </div>
              </div>
            ),
          )}
          {order.note && <p className="text-sm text-muted-foreground">Note: {order.note}</p>}
          {order.totalKobo !== null && (
            <div className="basket-total">
              <span>Total</span>
              <span>{money(order.totalKobo)}</span>
            </div>
          )}
          {order.declineReason && <p className="text-sm text-muted-foreground">Declined: {order.declineReason}</p>}

          {declining && (
            <label>
              Why are you declining?
              <input name="reason" required minLength={3} placeholder="e.g. Out of stock until Friday" />
            </label>
          )}

          {order.status === "SENT" && !declining && (
            <Button type="submit" disabled={act.isPending}>
              <Check />
              Accept order
            </Button>
          )}
          {order.status === "ACCEPTED" && !declining && (
            <Button variant="outline" disabled={act.isPending} onClick={() => run("ready", undefined, "Marked ready. The partner has been told.")}>
              {order.fulfilment === "DELIVERY" ? <Truck /> : <Package />}
              Mark ready for {order.fulfilment === "DELIVERY" ? "delivery" : "pickup"}
            </Button>
          )}
          {(order.status === "ACCEPTED" || order.status === "READY") && !declining && (
            <Button disabled={act.isPending} onClick={() => run("dispense", undefined, "Dispensed. Stock updated and the partner has been told.")}>
              <Check />
              Dispense and close order
            </Button>
          )}
          {["SENT", "ACCEPTED", "READY"].includes(order.status) &&
            (declining ? (
              <>
                <Button type="submit" variant="outline" disabled={act.isPending}>
                  Decline order
                </Button>
                <Button variant="ghost" onClick={() => setDeclining(false)}>
                  Keep order
                </Button>
              </>
            ) : (
              <Button variant="ghost" className="text-muted-foreground" onClick={() => setDeclining(true)}>
                Decline…
              </Button>
            ))}
        </form>
      )}
    </Dialog>
  );
}
