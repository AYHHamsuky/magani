import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { categories, type Category } from "@/lib/format";
import type { PublicCampaign } from "@/lib/types";
import { CampaignCard, Failed, Footer, Loading, PageHeading } from "@/components/ui";

export default function Campaigns() {
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const q = useQuery({
    queryKey: ["campaigns", category, state],
    queryFn: () => api<PublicCampaign[]>(`/public/campaigns?category=${category}&state=${encodeURIComponent(state)}`),
  });
  const states = useQuery({ queryKey: ["hospital-states"], queryFn: () => api<{ states: string[] }>("/public/hospitals") });

  return (
    <main className="cb-page">
      <PageHeading eyebrow="Verified by the treating hospital" title="Campaigns" subtitle="Every patient here was referred by a government hospital and checked by CareBridge." />
      <div className="cb-filters">
        <select aria-label="Type of treatment" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All treatment</option>
          {(Object.keys(categories) as Category[]).map((c) => (
            <option key={c} value={c}>
              {categories[c]}
            </option>
          ))}
        </select>
        <select aria-label="State" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states</option>
          {states.data?.states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {q.isLoading ? <Loading /> : q.error ? <Failed what="campaigns" /> : (
        <div className="product-grid">
          {q.data!.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      )}
      {q.data && !q.data.length && <div className="empty">No campaigns match. Try another state or treatment.</div>}
      <Footer />
    </main>
  );
}
