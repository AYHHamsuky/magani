import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { categories, money, pct } from "@/lib/format";
import type { PublicCampaign } from "@/lib/types";
import { BadgeCheck, Building } from "@magani/ui/icons";

export function PageHeading({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

export function Progress({ raised, target }: { raised: number; target: number }) {
  const p = pct(raised, target);
  return (
    <div className="cb-progress" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${p}% funded`}>
      <span style={{ width: `${p}%` }} />
    </div>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="cb-verified">
      <BadgeCheck size={14} /> Verified hospital
    </span>
  ) : null;
}

export function CampaignCard({ c }: { c: PublicCampaign }) {
  return (
    <Link to={`/campaigns/${c.slug}`} className="product-card cb-card">
      <div className="flex justify-between">
        <span className="pill">{categories[c.category]}</span>
        {c.status === "FUNDED" && <span className="pill">Fully funded</span>}
      </div>
      <h3>{c.title}</h3>
      <p className="cb-card-hospital">
        <Building size={14} /> {c.hospital.name}, {c.hospital.state}
      </p>
      <Progress raised={c.raisedKobo} target={c.targetKobo} />
      <div className="product-card-bottom">
        <span>
          <strong>{money(c.raisedKobo)}</strong> <span className="muted text-xs">of {money(c.targetKobo)}</span>
        </span>
        <span className="muted text-xs">{c.donors} donors</span>
      </div>
    </Link>
  );
}

export const Loading = () => <div className="empty">Loading…</div>;
export const Failed = ({ what = "this page" }: { what?: string }) => <div className="empty">Could not load {what}. Refresh to try again.</div>;

export function Footer() {
  return (
    <footer className="page-footer">
      <span>Every naira goes to the hospital or pharmacy treating the patient.</span>
      <span>CareBridge · Medicine supplied through Magani pharmacies</span>
    </footer>
  );
}
