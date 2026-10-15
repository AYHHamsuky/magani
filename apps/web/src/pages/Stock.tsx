import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@magani/ui";
import { useShell } from "@/components/Shell";
import { LoadError, Loading, PageFooter, PageHeading, StockTable } from "@/components/care";
import { PackagePlus, Plus, Search } from "@magani/ui/icons";

const filters = ["All medicines", "Chronic care", "Running low"] as const;

export default function Stock() {
  const ws = useWorkspace();
  const { openReceive, openProduct } = useShell();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All medicines");

  if (ws.loading) return <Loading />;
  if (ws.error) return <LoadError />;

  const shown = ws.products.filter(
    (p) =>
      `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All medicines" || (filter === "Chronic care" && p.chronic) || (filter === "Running low" && p.health !== "good")),
  );

  return (
    <main className="page">
      <PageHeading title="Stock" subtitle={`${ws.products.length} medicines · Every pack accounted for`}>
        <Button variant="outline" onClick={openProduct}>
          <Plus />
          Add medicine
        </Button>
        <Button onClick={() => openReceive()}>
          <PackagePlus />
          Receive stock
        </Button>
      </PageHeading>
      <div className="searchbar">
        <div className="searchbox">
          <Search />
          <input
            aria-label="Search medicines"
            placeholder="Search medicines or generic names…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="max-w-40" aria-label="Filter stock" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          {filters.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <StockTable products={shown} />
      <PageFooter />
    </main>
  );
}
