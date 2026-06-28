export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getCurrentPageToken,
  savePageToken,
  refreshPageToken,
  getTokenExpiration,
  isAppConfigured,
} from '../../../lib/fbToken';

// Auth: shares the same CRON_SECRET pattern as show-notifications.ts.
function checkAuth(request: Request): boolean {
  const expected = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  if (auth === `Bearer ${expected}`) return true;
  if (request.headers.get('x-cron-secret') === expected) return true;
  return false;
}

// Refreshes the FB page access token by exchanging the current token for a
// fresh long-lived one. Stored in app_config in Neon so the main posting cron
// picks it up on its next run. Runs weekly via Vercel cron — well before the
// 60-day token expiry — so we never have to manually rotate again.
export const GET: APIRoute = async ({ request, url }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryRun = url.searchParams.get('dryRun') === '1';

  if (!isAppConfigured()) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'FB_APP_ID and FB_APP_SECRET must be set in env to refresh the token',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const current = await getCurrentPageToken();
  if (!current) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'No current token in app_config or FB_PAGE_ACCESS_TOKEN env — bootstrap first',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const beforeExpiresAt = await getTokenExpiration(current);
  const nowSec = Math.floor(new Date().getTime() / 1000);
  const beforeDaysRemaining = beforeExpiresAt ? Math.round((beforeExpiresAt - nowSec) / 86400) : null;

  if (dryRun) {
    return new Response(JSON.stringify({
      ok: true, dryRun: true,
      beforeExpiresAt, beforeDaysRemaining,
      message: 'Would refresh the token now',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { token: newToken, expiresIn } = await refreshPageToken(current);
    await savePageToken(newToken);

    const afterExpiresAt = await getTokenExpiration(newToken);
    const afterDaysRemaining = afterExpiresAt ? Math.round((afterExpiresAt - nowSec) / 86400) : null;

    console.log(`[fb] token refreshed: before=${beforeDaysRemaining}d remaining → after=${afterDaysRemaining}d remaining`);

    return new Response(JSON.stringify({
      ok: true,
      beforeDaysRemaining, afterDaysRemaining,
      expiresIn,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(`[fb] token refresh failed:`, err.message);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message,
      beforeDaysRemaining,
      hint: beforeDaysRemaining !== null && beforeDaysRemaining < 0
        ? 'Token has already expired — manual re-issue required via Graph API Explorer.'
        : 'Token exchange rejected by FB. Check app secret + that the token still belongs to the page.',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
