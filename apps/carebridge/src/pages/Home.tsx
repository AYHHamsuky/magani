import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "@magani/ui";
import { ArrowRight, BadgeCheck, Building, Check, HandHeart, HeartPulse, Receipt, ShieldCheck, Truck } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { PublicCampaign, Stats } from "@/lib/types";
import { CampaignCard } from "@/components/ui";

const steps = [
  { icon: Building, title: "The hospital submits the case", body: "A medical social worker or records officer at a government hospital submits the case with its admission number and a costed treatment plan." },
  { icon: BadgeCheck, title: "CareBridge checks it", body: "We confirm the officer, the hospital and the case before anything goes public. Patients appear by first name only, with their consent." },
  { icon: HandHeart, title: "You give to a real treatment plan", body: "Every campaign shows what the money is for, line by line, from the hospital's own charges." },
  { icon: Receipt, title: "Money goes to care, not cash", body: "We pay the hospital directly, or a registered Magani pharmacy dispenses the medicine. You can see each payment on the campaign." },
];

export default function Home() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/public/stats") });
  const campaigns = useQuery({ queryKey: ["campaigns", "home"], queryFn: () => api<PublicCampaign[]>("/public/campaigns") });

  return (
    <main>
      <section className="landing-hero">
        <div>
          <div className="eyebrow">Verified medical fundraising for Nigerian patients</div>
          <h1>Help a real patient. See exactly where your money goes.</h1>
          <p>
            Every CareBridge campaign is submitted by a government hospital and checked before it goes live. Donations are paid straight to
            the hospital or to the pharmacy dispensing the medicine.
          </p>
          <div className="landing-cta">
            <ButtonLink to="/campaigns" className="landing-big">
              See patients who need help
              <ArrowRight />
            </ButtonLink>
            <ButtonLink to="/fund" variant="outline" className="landing-big">
              Give to the medicine fund
            </ButtonLink>
          </div>
          <ul className="landing-points">
            <li>
              <Check size={16} /> Every case confirmed by the treating hospital
            </li>
            <li>
              <Check size={16} /> No money to personal bank accounts
            </li>
            <li>
              <Check size={16} /> Medicine dispensed by registered pharmacies on Magani
            </li>
          </ul>
        </div>
        <div className="landing-preview">
          <div className="landing-preview-head">
            <strong>So far on CareBridge</strong>
          </div>
          {stats.data ? (
            <div className="stats" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 0 }}>
              {[
                { label: "Donated", value: money(stats.data.raisedKobo), icon: HandHeart },
                { label: "Paid to hospitals and pharmacies", value: money(stats.data.disbursedKobo), icon: Receipt },
                { label: "Medicine orders dispensed", value: stats.data.medicineOrdersDispensed, icon: Truck },
                { label: "Verified hospitals", value: stats.data.verifiedHospitals, icon: ShieldCheck },
              ].map((s) => (
                <div className="stat" key={s.label}>
                  <div className="stat-top">
                    {s.label}
                    <span className="stat-icon">
                      <s.icon />
                    </span>
                  </div>
                  <div className="stat-number">{s.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Loading…</div>
          )}
          {stats.data?.testMode && <p className="muted text-xs">Test mode: donations are recorded without charging any card.</p>}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2 className="font-heading">Patients who need help now</h2>
          <ButtonLink to="/campaigns" variant="link" size="sm">
            All campaigns <ArrowRight />
          </ButtonLink>
        </div>
        <div className="product-grid">
          {(campaigns.data ?? []).slice(0, 6).map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
        {campaigns.data && !campaigns.data.length && <div className="empty">No live campaigns right now. Give to the medicine fund instead.</div>}
      </section>

      <section className="landing-section" id="how">
        <div className="landing-section-head">
          <div className="eyebrow">How CareBridge works</div>
          <h2>Built on trust you can check</h2>
        </div>
        <div className="landing-features">
          {steps.map((s) => (
            <article key={s.title}>
              <span className="stat-icon">
                <s.icon />
              </span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-yours">
        <div>
          <HeartPulse size={28} className="text-primary" />
          <h2>The Essential Medicine Fund</h2>
          <p>
            Insulin, blood pressure tablets and other chronic-care medicine run out every month. The fund pays registered pharmacies to
            dispense prescriptions for patients referred by partner hospitals, so treatment does not stop when money does.
          </p>
          <div className="landing-cta">
            <ButtonLink to="/fund">
              Give to the fund <ArrowRight />
            </ButtonLink>
          </div>
        </div>
        <ul>
          <li>
            <Truck size={18} /> Prescriptions sent to pharmacies through Magani
          </li>
          <li>
            <Receipt size={18} /> Paid only after the medicine is dispensed
          </li>
          <li>
            <ShieldCheck size={18} /> Prescription medicine only from registered pharmacies
          </li>
        </ul>
      </section>

      <section className="landing-final">
        <h2>Work at a government hospital?</h2>
        <p>Social workers and records officers can submit verified cases for patients who cannot pay for treatment.</p>
        <ButtonLink to="/console/register" className="landing-big">
          Register as a hospital officer <ArrowRight />
        </ButtonLink>
      </section>
    </main>
  );
}
