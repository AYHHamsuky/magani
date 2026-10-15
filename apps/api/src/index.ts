import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { authRoutes, requireAuth } from "./auth";
import { errorHandler } from "./http";
import { productRoutes, stockRoutes } from "./routes/products";
import { saleRoutes } from "./routes/sales";
import { patientRoutes, refillRoutes } from "./routes/patients";
import { dashboardRoutes } from "./routes/dashboard";
import { syncRoutes } from "./routes/sync";
import { partnerRoutes } from "./routes/partner";
import { orderRoutes } from "./routes/orders";
import { scheduleReminders } from "./services/reminders";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/partner/v1", partnerRoutes);
app.use("/api", requireAuth);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/refills", refillRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/orders", orderRoutes);
app.use(errorHandler);

app.listen(env.PORT, () => console.log(`Magani API on :${env.PORT}`));
scheduleReminders();
