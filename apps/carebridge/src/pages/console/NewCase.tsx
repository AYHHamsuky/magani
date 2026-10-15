import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, useToast } from "@magani/ui";
import { Plus, Trash2 } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { categories, money, type Category } from "@/lib/format";
import { Footer, PageHeading } from "@/components/ui";

export default function NewCase() {
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [items, setItems] = useState([{ description: "", naira: 0 }]);
  const [busy, setBusy] = useState(false);
  const total = items.reduce((t, i) => t + (i.naira || 0), 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    try {
      const c = await api<{ id: string }>("/console/campaigns", {
        body: {
          title: s("title"),
          patientAlias: s("patientAlias"),
          patientName: s("patientName"),
          patientPhone: s("patientPhone"),
          story: s("story"),
          category: s("category"),
          caseReference: s("caseReference"),
          consent: f.get("consent") === "on",
          items: items.filter((i) => i.description.trim()).map((i) => ({ description: i.description.trim(), amountKobo: Math.round(i.naira * 100) })),
        },
      });
      toast.success("Case submitted. CareBridge will review it before it goes public.");
      await qc.invalidateQueries();
      navigate(`/console/cases/${c.id}`);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <PageHeading title="Submit a case" subtitle="Nothing is public until a CareBridge reviewer has checked it with your hospital." />
      <form className="form-grid cb-panel" style={{ maxWidth: 760 }} onSubmit={submit}>
        <label>
          Campaign title
          <input name="title" required minLength={8} maxLength={120} placeholder="e.g. Six dialysis sessions for Ibrahim" />
        </label>
        <div className="form-pair">
          <label>
            Public name
            <input name="patientAlias" required minLength={2} maxLength={40} placeholder="First name and age, e.g. Ibrahim, 37" />
          </label>
          <label>
            Type of treatment
            <select name="category" required>
              {(Object.keys(categories) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {categories[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-pair">
          <label>
            Patient's full name (private)
            <input name="patientName" required minLength={2} />
          </label>
          <label>
            Patient's phone (private)
            <input name="patientPhone" type="tel" required pattern="\+?[0-9]{10,14}" placeholder="08031234567" />
          </label>
        </div>
        <label>
          Hospital case or admission number (private)
          <input name="caseReference" required placeholder="e.g. BDTH/NEP/2026/0077" />
        </label>
        <label>
          The patient's story
          <textarea name="story" required minLength={60} maxLength={3000} rows={6} placeholder="Who they are, what treatment they need, and why the family cannot pay. Do not include the full name." />
        </label>

        <strong className="text-sm">Treatment costs (from the hospital's charges or pharmacy prices)</strong>
        {items.map((it, n) => (
          <div className="cb-cost-row" key={n}>
            <label>
              Item
              <input value={it.description} onChange={(e) => setItems(items.map((x, i) => (i === n ? { ...x, description: e.target.value } : x)))} required={n === 0} placeholder="e.g. Haemodialysis session ×6" />
            </label>
            <label>
              Cost (₦)
              <input type="number" min={1} step="1" value={it.naira || ""} onChange={(e) => setItems(items.map((x, i) => (i === n ? { ...x, naira: Number(e.target.value) } : x)))} required={n === 0} />
            </label>
            <Button variant="ghost" size="icon" title="Remove item" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== n))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="justify-start" onClick={() => setItems([...items, { description: "", naira: 0 }])}>
          <Plus /> Add cost item
        </Button>
        <div className="basket-total">
          <span>Campaign target</span>
          <span>{money(total * 100)}</span>
        </div>
        <label className="consent">
          <input name="consent" type="checkbox" required />
          The patient (or their guardian) agrees to a public campaign using their first name, age, story and treatment costs.
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
      </form>
      <Footer />
    </main>
  );
}
