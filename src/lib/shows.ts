export interface Show {
  date: string;        // human-readable, e.g. "MAY 2"
  isoDate: string;     // machine-parseable, e.g. "2026-05-02" — drives T-2 / T+1 cron notifications
  venue: string;
  city: string;
  note: string;
  burst: string;
  shape: 'star' | 'pow' | 'jagged' | 'bang' | 'zap' | 'cloud';
  burstBg: string;
  address: string;
}

export const shows: Show[] = [
  { date: "MAY 2",  isoDate: "2026-05-02", venue: "The Owl Bar", city: "Sundance, UT", note: "", burst: "THOSE!", shape: "star",   burstBg: "#e8641b", address: "The Owl Bar, Sundance Mountain Resort, Sundance, UT" },
  { date: "MAY 16", isoDate: "2026-05-16", venue: "Brewskis",    city: "Ogden, UT",    note: "", burst: "ONE!",   shape: "pow",    burstBg: "#1a8a7d", address: "Brewskis, Ogden, UT" },
  { date: "AUG 7",  isoDate: "2026-08-07", venue: "The Owl Bar", city: "Sundance, UT", note: "", burst: "GUYS!",  shape: "jagged", burstBg: "#6b2d5b", address: "The Owl Bar, Sundance Mountain Resort, Sundance, UT" },
  { date: "AUG 15", isoDate: "2026-08-15", venue: "Brewskis",    city: "Ogden, UT",    note: "", burst: "POW!",   shape: "bang",   burstBg: "#e8251b", address: "Brewskis, Ogden, UT" },
];

export function showSlug(show: { date: string; venue: string }): string {
  return `${show.date}-${show.venue}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function showLabel(show: { date: string; venue: string }): string {
  return `${show.date} — ${show.venue}`;
}
