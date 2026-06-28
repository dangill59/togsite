// Page access token storage + refresh.
//
// The token lives in app_config under the key 'fb_page_access_token'. The
// env var FB_PAGE_ACCESS_TOKEN is the bootstrap fallback used only when
// app_config has no row yet (e.g. on first deploy before the refresh cron
// has ever fired).
//
// The refresh cron rotates the token in-place by exchanging the current
// long-lived token for a fresh long-lived token via the fb_exchange_token
// grant. That requires FB_APP_ID + FB_APP_SECRET to be set.

import { getSql } from './db';

const KEY = 'fb_page_access_token';
const GRAPH_VERSION = 'v21.0';

export async function getCurrentPageToken(): Promise<string | null> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT value FROM app_config WHERE key = ${KEY}` as Array<{ value: string }>;
    if (rows.length > 0 && rows[0].value) return rows[0].value;
  } catch {
    // db unreachable — fall through to env fallback
  }
  const envToken = import.meta.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  return envToken || null;
}

export async function savePageToken(token: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO app_config (key, value)
    VALUES (${KEY}, ${token})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export function isAppConfigured(): boolean {
  const appId = import.meta.env.FB_APP_ID || process.env.FB_APP_ID;
  const appSecret = import.meta.env.FB_APP_SECRET || process.env.FB_APP_SECRET;
  return Boolean(appId && appSecret);
}

// Exchanges the current token for a refreshed one. fb_exchange_token works
// for both user tokens and (in practice) page tokens derived from a long-lived
// user token — the response shape is the same: { access_token, token_type, expires_in? }.
// Throws on any failure so the caller can log + alert.
export async function refreshPageToken(currentToken: string): Promise<{ token: string; expiresIn: number | null }> {
  const appId = import.meta.env.FB_APP_ID || process.env.FB_APP_ID;
  const appSecret = import.meta.env.FB_APP_SECRET || process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('FB_APP_ID and FB_APP_SECRET must be set to refresh the token');
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', currentToken);

  const res = await fetch(url.toString());
  const data: any = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`FB token refresh failed: ${JSON.stringify(data.error || data)}`);
  }
  if (!data.access_token) {
    throw new Error(`FB token refresh response missing access_token: ${JSON.stringify(data)}`);
  }
  return { token: data.access_token, expiresIn: data.expires_in ?? null };
}

// Inspects a token (via the app's own debug_token endpoint) and returns
// the expiration timestamp in seconds, or null if FB doesn't report one.
// Used by the refresh cron to surface "expires in N days" in its log output.
export async function getTokenExpiration(token: string): Promise<number | null> {
  const appId = import.meta.env.FB_APP_ID || process.env.FB_APP_ID;
  const appSecret = import.meta.env.FB_APP_SECRET || process.env.FB_APP_SECRET;
  if (!appId || !appSecret) return null;

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/debug_token`);
  url.searchParams.set('input_token', token);
  url.searchParams.set('access_token', `${appId}|${appSecret}`);

  const res = await fetch(url.toString());
  const data: any = await res.json();
  if (!res.ok || data.error || !data.data) return null;
  return data.data.expires_at ?? null;
}
