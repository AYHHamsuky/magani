import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, useToast } from "@magani/ui";
import { HandHeart } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { money } from "@/lib/format";

const presets = [200_000, 500_000, 1_000_000, 2_500_000];

/** Donate to one campaign (slug) or, without a slug, to the Essential Medicine Fund. */
export function DonateDialog({ open, onClose, slug, title }: { open: boolean; onClose: () => void; slug?: string; title: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500_000);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await api<{ status: string; reference: string; authorizationUrl?: string }>("/public/donations", {
        body: {
          campaignSlug: slug,
          donorName: String(f.get("name")).trim(),
          donorEmail: String(f.get("email")).trim(),
          anonymous: f.get("anonymous") === "on",
          message: String(f.get("message") ?? "").trim() || undefined,
          amountKobo: Math.round(Number(f.get("amount")) * 100),
        },
      });
      if (r.authorizationUrl) {
        window.location.href = r.authorizationUrl;
        return;
      }
      await qc.invalidateQueries();
      onClose();
      navigate(`/donate/thanks?reference=${r.reference}`);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Make a donation" description={`For ${title}. Your money is paid to the hospital or pharmacy treating the patient, never to a personal account.`}>
      <form className="form-grid" onSubmit={submit}>
        <div className="cb-amounts" role="group" aria-label="Suggested amounts">
          {presets.map((p) => (
            <Button key={p} variant="outline" size="sm" aria-pressed={amount === p} onClick={() => setAmount(p)}>
              {money(p)}
            </Button>
          ))}
        </div>
        <label>
          Amount (₦)
          <input name="amount" type="number" min="500" step="100" required value={amount / 100} onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100))} />
        </label>
        <div className="form-pair">
          <label>
            Your name
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          <label>
            Email for your receipt
            <input name="email" type="email" required autoComplete="email" />
          </label>
        </div>
        <label>
          Message of support (optional)
          <input name="message" maxLength={280} placeholder="e.g. Get well soon" />
        </label>
        <label className="consent">
          <input name="anonymous" type="checkbox" />
          Show my donation as anonymous
        </label>
        <Button type="submit" disabled={busy}>
          <HandHeart />
          {busy ? "Please wait…" : `Donate ${money(amount)}`}
        </Button>
      </form>
    </Dialog>
  );
}
