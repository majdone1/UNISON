import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://127.0.0.1:43127'),
  NEXT_PUBLIC_APP_NAME: z.string().default('UNISON'),
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  DATABASE_URL: z.string().optional().default(''),
  BILLING_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STORAGE_BUCKET: z.string().default('attachments'),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  CSP_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  DESKTOP_DEEP_LINK_SCHEME: z.string().default('unison'),
});

export type UnisonEnv = z.infer<typeof envSchema>;

export function getEnv(source: Record<string, string | undefined> = process.env): UnisonEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function hasSupabaseCredentials(env: UnisonEnv = getEnv()): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isDemoMode(env: UnisonEnv = getEnv()): boolean {
  return env.DEMO_MODE || !hasSupabaseCredentials(env);
}

export const BRAND = {
  name: 'UNISON',
  tagline: 'Work in concert.',
  colors: {
    ink: '#071A1C',
    ocean: '#0E3D3F',
    teal: '#1F6F6A',
    mist: '#E8F3F1',
    sand: '#F3F0E7',
    chartreuse: '#C8F560',
    coral: '#E86F4A',
    slate: '#2A3436',
  },
} as const;
