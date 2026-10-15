import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { hospitalTypes, type HospitalType } from "@/lib/format";
import type { PublicHospital } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading, VerifiedBadge } from "@/components/ui";

type Row = PublicHospital & { specialties: string[]; _count: { campaigns: number } };

export default function Hospitals() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const res = useQuery({
    queryKey: ["hospitals", q, state, type],
    queryFn: () => api<{ hospitals: Row[]; states: string[] }>(`/public/hospitals?q=${encodeURIComponent(q)}&state=${encodeURIComponent(state)}&type=${type}`),
    placeholderData: (prev) => prev,
  });

  return (
    <main className="cb-page">
      <PageHeading eyebrow="Public directory" title="Hospitals" subtitle="Government hospitals and health centres on CareBridge, by state and LGA." />
      <div className="searchbar">
        <div className="searchbox">
          <Search />
          <input aria-label="Search hospitals" placeholder="Search by name, LGA or specialty…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="max-w-40" aria-label="State" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states</option>
          {res.data?.states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="max-w-40" aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {(Object.keys(hospitalTypes) as HospitalType[]).map((t) => (
            <option key={t} value={t}>
              {hospitalTypes[t]}
            </option>
          ))}
        </select>
      </div>
      {res.isLoading ? <Loading /> : res.error ? <Failed what="hospitals" /> : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Type</th>
                <th>Location</th>
                <th>Specialties</th>
                <th>Campaigns</th>
              </tr>
            </thead>
            <tbody>
              {res.data!.hospitals.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                    <small>
                      <VerifiedBadge verified={h.verified} />
                      {!h.verified && "Not yet verified"}
                    </small>
                  </td>
                  <td>{hospitalTypes[h.type]}</td>
                  <td>
                    {h.lga}
                    <small>{h.state} State</small>
                  </td>
                  <td>{h.specialties.join(", ")}</td>
                  <td>{h._count.campaigns}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!res.data!.hospitals.length && <div className="empty">No hospitals match your search.</div>}
        </div>
      )}
      <Footer />
    </main>
  );
}
