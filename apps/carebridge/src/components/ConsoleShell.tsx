import { NavLink, Outlet, Link } from "react-router-dom";
import { Button } from "@magani/ui";
import { BadgeCheck, Building, ClipboardList, HandHeart, LayoutDashboard, LogOut, Receipt, Truck, Users } from "@magani/ui/icons";
import { useAuth } from "@/lib/auth";
import { Brand } from "./Brand";

export function ConsoleShell() {
  const { session, logout } = useAuth();
  const admin = session!.user.role === "ADMIN";
  const nav = [
    { to: "/console", icon: LayoutDashboard, label: "Overview", end: true },
    { to: "/console/cases", icon: ClipboardList, label: admin ? "Cases" : "My cases" },
    { to: "/console/orders", icon: Truck, label: "Medicine" },
    { to: "/console/payments", icon: Receipt, label: "Payments" },
    ...(admin
      ? [
          { to: "/console/hospitals", icon: Building, label: "Hospitals" },
          { to: "/console/officers", icon: Users, label: "Officers" },
        ]
      : []),
  ];
  const initials = session!.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="brand-sub">{admin ? "Platform console" : "Hospital console"}</div>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <n.icon />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <Link to="/" className="nav-link text-muted-foreground">
            <HandHeart />
            Public site
          </Link>
          <div className="side-note">
            Verified cases.
            <br />
            Money only to care.
          </div>
          <div className="profile">
            <div className="avatar">{initials}</div>
            <div className="flex-1">
              <strong className="text-xs">{session!.user.name}</strong>
              <div className="text-[10px] muted">{admin ? "CareBridge admin" : session!.hospital?.name}</div>
            </div>
            <Button variant="ghost" size="icon" title="Sign out" onClick={logout}>
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="pharmacy-name flex items-center gap-2">
              {admin ? "CareBridge" : session!.hospital?.name}
              {!admin && <BadgeCheck size={14} className="text-primary" />}
            </div>
            <small>{admin ? "Reviews, payments and the Essential Medicine Fund" : `${session!.hospital?.state} State · Hospital officer`}</small>
          </div>
          <div className="top-actions">
            <span className="online">
              <i />
              Connected to Magani
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign out
              <LogOut />
            </Button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
