import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, ButtonLink, useToast } from "@magani/ui";
import { Check } from "@magani/ui/icons";
import { api, errorText } from "@/lib/api";
import type { PublicHospital } from "@/lib/types";
import { Brand } from "@/components/Brand";

export default function ConsoleRegister() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const hospitals = useQuery({ queryKey: ["hospitals-all"], queryFn: () => api<{ hospitals: PublicHospital[] }>("/public/hospitals") });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    try {
      const r = await api<{ message: string }>("/auth/register", {
        body: { name: s("name"), email: s("email"), phone: s("phone"), jobTitle: s("jobTitle"), hospitalId: s("hospitalId"), password: String(f.get("password")) },
      });
      setDone(r.message);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
        <Link to="/" aria-label="CareBridge home">
          <Brand />
          <div className="brand-sub">Hospital officers</div>
        </Link>
        {done ? (
          <>
            <Check size={32} className="text-primary" />
            <h1 className="font-heading text-2xl font-semibold leading-none tracking-tight">Registration received</h1>
            <p className="text-sm text-muted-foreground">{done}</p>
            <ButtonLink to="/console/login">Go to sign in</ButtonLink>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-semibold leading-none tracking-tight">Register as a hospital officer</h1>
            <p className="text-sm text-muted-foreground">
              For medical social workers and records officers. We confirm your role with the hospital before you can submit cases.
            </p>
            <form className="form-grid" onSubmit={submit}>
              <div className="form-pair">
                <label>
                  Full name
                  <input name="name" required minLength={2} autoComplete="name" />
                </label>
                <label>
                  Job title
                  <input name="jobTitle" required minLength={2} placeholder="e.g. Medical social worker" />
                </label>
              </div>
              <label>
                Hospital
                <select name="hospitalId" required defaultValue="">
                  <option value="" disabled>
                    Choose your hospital
                  </option>
                  {hospitals.data?.hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} · {h.state}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-pair">
                <label>
                  Work email
                  <input name="email" type="email" required autoComplete="email" />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" required pattern="\+?[0-9]{10,14}" placeholder="08031234567" />
                </label>
              </div>
              <label>
                Password
                <input name="password" type="password" required minLength={8} autoComplete="new-password" />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? "Please wait…" : "Register"}
              </Button>
              <p className="muted text-xs">Hospital not listed? Ask CareBridge to add it to the directory.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
