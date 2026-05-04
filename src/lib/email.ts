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

          <!-- Comic-burst-style "WELCOME!" label (rotated rectangle) -->
          <tr>
            <td align="center" style="background:${palette.cream};padding:24px 20px 0;">
              <div style="display:inline-block;background:${palette.red};color:${palette.cream};font-family:${display};font-size:28px;letter-spacing:4px;text-transform:uppercase;padding:10px 26px;border:3px solid ${palette.brown};box-shadow:4px 4px 0 ${palette.brown};transform:rotate(-3deg);">
                Welcome${name ? ', ' + name : ''}!
              </div>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="background:${palette.cream};padding:24px 32px 16px;font-size:16px;line-height:1.65;color:${palette.brown};">
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
