import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getEnv } from '@unison/config';

/**
 * POST /api/onboarding
 * Creates an organization and workspace for a newly signed-up user.
 * Only callable when the user has no existing org membership.
 */
export async function POST(request: Request) {
  const env = getEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch { /* server component */ }
      },
    },
  });

  // Verify user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check user doesn't already have an org
  const { data: existingMembership } = await supabase
    .from('org_memberships')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json({ error: 'Already in an organization' }, { status: 409 });
  }

  const body = (await request.json()) as { orgName?: string; workspaceName?: string };
  const orgName = (body.orgName ?? '').trim();
  if (!orgName || orgName.length < 2) {
    return NextResponse.json({ error: 'Organization name must be at least 2 characters' }, { status: 400 });
  }

  // Generate slug from org name
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'org';

  // Make slug unique by appending a short random suffix if needed
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const finalSlug = existing
    ? `${slug}-${Math.random().toString(36).slice(2, 6)}`
    : slug;

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: finalSlug,
      status: 'active',
      plan_id: 'trial',
      seat_limit: 10,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error('org creation error:', orgError);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  // Add user as owner
  const { error: membershipError } = await supabase
    .from('org_memberships')
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: 'owner',
    });

  if (membershipError) {
    console.error('membership error:', membershipError);
    return NextResponse.json({ error: 'Failed to add you to organization' }, { status: 500 });
  }

  // Create default workspace
  const wsName = (body.workspaceName ?? 'Main').trim() || 'Main';
  const wsSlug = wsName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'main';

  await supabase.from('workspaces').insert({
    org_id: org.id,
    name: wsName,
    slug: wsSlug,
    description: 'Default workspace',
  });

  // Ensure profile exists (may not if this is first sign-in after email confirm)
  const displayName = (user.user_metadata?.display_name as string | undefined)
    || user.email?.split('@')[0]
    || 'User';

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    display_name: displayName,
    locale: 'en',
  }, { onConflict: 'id' });

  return NextResponse.json({ orgId: org.id, orgName: org.name, slug: finalSlug });
}
