"""Generate a per-show announcement flyer for every show in shows.ts.

Output: public/flyers/{show-slug}.png  (1200x630, Facebook-feed sized)

Style: same warm gradient + halftone + characters as the OG share card so
the brand is consistent, but with the date front-and-center and the venue +
city replacing the generic tagline. Each show announcement post uses the
flyer matching its slug; other post kinds (reminder, thanks) still use the
OG share card.

Re-run this whenever you add a show to src/lib/shows.ts — the script parses
that file directly so there's one source of truth.
"""
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import re
import math
import os

W, H = 1200, 630
FONT = 'C:/Windows/Fonts/impact.ttf'
SHOWS_TS = 'src/lib/shows.ts'

COL_BROWN = (92, 51, 23)
COL_DARK = (26, 10, 5)
COL_CREAM = (253, 245, 230)
COL_ORANGE = (232, 100, 27)
COL_GOLD = (245, 166, 35)
COL_PLUM = (107, 45, 91)
COL_RED = (232, 37, 27)
COL_YELLOW = (255, 225, 53)


def show_slug(date: str, venue: str) -> str:
    s = f"{date}-{venue}".lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def parse_shows():
    """Pull date/isoDate/venue/city out of shows.ts with a simple regex.
    Adding fields to the TS interface won't break this as long as the four
    leading fields stay in their current order."""
    with open(SHOWS_TS, 'r', encoding='utf-8') as f:
        src = f.read()
    pattern = re.compile(
        r'\{\s*date:\s*"([^"]+)",\s*isoDate:\s*"([^"]+)",\s*venue:\s*"([^"]+)",\s*city:\s*"([^"]+)"'
    )
    shows = []
    for m in pattern.finditer(src):
        date, iso, venue, city = m.groups()
        shows.append({
            'date': date,
            'isoDate': iso,
            'venue': venue,
            'city': city,
            'slug': show_slug(date, venue),
        })
    return shows


def make_gradient(w, h):
    img = Image.new('RGB', (w, h), COL_DARK)
    px = img.load()
    stops = [
        (0.00, COL_DARK),
        (0.20, COL_BROWN),
        (0.50, COL_PLUM),
        (0.80, COL_ORANGE),
        (1.00, COL_GOLD),
    ]
    for y in range(h):
        for x in range(w):
            t = ((x / w) + (y / h)) / 2
            for i in range(len(stops) - 1):
                t0, c0 = stops[i]
                t1, c1 = stops[i + 1]
                if t0 <= t <= t1:
                    k = (t - t0) / (t1 - t0)
                    r = int(c0[0] + (c1[0] - c0[0]) * k)
                    g = int(c0[1] + (c1[1] - c0[1]) * k)
                    b = int(c0[2] + (c1[2] - c0[2]) * k)
                    px[x, y] = (r, g, b)
                    break
    return img


def make_growing_text(text, base_size, growth, angle=-4, canvas_w=1100, canvas_h=200):
    canvas_size = int(max(canvas_w, canvas_h) * 1.6)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    letters = list(text)
    widths = []
    total_w = 0
    for i, letter in enumerate(letters):
        size = base_size + i * growth
        font = ImageFont.truetype(FONT, size)
        bbox = font.getbbox(letter)
        lw = bbox[2] - bbox[0]
        if letter == ' ':
            lw = size // 3
        widths.append(lw)
        total_w += lw + 6

    x = (canvas_size - total_w) // 2
    baseline_y = canvas_size // 2 + 40

    for i, letter in enumerate(letters):
        size = base_size + i * growth
        font = ImageFont.truetype(FONT, size)
        bbox = font.getbbox(letter)
        lh = bbox[3] - bbox[1]

        if letter == ' ':
            x += size // 3
            continue

        y = baseline_y - lh
        for ox, oy in [(5, 5), (4, 4), (3, 3)]:
            draw.text((x + ox, y + oy), letter, fill=(0, 0, 0, 200), font=font)
        for ox in range(-3, 4):
            for oy in range(-3, 4):
                if ox * ox + oy * oy <= 9:
                    draw.text((x + ox, y + oy), letter, fill=COL_ORANGE, font=font)
        draw.text((x, y), letter, fill=COL_CREAM, font=font)
        x += widths[i] + 6

    canvas = canvas.rotate(angle, resample=Image.BICUBIC, expand=False)
    left = (canvas_size - canvas_w) // 2
    top = (canvas_size - canvas_h) // 2
    return canvas.crop((left, top, left + canvas_w, top + canvas_h))


def draw_centered_text(img, text, y, size, color, halo_color=(0, 0, 0, 220), halo_radius=2):
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, size)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    for ox in range(-halo_radius, halo_radius + 1):
        for oy in range(-halo_radius, halo_radius + 1):
            if ox * ox + oy * oy <= halo_radius * halo_radius:
                draw.text((x + ox, y + oy), text, fill=halo_color, font=font)
    draw.text((x, y), text, fill=color, font=font)


def add_burst(draw, cx, cy, text, bg_color, text_color, size=70, font_div=3):
    points = []
    for i in range(16):
        angle = (i / 16) * 2 * math.pi - math.pi / 2
        r = size if i % 2 == 0 else size * 0.6
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(points, fill=bg_color, outline=(30, 20, 10, 255))

    font = ImageFont.truetype(FONT, max(size // font_div, 16))
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 4), text, fill=text_color, font=font)


def paste_character(canvas, path, cx, cy, target_h):
    if not os.path.exists(path):
        return  # missing character art — skip rather than crash
    char = Image.open(path).convert('RGBA')
    cw, ch = char.size
    scale = target_h / ch
    new_w = int(cw * scale)
    new_h = int(ch * scale)
    char = char.resize((new_w, new_h), Image.LANCZOS)

    shadow = Image.new('RGBA', (new_w, new_h), (0, 0, 0, 0))
    alpha = char.split()[3]
    shadow.putalpha(alpha.point(lambda a: int(a * 0.55)))
    canvas.paste(shadow, (cx - new_w // 2 + 6, cy - new_h // 2 + 6), shadow)

    canvas.paste(char, (cx - new_w // 2, cy - new_h // 2), char)


def weekday_short(iso_date: str) -> str:
    """Returns SUN/MON/TUE/etc for the show date. Helps the burst feel like
    an event listing rather than a generic logo."""
    try:
        d = datetime.strptime(iso_date, "%Y-%m-%d")
        return d.strftime("%a").upper()
    except Exception:
        return ""


def gen_flyer(show):
    print(f"  {show['slug']}: {show['date']} @ {show['venue']}")
    bg = make_gradient(W, H).convert('RGBA')

    # halftone dot overlay
    dots = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(dots)
    for y in range(0, H, 8):
        for x in range(0, W, 8):
            d.ellipse([x, y, x + 2, y + 2], fill=(0, 0, 0, 30))
    bg = Image.alpha_composite(bg, dots)

    # 1. Title — smaller than OG so it doesn't fight the date
    title = make_growing_text("THOSE ONE GUYS!", base_size=24, growth=4,
                              angle=-4, canvas_w=W, canvas_h=120)
    bg.paste(title, (0, 20), title)

    # 2. Date burst, top-center — the focal point. Big enough to read at thumb size.
    weekday = weekday_short(show['isoDate'])
    burst_text = f"{weekday} {show['date']}".strip() if weekday else show['date']
    draw = ImageDraw.Draw(bg)
    add_burst(draw, W // 2, 215, burst_text, COL_RED, COL_CREAM, size=88, font_div=4)

    # 3. "AT" connector
    draw_centered_text(bg, "AT", 320, size=32, color=COL_GOLD, halo_radius=2)

    # 4. Venue name — second growing-letters line, slightly smaller than the title
    venue = make_growing_text(show['venue'].upper(), base_size=22, growth=3,
                              angle=-3, canvas_w=W, canvas_h=110)
    bg.paste(venue, (0, 350), venue)

    # 5. City
    draw_centered_text(bg, show['city'].upper(), 460, size=28, color=COL_CREAM, halo_radius=2)

    # 6. Two flanking characters (skip the middle so the date burst has room)
    char_h = 200
    char_y = H - 100
    paste_character(bg, 'public/p.png', 130, char_y, char_h)
    paste_character(bg, 'public/darby.png', W - 130, char_y, char_h)

    # 7. URL kicker bottom-right — where to go for details
    draw = ImageDraw.Draw(bg)
    url_font = ImageFont.truetype(FONT, 22)
    url = "THOSEONEGUYS.BAND/SHOWS"
    bbox = url_font.getbbox(url)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    ux = W - tw - 24
    uy = H - th - 24
    for ox, oy in [(2, 2), (1, 1)]:
        draw.text((ux + ox, uy + oy), url, fill=(0, 0, 0, 220), font=url_font)
    draw.text((ux, uy), url, fill=COL_GOLD, font=url_font)

    out = f'public/flyers/{show["slug"]}.png'
    bg.convert('RGB').save(out, 'PNG', optimize=True)
    size_kb = os.path.getsize(out) / 1024
    print(f"    saved {out} ({size_kb:.1f} KB)")


def main():
    os.makedirs('public/flyers', exist_ok=True)
    shows = parse_shows()
    print(f"Generating {len(shows)} show flyer(s):")
    for show in shows:
        gen_flyer(show)
    print("Done.")


if __name__ == '__main__':
    main()
