import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, useToast } from "@magani/ui";
import { Check } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { day, money } from "@/lib/format";
import type { Disbursement } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

export default function Payments() {
  const { session } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const toast = useToast();
  const qc = useQueryClient();
  const [settling, setSettling] = useState<Disbursement | null>(null);
  const q = useQuery({ queryKey: ["disbursements"], queryFn: () => api<Disbursement[]>("/console/disbursements") });
  const due = (q.data ?? []).filter((d) => d.status === "DUE");

  async function settle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api(`/console/disbursements/${settling!.id}/paid`, { body: { evidence: String(new FormData(e.currentTarget).get("evidence")).trim() } });
      toast.success("Marked as paid. Donors can see it on the campaign.");
      setSettling(null);
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <main className="page">
      <PageHeading title="Payments" subtitle={`Money paid to hospitals and pharmacies · ${money(due.reduce((t, d) => t + d.amountKobo, 0))} owed to pharmacies`} />
      {q.isLoading ? <Loading /> : q.error ? <Failed what="payments" /> : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Paid to</th>
                <th>For</th>
                <th>From</th>
                <th>Amount</th>
                <th>Status</th>
                {admin && <th />}
              </tr>
            </thead>
            <tbody>
              {q.data!.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.payeeName}</strong>
                    <small>{d.payeeType === "HOSPITAL" ? "Hospital" : "Pharmacy"} · {day(d.createdAt)}</small>
                  </td>
                  <td>
                    {d.purpose}
                    <small>{d.evidence}</small>
                  </td>
                  <td>{d.campaign ? <Link to={`/console/cases/${d.campaign.id}`}>{d.campaign.patientAlias}</Link> : "Medicine fund"}</td>
                  <td>{money(d.amountKobo)}</td>
                  <td>
                    <span className={`pill ${d.status === "DUE" ? "low" : ""}`}>{d.status === "DUE" ? "Owed" : `Paid ${day(d.paidAt)}`}</span>
                  </td>
                  {admin && (
                    <td>
                      {d.status === "DUE" && (
                        <Button variant="outline" size="sm" onClick={() => setSettling(d)}>
                          Mark paid
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data!.length && <div className="empty">No payments yet.</div>}
        </div>
      )}
      <Dialog open={!!settling} onClose={() => setSettling(null)} title="Mark as paid" description={settling ? `${money(settling.amountKobo)} to ${settling.payeeName}.` : ""}>
        <form className="form-grid" onSubmit={settle}>
          <label>
            Transfer reference
            <input name="evidence" required minLength={3} placeholder="e.g. Paystack transfer TRF_1a2b3c" />
          </label>
          <Button type="submit">
            <Check /> Confirm payment
          </Button>
        </form>
      </Dialog>
      <Footer />
    </main>
  );
}
