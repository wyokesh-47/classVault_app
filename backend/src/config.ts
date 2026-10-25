import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env") });

const configSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:8081,http://localhost:19006"),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  const missingOrInvalid = parsedConfig.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Backend configuration is invalid: ${missingOrInvalid}`);
}

export const config = {
  supabaseUrl: parsedConfig.data.SUPABASE_URL,
  supabaseSecretKey: parsedConfig.data.SUPABASE_SECRET_KEY,
  port: parsedConfig.data.PORT,
  corsOrigins: parsedConfig.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
};
