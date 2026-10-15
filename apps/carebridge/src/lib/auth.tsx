import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "./api";

export interface Session {
  user: { id: string; name: string; email: string; role: "ADMIN" | "OFFICER" };
  hospital: { id: string; name: string; state: string } | null;
}
interface AuthCtx {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<Session>("/auth/me")
      .then(setSession)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        login: async (email, password) => {
          const r = await api<Session & { token: string }>("/auth/login", { body: { email, password } });
          tokenStore.set(r.token);
          setSession({ user: r.user, hospital: r.hospital });
        },
        logout: () => {
          tokenStore.clear();
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
