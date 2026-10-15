import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/PublicLayout";
import { ConsoleShell } from "@/components/ConsoleShell";
import Home from "@/pages/Home";
import Campaigns from "@/pages/Campaigns";
import Campaign from "@/pages/Campaign";
import Hospitals from "@/pages/Hospitals";
import Fund from "@/pages/Fund";
import Transparency from "@/pages/Transparency";
import DonateThanks from "@/pages/DonateThanks";
import ConsoleLogin from "@/pages/ConsoleLogin";
import ConsoleRegister from "@/pages/ConsoleRegister";
import Overview from "@/pages/console/Overview";
import Cases from "@/pages/console/Cases";
import NewCase from "@/pages/console/NewCase";
import Case from "@/pages/console/Case";
import Orders from "@/pages/console/Orders";
import Payments from "@/pages/console/Payments";
import ConsoleHospitals from "@/pages/console/Hospitals";
import Officers from "@/pages/console/Officers";

export default function App() {
  const { session, loading } = useAuth();
  const admin = session?.user.role === "ADMIN";

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:slug" element={<Campaign />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="fund" element={<Fund />} />
        <Route path="transparency" element={<Transparency />} />
        <Route path="donate/thanks" element={<DonateThanks />} />
      </Route>

      <Route path="console/login" element={session ? <Navigate to="/console" replace /> : <ConsoleLogin />} />
      <Route path="console/register" element={<ConsoleRegister />} />
      <Route
        path="console"
        element={loading ? <div className="flex min-h-screen items-center justify-center muted">Opening the console…</div> : session ? <ConsoleShell /> : <Navigate to="/console/login" replace />}
      >
        <Route index element={<Overview />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/new" element={<NewCase />} />
        <Route path="cases/:id" element={<Case />} />
        <Route path="orders" element={<Orders />} />
        <Route path="payments" element={<Payments />} />
        {admin && <Route path="hospitals" element={<ConsoleHospitals />} />}
        {admin && <Route path="officers" element={<Officers />} />}
        <Route path="*" element={<Navigate to="/console" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
