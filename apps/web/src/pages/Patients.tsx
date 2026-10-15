import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@magani/ui";
import { useShell } from "@/components/Shell";
import { LoadError, Loading, PageFooter, PageHeading } from "@/components/care";
import { Check, MessageSquare, Plus, Search } from "@magani/ui/icons";
import { useRefillActions } from "@/lib/refills";

export default function Patients() {
  const ws = useWorkspace();
  const { openPatient } = useShell();
  const refill = useRefillActions();
  const [query, setQuery] = useState("");

  if (ws.loading) return <Loading />;
  if (ws.error) return <LoadError />;

  const shown = ws.patients.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="page">
      <PageHeading title="Patients" subtitle={`${ws.patients.length} people in care · Continuity matters`}>
        <Button onClick={openPatient}>
          <Plus />
          Register patient
        </Button>
      </PageHeading>
      <div className="searchbar">
        <div className="searchbox">
          <Search />
          <input aria-label="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone…" />
        </div>
      </div>
      <div className="table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Refill medicine</th>
              <th>Next refill</th>
              <th>Language</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>
                    {p.phone} · {p.condition}
                  </small>
                </td>
                <td>
                  {p.plan ? (
                    <>
                      {p.plan.product}
                      <small>
                        {p.plan.quantity} packs · every {p.plan.interval} days
                      </small>
                    </>
                  ) : (
                    <span className="muted">No refill plan</span>
                  )}
                </td>
                <td>
                  {p.plan && (
                    <span className={`pill ${p.plan.due <= ws.today ? "low" : ""}`}>
                      {p.plan.due === ws.today ? "Due today" : p.plan.due < ws.today ? `Overdue · ${p.plan.due}` : p.plan.due}
                    </span>
                  )}
                </td>
                <td>
                  {p.language}
                  <small>Consent recorded</small>
                </td>
                <td>
                  {p.plan && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" title="Send reminder" disabled={refill.busy} onClick={() => refill.remind(p)}>
                        <MessageSquare />
                      </Button>
                      <Button variant="secondary" size="sm" disabled={refill.busy} onClick={() => refill.collect(p)}>
                        <Check />
                        Collected
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="empty">{ws.patients.length ? "No patients match your search." : "No patients registered yet."}</div>}
      </div>
      <PageFooter />
    </main>
  );
}
