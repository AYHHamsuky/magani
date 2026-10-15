import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(16),
    PORT: z.coerce.number().default(4000),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    TERMII_API_KEY: z.string().optional(),
    TERMII_SENDER_ID: z.string().default("Magani"),
  })
  .parse(process.env);
