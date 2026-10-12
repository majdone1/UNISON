import { redirect } from 'next/navigation';
import { getEnv, isDemoMode, type UnisonEnv } from '@unison/config';
import { safeNextPath } from '@/lib/auth-redirect';
import { createSupabaseServerClient } from '@/lib/repo';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const error = first(params.error);

  let env: UnisonEnv | null = null;
  try {
    env = getEnv();
  } catch {
    env = null; // invalid environment — render the "not configured" state, never a 500
  }

  // Demo mode has no accounts: go straight into the in-memory workspace.
  if (env && isDemoMode(env)) redirect(next);

  // Already signed in? Skip the form — unless we were sent back with an error
  // (e.g. signed in but no organization), which would otherwise loop.
  if (env && !error) {
    let signedIn = false;
    try {
      const supabase = await createSupabaseServerClient(env);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = Boolean(user);
    } catch {
      signedIn = false;
    }
    if (signedIn) redirect(next);
  }

  return (
    <LoginForm
      supabaseUrl={env?.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      supabaseAnonKey={env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}
      next={next}
      initialError={env ? error : 'config'}
    />
  );
}
