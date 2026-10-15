import { Link, NavLink, Outlet } from "react-router-dom";
import { ButtonLink } from "@magani/ui";
import { Brand } from "./Brand";

const links = [
  { to: "/campaigns", label: "Campaigns" },
  { to: "/fund", label: "Medicine fund" },
  { to: "/hospitals", label: "Hospitals" },
  { to: "/transparency", label: "Transparency" },
];

export function PublicLayout() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" aria-label="CareBridge home">
          <Brand />
        </Link>
        <nav aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "cb-nav-active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="landing-nav-actions">
          <ButtonLink to="/console/login" variant="ghost" className="cb-hide-sm">
            For hospitals
          </ButtonLink>
          <ButtonLink to="/fund">Donate</ButtonLink>
        </div>
      </header>
      <Outlet />
      <footer className="landing-footer">
        <Brand />
        <span>Verified medical fundraising · © {new Date().getFullYear()} CareBridge</span>
        <nav aria-label="Footer">
          <Link to="/transparency">Transparency</Link>
          <Link to="/hospitals">Hospital directory</Link>
          <Link to="/console/register">Hospital officers</Link>
        </nav>
      </footer>
    </div>
  );
}
