import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, useToast } from "@magani/ui";
import { Check } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { day } from "@/lib/format";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

interface Officer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  approved: boolean;
  createdAt: string;
  hospital: { name: string; state: string } | null;
}

export default function Officers() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["officers"], queryFn: () => api<Officer[]>("/console/officers") });

  async function set(o: Officer, approved: boolean) {
    try {
      await api(`/console/officers/${o.id}/approve`, { body: { approved } });
      toast.success(approved ? `${o.name} can now submit cases.` : `${o.name}'s access was removed.`);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  return (
    <main className="page">
      <PageHeading title="Hospital officers" subtitle="Approve officers only after confirming their role with the hospital." />
      {q.isLoading ? <Loading /> : q.error ? <Failed what="officers" /> : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Hospital</th>
                <th>Contact</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.name}</strong>
                    <small>
                      {o.jobTitle} · registered {day(o.createdAt)}
                    </small>
                  </td>
                  <td>
                    {o.hospital?.name}
                    <small>{o.hospital?.state}</small>
                  </td>
                  <td>
                    {o.email}
                    <small>{o.phone}</small>
                  </td>
                  <td>
                    <span className={`pill ${o.approved ? "" : "low"}`}>{o.approved ? "Approved" : "Waiting"}</span>
                  </td>
                  <td>
                    {o.approved ? (
                      <Button variant="ghost" size="sm" onClick={() => set(o, false)}>
                        Remove access
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => set(o, true)}>
                        <Check /> Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data!.length && <div className="empty">No officers have registered yet.</div>}
        </div>
      )}
      <Footer />
    </main>
  );
}
