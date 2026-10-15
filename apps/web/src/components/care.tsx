import type { ReactNode } from "react";
import type { Product } from "@/lib/workspace";
import { Button } from "@magani/ui";
import { HeartPulse, Plus } from "@magani/ui/icons";
import { useShell } from "./Shell";

/** Days of cover as a blister pack: ten capsules, three days each. */
export function BlisterMeter({ product }: { product: Product }) {
  const { cover, health } = product;
  const days = Number.isFinite(cover) ? Math.floor(cover) : null;
  return (
    <div className="cover-cell">
      <div className={`blister ${health}`} role="img" aria-label={`${days ?? "More than 30"} days of stock`}>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={`capsule ${i < Math.ceil(cover / 3) ? "filled" : ""}`} />
        ))}
      </div>
      <span>{days ?? "30+"} days</span>
    </div>
  );
}

export function HealthPill({ product }: { product: Product }) {
  const h = product.health;
  return <span className={`pill ${h}`}>{h === "out" ? "Out of stock" : h === "low" ? "Running low" : "Healthy"}</span>;
}

export function PageHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">Your pharmacy, at a glance</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

export function PageFooter() {
  return (
    <footer className="page-footer">
      <span>Made for the people who keep communities healthy.</span>
      <span>Magani · Care in every count</span>
    </footer>
  );
}

export function StockTable({ products }: { products: Product[] }) {
  const { openReceive } = useShell();
  return (
    <div className="table-wrap">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>On hand</th>
            <th>Days of cover</th>
            <th>Stock health</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>
                  {p.name}
                  {p.chronic && <HeartPulse className="inline ml-2 text-primary" size={12} aria-label="Chronic care" />}
                </strong>
                <small>{p.strength}</small>
              </td>
              <td>
                {p.onHand} <span className="muted text-[11px]">packs</span>
              </td>
              <td>
                <BlisterMeter product={p} />
              </td>
              <td>
                <HealthPill product={p} />
              </td>
              <td>
                <Button variant="ghost" size="icon" title={`Receive ${p.name}`} onClick={() => openReceive(p.id)}>
                  <Plus size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!products.length && <div className="empty">No medicines yet.</div>}
    </div>
  );
}

export function Loading() {
  return <main className="page"><div className="empty">Opening your pharmacy…</div></main>;
}

export function LoadError() {
  return <main className="page"><div className="empty">Could not load your pharmacy. Refresh to try again.</div></main>;
}
