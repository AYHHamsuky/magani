import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { authRoutes, requireAuth } from "./auth";
import { errorHandler } from "./http";
import { publicRoutes } from "./routes/public";
import { consoleRoutes } from "./routes/console";
import { webhookRoutes } from "./routes/webhooks";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",") }));
// Webhooks need the raw body to check signatures, so they are mounted before the JSON parser.
app.use("/api/webhooks", webhookRoutes);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, magani: !!env.MAGANI_API_KEY }));
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/console", requireAuth, consoleRoutes);
app.use(errorHandler);

app.listen(env.PORT, () => console.log(`CareBridge API on :${env.PORT}`));
