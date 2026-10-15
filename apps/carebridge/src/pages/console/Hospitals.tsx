import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, useToast } from "@magani/ui";
import { BadgeCheck, Plus } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import { hospitalTypes, type HospitalType } from "@/lib/format";
import type { PublicHospital } from "@/lib/types";
import { Failed, Footer, Loading, PageHeading } from "@/components/ui";

type Row = PublicHospital & { specialties: string[] };

export default function ConsoleHospitals() {
  const toast = useToast();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["hospitals-console"], queryFn: () => api<{ hospitals: Row[] }>("/public/hospitals") });

  async function call(path: string, body: unknown, done: string) {
    try {
      await api(path, { body });
      toast.success(done);
      setAdding(false);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    call(
      "/console/hospitals",
      {
        name: s("name"),
        type: s("type"),
        state: s("state"),
        lga: s("lga"),
        address: s("address") || undefined,
        phone: s("phone") || undefined,
        specialties: s("specialties").split(",").map((x) => x.trim()).filter(Boolean),
      },
      "Hospital added. Verify it once you have confirmed its details.",
    );
  }

  return (
    <main className="page">
      <PageHeading title="Hospitals" subtitle="Only verified hospitals can have live campaigns.">
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add hospital
        </Button>
      </PageHeading>
      {q.isLoading ? <Loading /> : q.error ? <Failed what="hospitals" /> : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data!.hospitals.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                    <small>{h.specialties.join(", ")}</small>
                  </td>
                  <td>{hospitalTypes[h.type]}</td>
                  <td>
                    {h.lga}
                    <small>{h.state}</small>
                  </td>
                  <td>
                    <span className={`pill ${h.verified ? "" : "low"}`}>{h.verified ? "Verified" : "Not verified"}</span>
                  </td>
                  <td>
                    {!h.verified && (
                      <Button variant="outline" size="sm" onClick={() => call(`/console/hospitals/${h.id}/verify`, {}, `${h.name} verified.`)}>
                        <BadgeCheck /> Verify
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a hospital" description="Add government hospitals and health centres to the public directory.">
        <form className="form-grid" onSubmit={add}>
          <label>
            Name
            <input name="name" required minLength={3} />
          </label>
          <label>
            Type
            <select name="type">
              {(Object.keys(hospitalTypes) as HospitalType[]).map((t) => (
                <option key={t} value={t}>
                  {hospitalTypes[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              State
              <input name="state" required minLength={2} />
            </label>
            <label>
              LGA
              <input name="lga" required minLength={2} />
            </label>
          </div>
          <div className="form-pair">
            <label>
              Address (optional)
              <input name="address" />
            </label>
            <label>
              Phone (optional)
              <input name="phone" type="tel" />
            </label>
          </div>
          <label>
            Specialties (comma separated)
            <input name="specialties" placeholder="e.g. Nephrology, Oncology" />
          </label>
          <Button type="submit">
            <Plus /> Add hospital
          </Button>
        </form>
      </Dialog>
      <Footer />
    </main>
  );
}
