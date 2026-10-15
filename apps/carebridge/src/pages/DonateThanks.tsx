import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "@magani/ui";
import { Check } from "@magani/ui/icons";
import { api } from "@/lib/api";
import { money } from "@/lib/format";

export default function DonateThanks() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? "";
  const q = useQuery({
    queryKey: ["donation", reference],
    queryFn: () => api<{ status: string; amountKobo: number; campaign: { slug: string; title: string } | null }>(`/public/donations/${reference}`),
    enabled: !!reference,
  });
  const paid = q.data?.status === "PAID";

  return (
    <main className="cb-page">
      <section className="landing-final" style={{ marginTop: 0 }}>
        {q.isLoading ? (
          <p>Confirming your payment…</p>
        ) : paid ? (
          <>
            <Check size={36} className="text-primary" />
            <h2>Thank you for your {money(q.data!.amountKobo)} donation</h2>
            <p>
              It will be paid to the hospital or pharmacy treating {q.data!.campaign ? "this patient" : "patients through the Essential Medicine Fund"}.
              You can follow every payment on the {q.data!.campaign ? "campaign" : "fund"} page.
            </p>
            <ButtonLink to={q.data!.campaign ? `/campaigns/${q.data!.campaign.slug}` : "/fund"} className="landing-big">
              See where it goes
            </ButtonLink>
          </>
        ) : (
          <>
            <h2>We could not confirm this payment yet</h2>
            <p>If you were charged, it will appear shortly. Reference: {reference || "missing"}</p>
            <ButtonLink to="/campaigns">Back to campaigns</ButtonLink>
          </>
        )}
      </section>
    </main>
  );
}
