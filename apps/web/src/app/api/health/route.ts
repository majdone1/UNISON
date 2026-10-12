import { jsonOk } from '@/lib/api';

export async function GET() {
  return jsonOk({
    ok: true,
    service: 'unison-web',
    demoMode: process.env.DEMO_MODE !== 'false',
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  });
}
