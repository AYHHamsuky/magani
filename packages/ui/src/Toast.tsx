import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
interface Toast { id: number; tone: Tone; message: string }
type Show = Record<Tone, (message: string) => void>;

const Ctx = createContext<Show | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const [show] = useState<Show>(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }));

  return (
    <Ctx.Provider value={show}>
      {children}
      <ol className="toaster" aria-live="polite">
        {toasts.map((t) => (
          <li key={t.id} className={`toast ${t.tone}`} role={t.tone === "error" ? "alert" : "status"}>
            {t.message}
          </li>
        ))}
      </ol>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
