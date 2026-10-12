/**
 * Supabase Edge Function stub: Stripe/mock billing webhooks.
 * Deploy when SUPABASE + STRIPE credentials exist (BLOCKED_EXTERNAL).
 *
 * Expected flow:
 * 1. Verify Stripe signature (or accept mock events in DEMO_MODE)
 * 2. Map event → subscription status update
 * 3. Enforce grace/suspend via organizations.status + subscriptions.status
 * 4. Write audit_logs row
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const payload = await req.json().catch(() => null);
  return Response.json({
    ok: true,
    received: Boolean(payload),
    provider: 'stub',
    message: 'Wire @unison/billing MockBillingProvider / Stripe verifier here',
  });
});
