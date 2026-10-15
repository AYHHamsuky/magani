import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonLink, useToast } from "@magani/ui";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Brand } from "@/components/Brand";

export default function ConsoleLogin() {
  const { login } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await login(String(f.get("email")).trim(), String(f.get("password")));
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
          <div className="brand-sub">Hospital and platform console</div>
        </Link>
        <h1 className="font-heading text-2xl font-semibold leading-none tracking-tight">Sign in to the console</h1>
        <p className="text-sm text-muted-foreground">For hospital officers who submit cases and CareBridge administrators.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
          <ButtonLink to="/console/register" variant="ghost">
            Hospital officer without an account? Register
          </ButtonLink>
        </form>
      </div>
    </div>
  );
}
