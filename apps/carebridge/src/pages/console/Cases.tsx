import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, ButtonLink } from "@magani/ui";
import { Plus } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { campaignPill, campaignStatus, categories, day, money } from "@/lib/format";
import type { ConsoleCampaign } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

const filters = ["", "PENDING_REVIEW", "LIVE", "FUNDED", "REJECTED", "CLOSED"];

export default function Cases() {
  const { session } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const q = useQuery({ queryKey: ["console-campaigns", status], queryFn: () => api<ConsoleCampaign[]>(`/console/campaigns${status ? `?status=${status}` : ""}`) });

  return (
    <main className="page">
      <PageHeading title={admin ? "Cases" : "My cases"} subtitle={admin ? "Every case submitted by hospital officers" : `Cases submitted for ${session!.hospital?.name}`}>
        {!admin && (
          <ButtonLink to="/console/cases/new">
            <Plus /> Submit a case
          </ButtonLink>
        )}
      </PageHeading>
      <div className="tabs">
        {filters.map((f) => (
          <Button key={f} variant="ghost" className={status === f ? "selected" : ""} onClick={() => setParams(f ? { status: f } : {})}>
            {f ? campaignStatus[f] : "All"}
          </Button>
        ))}
      </div>
      {q.isLoading ? <Loading /> : q.error ? <Failed what="cases" /> : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Case</th>
                {admin && <th>Hospital</th>}
                <th>Raised</th>
                <th>Available</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>
                      {c.patientAlias} · {categories[c.category]} · submitted {day(c.createdAt)}
                    </small>
                  </td>
                  {admin && (
                    <td>
                      {c.hospital.name}
                      <small>{c.hospital.verified ? "Verified" : "Not verified"}</small>
                    </td>
                  )}
                  <td>
                    {money(c.raisedKobo)}
                    <small>of {money(c.targetKobo)}</small>
                  </td>
                  <td>{money(c.availableKobo)}</td>
                  <td>
                    <span className={`pill ${campaignPill(c.status)}`}>{campaignStatus[c.status]}</span>
                  </td>
                  <td>
                    <ButtonLink to={`/console/cases/${c.id}`} variant="outline" size="sm">
                      Open
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data!.length && <div className="empty">No cases here.</div>}
        </div>
      )}
      <Footer />
    </main>
  );
}
