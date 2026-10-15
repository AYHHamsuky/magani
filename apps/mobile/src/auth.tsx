import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LoginInput } from "@magani/shared";
import { api, token } from "./api";

interface Session { user: { name: string }; pharmacy: { name: string } }
interface AuthCtx { session: Session | null; ready: boolean; login: (i: LoginInput) => Promise<void>; logout: () => Promise<void> }
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (await token.get()) {
        try {
          setSession(await api<Session>("/auth/me"));
        } catch (e) {
          // Offline start: keep the user signed in with a minimal session
          if ((e as { status?: number }).status === 401) await token.clear();
          else setSession({ user: { name: "" }, pharmacy: { name: "" } });
        }
      }
      setReady(true);
    })();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        ready,
        login: async (i) => {
          const r = await api<Session & { token: string }>("/auth/login", i);
          await token.set(r.token);
          setSession({ user: r.user, pharmacy: r.pharmacy });
        },
        logout: async () => {
          await token.clear();
          setSession(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
