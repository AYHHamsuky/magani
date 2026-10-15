import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, ButtonLink } from "@magani/ui";
import { Brand } from "@/components/Shell";
import { useToast } from "@magani/ui";

export default function Login({ mode }: { mode: "signin" | "signup" }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const creating = mode === "signup";
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    try {
      if (creating) {
        await register({
          name: s("name"),
          pharmacyName: s("pharmacyName"),
          outletType: s("outletType") === "PPMV" ? "PPMV" : "PHARMACY",
          state: s("state"),
          lga: s("lga"),
          phone: s("phone"),
          password: s("password"),
        });
      } else {
        await login({ phone: s("phone"), password: s("password") });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
        <Link to="/" aria-label="Magani home">
          <Brand />
          <div className="brand-sub">Care in every count</div>
        </Link>
        <h1 className="font-heading text-2xl font-semibold leading-none tracking-tight">
          {creating ? "Create your Magani account" : "Welcome back to Magani"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {creating ? "Your pharmacy gets its own private workspace. You can change these details later in Pharmacy settings." : "Sign in with the phone number your pharmacy registered."}
        </p>
        <form className="form-grid" onSubmit={submit}>
          {creating && (
            <>
              <label>
                Your name
                <input name="name" required minLength={2} autoComplete="name" />
              </label>
              <div className="form-pair">
                <label>
                  Pharmacy name
                  <input name="pharmacyName" required minLength={2} />
                </label>
                <label>
                  Outlet type
                  <select name="outletType">
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="PPMV">Patent medicine vendor</option>
                  </select>
                </label>
              </div>
              <div className="form-pair">
                <label>
                  State
                  <input name="state" placeholder="e.g. Kano" required minLength={2} />
                </label>
                <label>
                  LGA
                  <input name="lga" placeholder="e.g. Nassarawa" required minLength={2} />
                </label>
              </div>
            </>
          )}
          <label>
            Phone number
            <input name="phone" type="tel" inputMode="tel" placeholder="08031234567" pattern="\+?[0-9]{10,14}" autoComplete="tel" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={6} />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
          </Button>
          <ButtonLink to={creating ? "/login" : "/signup"} variant="ghost">
            {creating ? "Already registered? Sign in" : "New to Magani? Create an account"}
          </ButtonLink>
        </form>
      </div>
    </div>
  );
}
