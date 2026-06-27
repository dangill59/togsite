// Facebook Graph API page-post wrapper.
//
// Reads FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN from env (Vercel project settings).
// All callers go through postText / postPhoto so the API version is in one place.
//
// The Graph API "post id" returned from /photos is `{pageId}_{postId}` — store
// it as-is in fb_posts.fb_post_id; it's the canonical handle for edits/deletes.

const GRAPH_VERSION = 'v21.0';

function env(): { pageId: string; token: string } {
  const pageId = import.meta.env.FB_PAGE_ID || process.env.FB_PAGE_ID;
  const token = import.meta.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    throw new Error('FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN must be set');
  }
  return { pageId, token };
}

export function isFbConfigured(): boolean {
  const pageId = import.meta.env.FB_PAGE_ID || process.env.FB_PAGE_ID;
  const token = import.meta.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  return Boolean(pageId && token);
}

export async function postText(message: string): Promise<string> {
  const { pageId, token } = env();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data: any = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`FB postText failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

// imageUrl must be publicly reachable (FB fetches it server-side). Our public/
// assets satisfy this at https://thoseoneguys.band/...
export async function postPhoto(imageUrl: string, caption: string): Promise<string> {
  const { pageId, token } = env();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, caption, access_token: token }),
  });
  const data: any = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`FB postPhoto failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.post_id || data.id;
}

// === Caption builders ===
//
// One source of truth for the three kinds of show post. Tweak the copy here
// and every future show automatically picks up the new wording.

const SITE = 'https://thoseoneguys.band';

type ShowForCaption = {
  slug: string;
  date: string;   // "AUG 7"
  venue: string;
  city: string;
};

function showLink(slug: string): string {
  return `${SITE}/shows#${slug}`;
}

export function captionAnnouncement(show: ShowForCaption): string {
  return [
    `🎸 NEW SHOW! ${show.date} at ${show.venue} in ${show.city}.`,
    ``,
    `Loud guitars. Big grooves. Zero chill.`,
    ``,
    `Details + directions: ${showLink(show.slug)}`,
  ].join('\n');
}

export function captionReminder(show: ShowForCaption): string {
  return [
    `🎸 THIS WEEK — ${show.date} at ${show.venue} in ${show.city}.`,
    ``,
    `Come hang. Bring the squad.`,
    ``,
    `Details + directions: ${showLink(show.slug)}`,
  ].join('\n');
}

export function captionThanks(show: ShowForCaption): string {
  return [
    `🍻 Thanks for coming out to ${show.venue} last night, ${show.city}!`,
    ``,
    `That crowd was something else. See you at the next one.`,
    ``,
    `Upcoming shows: ${SITE}/shows`,
  ].join('\n');
}

// === Image picker per kind ===
//
// Returns a public URL to the image FB should attach. Defaults to the OG share
// card for all kinds today; we'll add per-show flyers and a thanks image later.

export type FbPostKind = 'announcement' | 'pre' | 'post';

export function imageForKind(_kind: FbPostKind, _slug: string): string {
  return `${SITE}/og-share.png`;
}
