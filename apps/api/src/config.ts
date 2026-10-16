// Loaded first so every entry point — server, seed, scripts — sees `.env`
// without each one having to remember. In production the platform supplies
// real environment variables and this is a no-op.
import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment is parsed once, at boot, and the process refuses to start if
 * anything required is missing or malformed. A misconfigured production
 * deploy should fail loudly at deploy time — never at 2am on a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (PostgreSQL connection string)'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  /** Comma-separated list. Empty means "reflect any origin" — dev only. */
  CORS_ORIGINS: z.string().default(''),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('arkvolt'),

  /** Fallback WhatsApp line if the settings row has not been seeded yet. */
  WHATSAPP_NUMBER: z.string().default('2349030438653'),

  ADMIN_EMAIL: z.string().email().default('admin@arkvolt.ng'),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NAME: z.string().default('Arkvolt Admin'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '_'}: ${i.message}`).join('\n');
  // Deliberately not using the logger: this runs before the logger exists.
  console.error(`\n[arkvolt/api] Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
