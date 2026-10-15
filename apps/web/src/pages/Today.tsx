import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRefillActions } from "@/lib/refills";
import { addDays, lagosDate, longDate, money, useWorkspace } from "@/lib/workspace";
import { Button, ButtonLink } from "@magani/ui";
import { useShell } from "@/components/Shell";
import { LoadError, Loading, PageFooter, PageHeading, StockTable } from "@/components/care";
import {
  ArrowRight, ArrowUpRight, Check, Clock, HeartPulse, MessageSquare, Package, PackagePlus, PackageX, Plus, ShoppingBag,
  TrendingUp, TriangleAlert, Users,
} from "@magani/ui/icons";
import supplies from "@/assets/pharmacy-supplies.png";

type Kind = "Out of stock" | "Running low" | "Expiring soon";
const tabs = ["All", "Out of stock", "Running low", "Expiring soon"] as const;

function dueLabel(due: string, today: string) {
  if (due === today) return "Due today";
  if (due < today) return "Overdue";
  if (due === addDays(today, 1)) return "Due tomorrow";
  return "Due in 2 days";
}

export default function Today() {
  const ws = useWorkspace();
  const { openReceive } = useShell();
  const navigate = useNavigate();
  const refill = useRefillActions();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [showAll, setShowAll] = useState(false);

  if (ws.loading) return <Loading />;
  if (ws.error) return <LoadError />;

  const { today, products, patients } = ws;
  const out = products.filter((p) => p.health === "out");
  const low = products.filter((p) => p.health === "low");
  const due = patients
    .filter((p) => p.plan && p.plan.due <= addDays(today, 2))
    .sort((a, b) => a.plan!.due.localeCompare(b.plan!.due));
  const todaysSales = ws.sales.filter((s) => lagosDate(s.date) === today);
  const salesTotal = todaysSales.reduce((t, s) => t + s.total, 0);
  const saleCount = new Set(todaysSales.map((s) => s.saleId)).size;
  const needs = out.length + low.length + ws.expiring.length;

  const items = [
    ...out.map((p) => ({ key: p.id, name: p.name, productId: p.id, kind: "Out of stock" as Kind, detail: "No packs left. Record a delivery to restock.", danger: true })),
    ...low.map((p) => ({
      key: p.id,
      name: p.name,
      productId: p.id,
      kind: "Running low" as Kind,
      detail: Number.isFinite(p.cover)
        ? `${p.onHand} packs left · about ${Math.floor(p.cover)} days of cover`
        : `${p.onHand} packs left · at or below the reorder level`,
      danger: false,
    })),
    ...ws.expiring.map((b) => ({ key: b.id, name: b.product, productId: b.productId, kind: "Expiring soon" as Kind, detail: `Batch ${b.batchNo} · expires ${b.expiry}`, danger: false })),
  ].filter((i) => tab === "All" || i.kind === tab);

  const stats = [
    { label: "Today's sales", number: money(salesTotal), icon: ShoppingBag, bottom: `${saleCount} sale${saleCount === 1 ? "" : "s"} recorded`, good: true },
    { label: "Medicines in stock", number: products.filter((p) => p.onHand > 0).length, icon: Package, bottom: `${products.length} medicines in your catalogue` },
    { label: "Refills due", number: due.length, icon: HeartPulse, bottom: "Today and the next 2 days" },
    { label: "Patients in care", number: patients.length, icon: Users, bottom: "Active chronic-care patients" },
  ];

  return (
    <main className="page">
      <PageHeading title="Today" subtitle={longDate()}>
        <Button variant="outline" onClick={() => openReceive()}>
          <PackagePlus />
          Receive stock
        </Button>
        <ButtonLink to="/sell">
          <Plus />
          New sale
        </ButtonLink>
      </PageHeading>

      <section className="welcome">
        <div>
          <h2>A good day starts with a clear shelf.</h2>
          <p>
            {needs} stock item{needs === 1 ? " needs" : "s need"} your attention. And {due.length} patient{due.length === 1 ? " is" : "s are"} due for
            a refill.
            <br />
            Let’s keep your community’s care on track.
          </p>
        </div>
        <img src={supplies} alt="Medicine blister packs and pharmacy bottle" width={512} height={512} />
      </section>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-top">
              {s.label}
              <span className="stat-icon">
                <s.icon />
              </span>
            </div>
            <div className="stat-number">{s.number}</div>
            <div className="stat-bottom">
              {s.good && <TrendingUp size={12} className="inline mr-1 text-success" />}
              {s.bottom}
            </div>
          </div>
        ))}
      </div>

      <div className="work-grid">
        <div>
          <section>
            <div className="section-heading">
              <h2>
                Needs attention <span className="count-badge">{items.length}</span>
              </h2>
              <span className="text-[11px] muted">A little action goes a long way</span>
            </div>
            <div className="tabs">
              {tabs.map((t) => (
                <Button key={t} variant="ghost" className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
                  {t}
                  {t === "All" ? ` (${needs})` : ""}
                </Button>
              ))}
            </div>
            {items.slice(0, showAll ? 50 : 4).map((i) => (
              <div key={`${i.kind}-${i.key}`} className={`attention-row ${i.danger ? "danger" : ""}`}>
                <div className={`status-icon ${i.danger ? "danger" : ""}`}>
                  {i.danger ? <PackageX /> : i.kind === "Expiring soon" ? <Clock /> : <TriangleAlert />}
                </div>
                <div className="row-text">
                  <h3>
                    {i.name} <span className={`pill ${i.danger ? "out" : "low"}`}>{i.kind}</span>
                  </h3>
                  <p>{i.detail}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (i.kind === "Expiring soon" ? navigate("/stock") : openReceive(i.productId))}
                >
                  {i.kind === "Expiring soon" ? "View stock" : "Restock"}
                  <ArrowRight />
                </Button>
              </div>
            ))}
            {items.length > 4 && (
              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Show less" : `Show all ${items.length} items`}
                <ArrowRight />
              </Button>
            )}
            {!items.length && (
              <div className="empty">
                <Check className="mx-auto text-primary mb-3" />
                Nothing needs attention here.
              </div>
            )}
          </section>

          <section className="stock-overview">
            <div className="section-heading">
              <h2>Stock at a glance</h2>
              <ButtonLink to="/stock" variant="link" size="sm">
                View all stock
                <ArrowUpRight />
              </ButtonLink>
            </div>
            <StockTable products={products.slice(0, 5)} />
          </section>
        </div>

        <aside>
          <div className="section-heading">
            <h2>Upcoming refills</h2>
            <ButtonLink to="/patients" variant="ghost" size="icon" title="All patients">
              <ArrowUpRight />
            </ButtonLink>
          </div>
          <p className="text-xs muted mb-4">A timely reminder. Uninterrupted care.</p>
          <div className="refill-list">
            {due.slice(0, 4).map((p) => (
              <div className="refill-row" key={p.id}>
                <div className="refill-person">
                  <span className="avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.plan!.product} · {p.condition}
                    </small>
                  </div>
                </div>
                <div className="refill-meta">
                  <span className={`pill ${p.plan!.due <= today ? "low" : ""}`}>{dueLabel(p.plan!.due, today)}</span>
                  <span>{p.language} · SMS</span>
                </div>
                <div className="refill-actions">
                  <Button variant="outline" disabled={refill.busy} onClick={() => refill.remind(p)}>
                    <MessageSquare />
                    Remind
                  </Button>
                  <Button variant="secondary" disabled={refill.busy} onClick={() => refill.collect(p)}>
                    <Check />
                    Collected
                  </Button>
                </div>
              </div>
            ))}
            {!due.length && (
              <div className="empty">
                <Check className="mx-auto text-primary mb-3" />
                No refills due in the next 2 days.
              </div>
            )}
          </div>
          <ButtonLink to="/patients" variant="link" className="w-full mt-3 text-xs">
            View all patients
            <ArrowRight />
          </ButtonLink>
        </aside>
      </div>
      <PageFooter />
    </main>
  );
}
