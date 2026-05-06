import { Resend } from 'resend';

export const SITE = 'https://thoseoneguys.band';
export const FROM = 'Those One Guys <fans@thoseoneguys.band>';

export function getResend() {
  const key = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

export function unsubscribeUrl(email: string, signalCode: string | null) {
  return `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(signalCode || '')}`;
}

export function firstName(name: string | null | undefined): string {
  return (name || '').split(' ')[0] || '';
}

const DISPLAY = "Impact, 'Arial Black', sans-serif";
const COL = {
  brown: '#5c3317', darkBrown: '#1a0a05', cream: '#fdf5e6',
  orange: '#e8641b', gold: '#f5a623', teal: '#1a8a7d',
  plum: '#6b2d5b', red: '#e8251b',
};

export interface WelcomeData {
  name: string | null;
  email: string;
  signalCode: string;
  favoriteMember: string | null;
  superpower: string | null;
  heroImageUrl: string | null;
  // Optional raw PNG bytes for the hero image. When provided the image is
  // attached inline (CID) and embedded via <img src="cid:...">, which renders
  // even in clients (Yahoo, Outlook) that block remote images by default.
  heroImageBuffer?: Buffer;
  dateStr: string;
}

const HERO_CID = 'tog-hero';

export function welcomeBody(d: WelcomeData): string {
  const fname = firstName(d.name);
  const heroSrc = d.heroImageBuffer ? `cid:${HERO_CID}` : d.heroImageUrl;
  const heroImg = heroSrc
    ? `<img src="${heroSrc}" width="280" height="280" style="display:block;width:280px;max-width:100%;height:auto;margin:0 auto;border:3px solid ${COL.gold};background:${COL.cream};" alt="Your Hero" />`
    : `<div style="width:280px;height:280px;background:${COL.cream};border:3px solid ${COL.gold};margin:0 auto;display:inline-block;"></div>`;

  // Email-rendered "license card" mirroring the on-site hero card
  const card = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.darkBrown};background-image:linear-gradient(135deg,${COL.darkBrown},${COL.brown},${COL.plum});border:4px solid ${COL.brown};box-shadow:5px 5px 0 ${COL.brown};border-collapse:separate;">
          <tr><td style="padding:14px 18px;border-bottom:2px solid rgba(245,166,35,0.4);">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td valign="middle" width="56"><img src="${SITE}/logo-nav.png" width="48" height="48" style="display:block;border-radius:6px;border:2px solid ${COL.gold};" alt="TOG" /></td>
              <td valign="middle" style="padding-left:14px;">
                <div style="font-family:${DISPLAY};color:${COL.gold};font-size:20px;letter-spacing:3px;text-transform:uppercase;">Those One Guys</div>
                <div style="font-family:${DISPLAY};color:${COL.cream};font-size:11px;letter-spacing:2px;opacity:0.7;text-transform:uppercase;">Official TOG Hero Squad ID</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:18px 18px 8px;text-align:center;background:rgba(0,0,0,0.18);">
            ${heroImg}
          </td></tr>
          <tr><td style="padding:18px;color:${COL.cream};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:5px 0;">
                <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:2px;color:rgba(253,245,230,0.6);text-transform:uppercase;">Name</div>
                <div style="font-family:${DISPLAY};font-size:22px;color:${COL.cream};letter-spacing:2px;text-transform:uppercase;">${d.name || ''}</div>
              </td></tr>
              <tr><td style="padding:5px 0;">
                <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:2px;color:rgba(253,245,230,0.6);text-transform:uppercase;">Superpower</div>
                <div style="font-family:${DISPLAY};font-size:18px;color:${COL.orange};letter-spacing:2px;">${d.superpower || 'Mystery Power'}</div>
              </td></tr>
              <tr><td style="padding:5px 0;">
                <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:2px;color:rgba(253,245,230,0.6);text-transform:uppercase;">Signal Code &middot; Since</div>
                <div style="font-family:${DISPLAY};font-size:16px;color:${COL.cream};letter-spacing:3px;">${d.signalCode} &nbsp;&middot;&nbsp; ${d.dateStr}</div>
              </td></tr>
              <tr><td style="padding:5px 0;">
                <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:2px;color:rgba(253,245,230,0.6);text-transform:uppercase;">Ally</div>
                <div style="font-family:${DISPLAY};font-size:14px;color:${COL.cream};letter-spacing:2px;">${d.favoriteMember || ''}</div>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:10px 18px;background:rgba(0,0,0,0.3);text-align:center;">
            <div style="font-family:${DISPLAY};font-size:11px;letter-spacing:2px;color:${COL.gold};text-transform:uppercase;">Flash this card at any show for surprise merch</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td align="center">
      <div style="display:inline-block;background:${COL.red};color:${COL.cream};font-family:${DISPLAY};font-size:28px;letter-spacing:4px;text-transform:uppercase;padding:10px 26px;border:3px solid ${COL.brown};box-shadow:4px 4px 0 ${COL.brown};transform:rotate(-3deg);">Welcome${fname ? ', ' + fname : ''}!</div>
    </td></tr></table>

    <p style="margin:0 0 16px;font-size:17px;text-align:center;">You're officially in the <strong>TOG Hero Squad</strong>. Here's your card.</p>

    ${card}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;"><tr><td align="center">
      <a href="${SITE}/fanclub" style="display:inline-block;background:${COL.orange};color:${COL.cream};font-family:${DISPLAY};font-size:18px;letter-spacing:3px;text-transform:uppercase;padding:14px 36px;border:3px solid ${COL.brown};box-shadow:4px 4px 0 ${COL.brown};text-decoration:none;">Download My Card</a>
    </td></tr></table>

    <p style="margin:0 0 14px;font-family:${DISPLAY};font-size:22px;letter-spacing:2px;text-transform:uppercase;color:${COL.brown};text-align:center;">What the squad gets you</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${DISPLAY};font-size:22px;color:${COL.red};line-height:1;">&#9733;</td><td valign="top" style="padding:4px 0;">Heads-up emails on <strong>upcoming shows and special events</strong>.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${DISPLAY};font-size:22px;color:${COL.teal};line-height:1;">&#9733;</td><td valign="top" style="padding:4px 0;">First-look at <strong>merch drops</strong> before they go public.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${DISPLAY};font-size:22px;color:${COL.orange};line-height:1;">&#9733;</td><td valign="top" style="padding:4px 0;"><strong>Free swag at gigs</strong> &mdash; show your hero card at the merch table and we'll hook you up.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${DISPLAY};font-size:22px;color:${COL.plum};line-height:1;">&#9733;</td><td valign="top" style="padding:4px 0;"><strong>Custom hero merch</strong> &mdash; your superhero on a tee, mug, pin, or cap once the store opens.</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;text-align:center;">See you at a show.</p>
    <p style="margin:6px 0 0;font-family:${DISPLAY};font-size:18px;letter-spacing:2px;color:${COL.brown};text-align:center;">&mdash; Dano, Darby &amp; Mr P</p>
  `;
}

export async function sendWelcomeEmail(d: WelcomeData) {
  try {
    const resend = getResend();
    const html = wrapHtml(welcomeBody(d), firstName(d.name), unsubscribeUrl(d.email, d.signalCode));
    const payload: any = {
      from: FROM,
      to: [d.email],
      subject: 'Welcome to the TOG Hero Squad!',
      html,
    };
    if (d.heroImageBuffer) {
      payload.attachments = [{
        filename: 'hero.png',
        content: d.heroImageBuffer.toString('base64'),
        contentId: HERO_CID,
      }];
    }
    await resend.emails.send(payload);
  } catch (err: any) {
    console.error('Welcome email send failed:', err.message);
  }
}

export function wrapHtml(bodyHtml: string, name: string, unsubUrl: string): string {
  // Email-safe: inline styles, table layout for Outlook, web-safe fonts.
  // Uses the site's palette and mirrors the home-page hero (gradient,
  // halftone-suggested background, character row, comic-style headline).
  const palette = {
    brown: '#5c3317',
    darkBrown: '#1a0a05',
    cream: '#fdf5e6',
    orange: '#e8641b',
    gold: '#f5a623',
    teal: '#1a8a7d',
    plum: '#6b2d5b',
    red: '#e8251b',
  };
  const display = `Impact, 'Arial Black', sans-serif`;
  const heroBg = `background:#1a0a05;background-image:linear-gradient(145deg,${palette.darkBrown} 0%,${palette.brown} 20%,${palette.plum} 50%,${palette.orange} 80%,${palette.gold} 100%);`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Those One Guys</title>
</head>
<body style="margin:0;padding:0;background:${palette.cream};font-family:'Helvetica Neue',Arial,sans-serif;color:${palette.brown};">
  <!-- Preheader (hidden but shows in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Welcome to the TOG Hero Squad. Show alerts, free gig swag, custom hero merch.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${palette.cream};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- Outer comic panel -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:4px solid ${palette.brown};border-collapse:separate;">

          <!-- Hero gradient header -->
          <tr>
            <td align="center" style="${heroBg}padding:36px 20px 24px;text-align:center;">
              <div style="font-family:${display};font-weight:900;color:${palette.cream};font-size:42px;line-height:1;letter-spacing:6px;text-shadow:4px 4px 0 ${palette.darkBrown},-2px -2px 0 ${palette.orange};text-transform:uppercase;">
                Those One Guys!
              </div>
              <div style="margin-top:10px;font-family:${display};color:${palette.gold};font-size:20px;letter-spacing:4px;text-transform:uppercase;text-shadow:2px 2px 0 rgba(0,0,0,0.4);">
                Loud guitars. Big grooves. Zero chill.
              </div>
            </td>
          </tr>

          <!-- Character row -->
          <tr>
            <td align="center" style="${heroBg}padding:0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 8px;"><img src="${SITE}/p.png" alt="Mr P" width="120" height="120" style="display:block;width:120px;height:auto;filter:drop-shadow(3px 3px 0 rgba(0,0,0,0.4));" /></td>
                  <td style="padding:0 8px;"><img src="${SITE}/dano.png" alt="Dano" width="140" height="140" style="display:block;width:140px;height:auto;margin-top:-12px;filter:drop-shadow(3px 3px 0 rgba(0,0,0,0.4));" /></td>
                  <td style="padding:0 8px;"><img src="${SITE}/darby.png" alt="Darby" width="120" height="120" style="display:block;width:120px;height:auto;filter:drop-shadow(3px 3px 0 rgba(0,0,0,0.4));" /></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body content (templates supply their own headline at the top) -->
          <tr>
            <td style="background:${palette.cream};padding:32px 32px 16px;font-size:16px;line-height:1.65;color:${palette.brown};">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${palette.brown};padding:20px 24px;text-align:center;color:${palette.cream};font-size:12px;line-height:1.5;">
              <div style="font-family:${display};color:${palette.gold};font-size:16px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">
                Those One Guys
              </div>
              <div style="opacity:0.85;">
                You're getting this because you joined the TOG Hero Squad.
              </div>
              <div style="margin-top:6px;">
                <a href="${unsubUrl}" style="color:${palette.gold};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE}" style="color:${palette.gold};text-decoration:underline;">thoseoneguys.band</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
