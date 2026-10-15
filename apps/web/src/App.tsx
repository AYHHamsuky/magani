import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Today from "@/pages/Today";
import Stock from "@/pages/Stock";
import Sell from "@/pages/Sell";
import Patients from "@/pages/Patients";
import Orders from "@/pages/Orders";

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center muted">Opening your pharmacy…</div>;
  if (!session)
    return (
      <Routes>
        <Route index element={<Home />} />
        <Route path="login" element={<Login mode="signin" />} />
        <Route path="signup" element={<Login mode="signup" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Today />} />
        <Route path="sell" element={<Sell />} />
        <Route path="stock" element={<Stock />} />
        <Route path="patients" element={<Patients />} />
        <Route path="orders" element={<Orders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
