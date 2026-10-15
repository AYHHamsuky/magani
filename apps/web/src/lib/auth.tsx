import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LoginInput, RegisterInput, SettingsInput } from "@magani/shared";
import { api, tokenStore } from "./api";

interface Session {
  user: { id: string; name: string; role: "OWNER" | "STAFF" };
  pharmacy: { id: string; name: string; outletType: "PHARMACY" | "PPMV"; state: string; lga: string; acceptsOrders: boolean };
}
interface AuthCtx {
  session: Session | null;
  loading: boolean;
  login: (i: LoginInput) => Promise<void>;
  register: (i: RegisterInput) => Promise<void>;
  updateSettings: (i: SettingsInput) => Promise<void>;
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

  const accept = (r: Session & { token: string }) => {
    tokenStore.set(r.token);
    setSession({ user: r.user, pharmacy: r.pharmacy });
  };

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        login: async (i) => accept(await api("/auth/login", { body: i })),
        register: async (i) => accept(await api("/auth/register", { body: i })),
        updateSettings: async (i) => setSession(await api<Session>("/auth/settings", { method: "PATCH", body: i })),
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
