import { createContext, useContext, useState, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { dosageForms } from "@magani/shared";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useCreateProduct, useOrders, useReceive, useRegisterPatient } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@magani/ui";
import { Dialog } from "@magani/ui";
import { useToast } from "@magani/ui";
import {
  ArrowUpRight, Bell, Check, ChevronDown, Inbox, CircleQuestionMark, ClipboardList, LogOut, Package, Plus, Settings, ShoppingBag, Users,
} from "@magani/ui/icons";

type Panel = "receive" | "product" | "patient" | "account" | "help" | "notifications";

interface ShellCtx {
  openReceive: (productId?: string) => void;
  openProduct: () => void;
  openPatient: () => void;
  openSettings: () => void;
}
const Ctx = createContext<ShellCtx | null>(null);

export function useShell() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShell outside Shell");
  return c;
}

const titles: Record<Panel, string> = {
  receive: "Receive stock",
  product: "Add medicine",
  patient: "Register patient",
  account: "Pharmacy settings",
  help: "Here for your pharmacy",
  notifications: "Your attention list",
};

const nav = [
  { to: "/", icon: ClipboardList, label: "Today" },
  { to: "/sell", icon: ShoppingBag, label: "Sell" },
  { to: "/stock", icon: Package, label: "Stock" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/orders", icon: Inbox, label: "Orders" },
];

const formNames: Record<(typeof dosageForms)[number], string> = {
  TABLET: "Tablets", CAPSULE: "Capsules", SYRUP: "Syrup", INJECTION: "Injection", CREAM: "Cream", OTHER: "Other",
};

export function Brand() {
  return (
    <div className="brand">
      <svg className="brand-mark" viewBox="0 0 36 42" aria-hidden="true">
        <rect x="5" y="2" width="26" height="38" rx="13" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M6 21h24M18 9v24M12 15h12M12 27h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      magani<span className="text-primary text-lg">.</span>
    </div>
  );
}

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Shell() {
  const { session, logout, updateSettings } = useAuth();
  const ws = useWorkspace();
  const orders = useOrders();
  const newOrders = (orders.data ?? []).filter((o) => o.status === "SENT").length;
  const toast = useToast();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [receiveFor, setReceiveFor] = useState<string | undefined>();
  const receive = useReceive();
  const createProduct = useCreateProduct();
  const registerPatient = useRegisterPatient();
  const saving = receive.isPending || createProduct.isPending || registerPatient.isPending;

  const attention =
    ws.products.filter((p) => p.health !== "good").length +
    ws.patients.filter((p) => p.plan && p.plan.due <= ws.today).length;

  const [savingSettings, setSavingSettings] = useState(false);

  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setSavingSettings(true);
    try {
      await updateSettings({
        name: s("name"),
        pharmacyName: s("pharmacyName"),
        outletType: s("outletType") === "PPMV" ? "PPMV" : "PHARMACY",
        state: s("state"),
        lga: s("lga"),
        acceptsOrders: f.get("acceptsOrders") === "on",
      });
      toast.success("Pharmacy details updated.");
      setPanel(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save. Check your connection.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const n = (k: string) => Number(f.get(k));
    try {
      if (panel === "receive") {
        await receive.mutateAsync({ productId: s("product"), batchNo: s("batch"), quantity: n("quantity"), expiry: new Date(s("expiry")), costKobo: 0 });
        toast.success("Delivery recorded. Stock updated.");
      }
      if (panel === "product") {
        await createProduct.mutateAsync({
          name: s("name"),
          strength: s("strength") || undefined,
          form: s("form") as (typeof dosageForms)[number],
          genericName: s("generic") || undefined,
          packSize: 1,
          priceKobo: Math.round(n("price") * 100),
          reorderLevel: n("reorder"),
          isNcd: f.get("chronic") === "on",
        });
        toast.success("Medicine added to your catalogue.");
      }
      if (panel === "patient") {
        await registerPatient.mutateAsync({
          patient: {
            name: s("name"),
            phone: s("phone"),
            language: s("language") === "Hausa" ? "HAUSA" : "ENGLISH",
            programme: s("condition") as "HYPERTENSION" | "DIABETES" | "OTHER",
            consent: true,
          },
          plan: { productId: s("product"), quantityPerRefill: n("quantity"), intervalDays: n("interval"), nextDueDate: new Date(s("due")) },
        });
        toast.success("Patient registered. Refill reminders are on.");
      }
      setPanel(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save. Check your connection.");
    }
  }

  const medicineSelect = (
    <label>
      Medicine
      <select name="product" required defaultValue={receiveFor}>
        {ws.products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} {p.strength}
          </option>
        ))}
      </select>
    </label>
  );

  const ctx: ShellCtx = {
    openReceive: (productId) => {
      setReceiveFor(productId);
      setPanel("receive");
    },
    openProduct: () => setPanel("product"),
    openPatient: () => {
      setReceiveFor(undefined);
      setPanel("patient");
    },
    openSettings: () => setPanel("account"),
  };

  const pharmacy = session!.pharmacy;
  const user = session!.user;

  return (
    <Ctx.Provider value={ctx}>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <div className="brand-sub">Care in every count</div>
          <nav>
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <item.icon />
                {item.label}
                {item.to === "/" && attention > 0 && <span className="nav-count">{attention}</span>}
                {item.to === "/orders" && newOrders > 0 && <span className="nav-count">{newOrders}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="side-bottom">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setPanel("account")}>
              <Settings />
              Pharmacy settings
            </Button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setPanel("help")}>
              <CircleQuestionMark />
              Help & support
            </Button>
            <div className="side-note">
              A little more organised.
              <br />A lot more care.
            </div>
            <div className="profile">
              <div className="avatar">{initials(user.name)}</div>
              <div className="flex-1">
                <strong className="text-xs">{user.name}</strong>
                <div className="text-[10px] muted">{user.role === "OWNER" ? "Pharmacy owner" : "Pharmacy staff"}</div>
              </div>
              <Button variant="ghost" size="icon" title="Account" onClick={() => setPanel("account")}>
                <ChevronDown />
              </Button>
            </div>
          </div>
        </aside>

        <div className="content-shell">
          <header className="topbar">
            <div>
              <button type="button" className="pharmacy-name flex items-center gap-2 cursor-pointer" onClick={() => setPanel("account")}>
                {pharmacy.name}
                <ChevronDown size={13} />
              </button>
              <small>
                {pharmacy.lga}, {pharmacy.state} State
              </small>
            </div>
            <div className="top-actions">
              <span className="online">
                <i />
                All changes saved
              </span>
              <Button variant="ghost" size="icon" title="Notifications" onClick={() => setPanel("notifications")}>
                <Bell size={18} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPanel("account")}>
                Account
                <ArrowUpRight />
              </Button>
            </div>
          </header>
          <Outlet />
        </div>
      </div>

      <Dialog
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={panel ? titles[panel] : ""}
        description={
          panel === "help"
            ? "For support, contact your Magani administrator. Add a Termii API key on the server to send real SMS reminders; until then they are written to the server log."
            : panel === "notifications"
              ? attention
                ? `${attention} item${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} attention: low or finished stock and refills due today.`
                : "Nothing needs attention right now."
              : panel === "account"
                ? "This is how your pharmacy appears across Magani."
                : "Records are saved securely to your pharmacy."
        }
      >
        {panel === "notifications" && (
          <Button
            onClick={() => {
              setPanel(null);
              navigate("/");
            }}
          >
            Open today's list
            <ArrowUpRight />
          </Button>
        )}
        {panel === "account" && (
          <>
            {user.role === "OWNER" ? (
              <form className="form-grid" onSubmit={saveSettings}>
                <label>
                  Pharmacy name
                  <input name="pharmacyName" defaultValue={pharmacy.name} required minLength={2} />
                </label>
                <div className="form-pair">
                  <label>
                    Outlet type
                    <select name="outletType" defaultValue={pharmacy.outletType}>
                      <option value="PHARMACY">Pharmacy</option>
                      <option value="PPMV">Patent medicine vendor</option>
                    </select>
                  </label>
                  <label>
                    Owner's name
                    <input name="name" defaultValue={user.name} required minLength={2} />
                  </label>
                </div>
                <div className="form-pair">
                  <label>
                    State
                    <input name="state" defaultValue={pharmacy.state} required minLength={2} />
                  </label>
                  <label>
                    LGA
                    <input name="lga" defaultValue={pharmacy.lga} required minLength={2} />
                  </label>
                </div>
                <label className="consent">
                  <input name="acceptsOrders" type="checkbox" defaultChecked={pharmacy.acceptsOrders} />
                  Accept prescription orders from hospitals and partners (registered pharmacies only)
                </label>
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? "Saving…" : "Save changes"}
                  <Check />
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only the pharmacy owner can change these details.</p>
            )}
            <div className="profile">
              <div className="avatar">{initials(user.name)}</div>
              <div className="flex-1">
                <strong className="text-xs">{user.name}</strong>
                <div className="text-[10px] muted">{user.role === "OWNER" ? "Pharmacy owner" : "Pharmacy staff"}</div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPanel(null);
                logout();
              }}
            >
              <LogOut />
              Sign out
            </Button>
          </>
        )}
        {(panel === "receive" || panel === "product" || panel === "patient") && (
          <form className="form-grid" onSubmit={submit}>
            {panel === "receive" && (
              <>
                {medicineSelect}
                <div className="form-pair">
                  <label>
                    Batch number
                    <input name="batch" placeholder="e.g. MET-2610" required />
                  </label>
                  <label>
                    Quantity received
                    <input name="quantity" type="number" min="1" step="1" required />
                  </label>
                </div>
                <label>
                  Expiry date
                  <input name="expiry" type="date" min={ws.today} required />
                </label>
              </>
            )}
            {panel === "product" && (
              <>
                <label>
                  Medicine name
                  <input name="name" required minLength={2} />
                </label>
                <div className="form-pair">
                  <label>
                    Strength
                    <input name="strength" placeholder="500 mg" />
                  </label>
                  <label>
                    Form
                    <select name="form" defaultValue="TABLET">
                      {dosageForms.map((f) => (
                        <option key={f} value={f}>
                          {formNames[f]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Generic name
                  <input name="generic" placeholder="e.g. Paracetamol" />
                </label>
                <div className="form-pair">
                  <label>
                    Price (₦)
                    <input name="price" type="number" min="0" step="0.01" required />
                  </label>
                  <label>
                    Reorder level
                    <input name="reorder" type="number" min="0" step="1" defaultValue={10} required />
                  </label>
                </div>
                <label className="consent">
                  <input name="chronic" type="checkbox" />
                  Chronic-care medicine
                </label>
              </>
            )}
            {panel === "patient" && (
              <>
                <label>
                  Full name
                  <input name="name" required minLength={2} />
                </label>
                <label>
                  Phone number
                  <input name="phone" type="tel" placeholder="08012345678" pattern="\+?[0-9]{10,14}" required />
                </label>
                <div className="form-pair">
                  <label>
                    Language
                    <select name="language" defaultValue="Hausa">
                      <option>English</option>
                      <option>Hausa</option>
                    </select>
                  </label>
                  <label>
                    Condition group
                    <select name="condition">
                      <option value="HYPERTENSION">Hypertension</option>
                      <option value="DIABETES">Diabetes</option>
                      <option value="OTHER">Other chronic condition</option>
                    </select>
                  </label>
                </div>
                {medicineSelect}
                <div className="form-pair">
                  <label>
                    Refill quantity
                    <input name="quantity" type="number" min="1" step="1" defaultValue={1} required />
                  </label>
                  <label>
                    Interval (days)
                    <input name="interval" type="number" min="7" max="90" step="1" defaultValue={28} required />
                  </label>
                </div>
                <label>
                  Next refill date
                  <input name="due" type="date" min={ws.today} defaultValue={ws.today} required />
                </label>
                <label className="consent">
                  <input name="consent" type="checkbox" required />
                  Patient has consented to storing their details and receiving refill reminders.
                </label>
              </>
            )}
            <Button type="submit" disabled={saving || (panel !== "product" && !ws.products.length)}>
              {saving ? "Saving…" : panel === "receive" ? "Record delivery" : panel === "patient" ? "Register patient" : "Add medicine"}
              <Plus />
            </Button>
          </form>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
