// Live show videos surfaced in the "Live" section on /music.
//
// We deliberately do NOT self-host the source .MOV files: the clips run
// 50-250MB each straight off a phone, iPhone HEVC-in-MOV doesn't decode in
// Chrome or Firefox, and Vercel's bandwidth budget would not survive it.
// Instead we point at the copy already hosted on Facebook (or YouTube), and
// let them serve the transcoded, adaptive stream.
//
// To add a clip: post it to the FB page, copy the post permalink, and add a
// row here. Order is top-to-bottom on the page.

export type VideoSource =
  | { kind: 'facebook'; url: string }   // full post permalink, e.g. https://www.facebook.com/RocksSLC/videos/123456789/
  | { kind: 'youtube'; id: string };    // the 11-char video id, e.g. dQw4w9WgXcQ

export interface LiveVideo {
  title: string;
  venue: string;
  source: VideoSource;
}

export const liveVideos: LiveVideo[] = [
  // Pending: the two Owl Bar clips from Aug 17 are already on the FB page but
  // we need their post permalinks before they can be embedded.
];

export function facebookEmbedSrc(url: string): string {
  const params = new URLSearchParams({
    href: url,
    show_text: 'false',
    width: '560',
    t: '0',
  });
  return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
}

export function youtubeEmbedSrc(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
