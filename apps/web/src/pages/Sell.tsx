import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useSale } from "@/lib/queries";
import { lagosDate, money, useWorkspace } from "@/lib/workspace";
import { Button } from "@magani/ui";
import { useToast } from "@magani/ui";
import { BlisterMeter, HealthPill, LoadError, Loading, PageFooter, PageHeading } from "@/components/care";
import { Check, Package, Plus, Search, ShoppingBag, Trash2 } from "@magani/ui/icons";

interface Line { productId: string; quantity: number }

export default function Sell() {
  const ws = useWorkspace();
  const sale = useSale();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [basket, setBasket] = useState<Line[]>([]);

  if (ws.loading) return <Loading />;
  if (ws.error) return <LoadError />;

  const product = (id: string) => ws.products.find((p) => p.id === id);
  const total = basket.reduce((t, l) => t + (product(l.productId)?.price ?? 0) * l.quantity, 0);

  function add(id: string) {
    const p = product(id)!;
    const line = basket.find((l) => l.productId === id);
    if ((line?.quantity ?? 0) >= p.onHand) return toast.error("No more unexpired stock available.");
    setBasket(line ? basket.map((l) => (l.productId === id ? { ...l, quantity: l.quantity + 1 } : l)) : [...basket, { productId: id, quantity: 1 }]);
  }

  function complete() {
    sale.mutate(
      { items: basket.map((l) => ({ productId: l.productId, quantity: l.quantity, priceKobo: product(l.productId)!.price })) },
      {
        onSuccess: (r) => {
          setBasket([]);
          toast.success("Sale recorded. Stock updated.");
          r.warnings.forEach((w) => toast.info(w));
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not record the sale."),
      },
    );
  }

  return (
    <main className="page">
      <PageHeading title="New sale" subtitle="The right medicine. The right count." />
      <div className="sell-layout">
        <div>
          <div className="searchbar">
            <div className="searchbox">
              <Search />
              <input aria-label="Search sale medicines" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a medicine…" />
            </div>
          </div>
          <div className="product-grid">
            {ws.products
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <article className="product-card" key={p.id}>
                  <div className="flex justify-between">
                    <Package className="text-primary" size={22} />
                    <HealthPill product={p} />
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.strength}</p>
                  <BlisterMeter product={p} />
                  <div className="product-card-bottom">
                    <strong>{money(p.price)}</strong>
                    <Button size="sm" variant="outline" disabled={p.onHand === 0} onClick={() => add(p.id)}>
                      <Plus />
                      Add
                    </Button>
                  </div>
                </article>
              ))}
          </div>
        </div>

        <aside className="basket">
          <h2>
            Current sale <span className="count-badge">{basket.length}</span>
          </h2>
          {!basket.length && (
            <div className="empty">
              <ShoppingBag className="mx-auto mb-3" />
              Your counter is ready.
              <br />
              Add a medicine to start.
            </div>
          )}
          {basket.map((l) => {
            const p = product(l.productId);
            return (
              <div className="basket-item" key={l.productId}>
                <strong className="text-sm">{p?.name}</strong>
                <div className="flex items-center justify-between mt-2">
                  <label className="w-20">
                    Packs
                    <input
                      aria-label={`Quantity of ${p?.name}`}
                      type="number"
                      value={l.quantity}
                      min="1"
                      max={p?.onHand}
                      onChange={(e) =>
                        setBasket(basket.map((x) => (x.productId === l.productId ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))
                      }
                    />
                  </label>
                  <Button variant="ghost" size="icon" title="Remove medicine" onClick={() => setBasket(basket.filter((x) => x.productId !== l.productId))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="basket-total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <Button className="w-full" disabled={!basket.length || sale.isPending} onClick={complete}>
            <Check />
            {sale.isPending ? "Recording…" : "Complete sale"}
          </Button>
        </aside>
      </div>

      <section className="mt-10">
        <div className="section-heading">
          <h2>Recent sales</h2>
        </div>
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Packs</th>
                <th>Amount</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {ws.sales.slice(0, 8).map((s) => (
                <tr key={s.id}>
                  <td>{s.product}</td>
                  <td>{s.quantity}</td>
                  <td>{money(s.total)}</td>
                  <td>{lagosDate(s.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ws.sales.length && <div className="empty">No sales in the last 7 days.</div>}
        </div>
      </section>
      <PageFooter />
    </main>
  );
}
