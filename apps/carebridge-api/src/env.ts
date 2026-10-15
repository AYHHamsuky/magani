import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(16),
    PORT: z.coerce.number().default(4100),
    CORS_ORIGIN: z.string().default("http://localhost:5180"),
    PUBLIC_URL: z.string().default("http://localhost:5180"),
    MAGANI_API_URL: z.string().default("http://localhost:4000/api/partner/v1"),
    MAGANI_API_KEY: z.string().optional(),
    MAGANI_WEBHOOK_SECRET: z.string().optional(),
    PAYSTACK_SECRET_KEY: z.string().optional(),
  })
  .parse(process.env);
