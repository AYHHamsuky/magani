import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, useToast } from "@magani/ui";
import { Plus, Search, Trash2, Truck } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import type { OrderItem, Pharmacy } from "@/lib/types";

type Availability = { results: { medicine: string; available: boolean; matches: { name: string; strength: string | null; inStock: boolean }[] }[] };

/**
 * Send a prescription to a registered pharmacy on Magani. Paid from a campaign, or from the
 * Essential Medicine Fund when campaignId is null (admins only; patient details entered here).
 */
export function OrderMedicineDialog({ open, onClose, campaignId, state, title }: { open: boolean; onClose: () => void; campaignId: string | null; state?: string; title: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [stateFilter, setStateFilter] = useState(state ?? "");
  const [pharmacyId, setPharmacyId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ medicine: "", strength: "", quantity: 1 }]);
  const [delivery, setDelivery] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);

  const pharmacies = useQuery({
    queryKey: ["pharmacies", stateFilter],
    queryFn: () => api<Pharmacy[]>(`/console/pharmacies${stateFilter ? `?state=${encodeURIComponent(stateFilter)}` : ""}`),
    enabled: open,
  });
  const pharmacy = pharmacies.data?.find((p) => p.id === pharmacyId);
  const filled = items.filter((i) => i.medicine.trim().length >= 2);

  const setItem = (n: number, patch: Partial<OrderItem>) => {
    setItems(items.map((it, i) => (i === n ? { ...it, ...patch } : it)));
    setAvailability(null);
  };

  async function check() {
    try {
      setAvailability(await api<Availability>(`/console/pharmacies/${pharmacyId}/availability`, { body: { medicines: filled.map((i) => i.medicine.trim()) } }));
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pharmacy) return toast.error("Choose a pharmacy");
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim() || undefined;
    setBusy(true);
    try {
      await api("/console/orders", {
        body: {
          campaignId,
          pharmacy,
          patientName: s("patientName"),
          patientPhone: s("patientPhone"),
          prescriber: s("prescriber"),
          fulfilment: delivery ? "DELIVERY" : "PICKUP",
          deliveryAddress: delivery ? s("deliveryAddress") : undefined,
          items: filled.map((i) => ({ medicine: i.medicine.trim(), strength: i.strength?.trim() || undefined, quantity: i.quantity, instructions: i.instructions?.trim() || undefined })),
        },
      });
      toast.success(`Prescription sent to ${pharmacy.name}. You will see each update here.`);
      await qc.invalidateQueries();
      setItems([{ medicine: "", strength: "", quantity: 1 }]);
      setAvailability(null);
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Order medicine" description={`Sent to a registered pharmacy on Magani and paid from ${title}. The pharmacy confirms the price before dispensing.`}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-pair">
          <label>
            State
            <input value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} placeholder="All states" />
          </label>
          <label>
            Pharmacy
            <select required value={pharmacyId} onChange={(e) => { setPharmacyId(e.target.value); setAvailability(null); }}>
              <option value="" disabled>
                {pharmacies.isLoading ? "Loading pharmacies…" : pharmacies.error ? "Magani is unreachable" : pharmacies.data?.length ? "Choose a pharmacy" : "No pharmacies in this state"}
              </option>
              {pharmacies.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.lga}
                </option>
              ))}
            </select>
          </label>
        </div>

        {campaignId === null && (
          <div className="form-pair">
            <label>
              Patient's full name
              <input name="patientName" required minLength={2} />
            </label>
            <label>
              Patient's phone
              <input name="patientPhone" type="tel" required pattern="\+?[0-9]{10,14}" />
            </label>
          </div>
        )}

        {items.map((it, n) => {
          const a = availability?.results.find((r) => r.medicine.toLowerCase() === it.medicine.trim().toLowerCase());
          return (
            <div key={n}>
              <div className="cb-items-row">
                <label>
                  Medicine
                  <input value={it.medicine} onChange={(e) => setItem(n, { medicine: e.target.value })} placeholder="e.g. Metformin" required={n === 0} />
                </label>
                <label>
                  Strength
                  <input value={it.strength ?? ""} onChange={(e) => setItem(n, { strength: e.target.value })} placeholder="500mg" />
                </label>
                <label>
                  Packs
                  <input type="number" min={1} value={it.quantity} onChange={(e) => setItem(n, { quantity: Math.max(1, Number(e.target.value)) })} />
                </label>
                <Button variant="ghost" size="icon" title="Remove medicine" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== n))}>
                  <Trash2 />
                </Button>
              </div>
              {a && (
                <small className={a.available ? "text-primary text-xs" : "muted text-xs"}>
                  {a.available ? `In stock: ${a.matches.filter((m) => m.inStock).map((m) => `${m.name} ${m.strength ?? ""}`).join(", ")}` : "Not in stock at this pharmacy"}
                </small>
              )}
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { medicine: "", strength: "", quantity: 1 }])}>
            <Plus /> Add medicine
          </Button>
          <Button variant="outline" size="sm" disabled={!pharmacyId || !filled.length} onClick={check}>
            <Search /> Check stock
          </Button>
        </div>

        <label>
          Prescribed by (optional)
          <input name="prescriber" placeholder="e.g. Dr. Amina Yusuf, Medical Outpatients" />
        </label>
        <label className="consent">
          <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
          Deliver to the patient (otherwise the patient picks up)
        </label>
        {delivery && (
          <label>
            Delivery address
            <input name="deliveryAddress" required minLength={5} />
          </label>
        )}
        <Button type="submit" disabled={busy || !pharmacyId || !filled.length}>
          <Truck />
          {busy ? "Sending…" : "Send prescription"}
        </Button>
      </form>
    </Dialog>
  );
}
