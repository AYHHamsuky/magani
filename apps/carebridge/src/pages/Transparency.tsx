import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Money } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

interface Ledger {
  hospitals: { hospital: { id: string; name: string; state: string; lga: string }; campaigns: number; raisedKobo: number; toHospitalKobo: number; toPharmaciesKobo: number }[];
  fund: Money;
}

export default function Transparency() {
  const q = useQuery({ queryKey: ["ledger"], queryFn: () => api<Ledger>("/public/ledger") });
  return (
    <main className="cb-page">
      <PageHeading
        eyebrow="Public ledger"
        title="Transparency"
        subtitle="How much was given for patients at each hospital, and how much has been paid to the hospital and to pharmacies for medicine."
      />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <Failed what="the ledger" /> : (
        <>
          <div className="table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Campaigns</th>
                  <th>Donated</th>
                  <th>Paid to hospital</th>
                  <th>Paid for medicine</th>
                  <th>Not yet spent</th>
                </tr>
              </thead>
              <tbody>
                {q.data.hospitals.map((r) => (
                  <tr key={r.hospital.id}>
                    <td>
                      <strong>{r.hospital.name}</strong>
                      <small>
                        {r.hospital.lga}, {r.hospital.state}
                      </small>
                    </td>
                    <td>{r.campaigns}</td>
                    <td>{money(r.raisedKobo)}</td>
                    <td>{money(r.toHospitalKobo)}</td>
                    <td>{money(r.toPharmaciesKobo)}</td>
                    <td>{money(r.raisedKobo - r.toHospitalKobo - r.toPharmaciesKobo)}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Essential Medicine Fund</strong>
                    <small>All partner hospitals</small>
                  </td>
                  <td>—</td>
                  <td>{money(q.data.fund.raisedKobo)}</td>
                  <td>—</td>
                  <td>{money(q.data.fund.committedKobo)}</td>
                  <td>{money(q.data.fund.availableKobo)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted text-xs" style={{ marginTop: 14 }}>
            Medicine costs are recorded when the pharmacy confirms it has dispensed the prescription, and paid to the pharmacy afterwards.
          </p>
        </>
      )}
      <Footer />
    </main>
  );
}
