"""
TOG Hero Squad stage poster — matches home page style.
Size: 18 x 24 inches at 150 DPI = 2700 x 3600 (portrait).
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode

# === Setup ===
DPI = 150
W, H = 18 * DPI, 24 * DPI  # 2700 x 3600

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
FONTS = os.path.join(ROOT, ".fonts")
BANGERS = os.path.join(FONTS, "Bangers-Regular.ttf")
RIGHTEOUS = os.path.join(FONTS, "Righteous-Regular.ttf")

# Home page palette
ORANGE = (232, 100, 27)
GOLD = (245, 166, 35)
BROWN = (92, 51, 23)
DARK_BROWN = (26, 10, 5)
CREAM = (253, 245, 230)
TEAL = (26, 138, 125)
PLUM = (107, 45, 91)
RUST = (192, 57, 43)
RED = (232, 37, 27)
YELLOW = (255, 225, 53)
PINK = (255, 105, 180)
BLUE = (30, 144, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


# === Hero gradient background (matches .hero linear-gradient(145deg, ...)) ===
def make_gradient(w, h):
    """linear-gradient(145deg, dark_brown 0%, brown 20%, plum 50%, orange 80%, gold 100%)"""
    img = Image.new("RGB", (w, h), DARK_BROWN)
    px = img.load()
    angle = math.radians(145 - 90)  # CSS 145deg = down-left direction; convert
    dx, dy = math.sin(math.radians(145)), -math.cos(math.radians(145))
    # project (x,y) onto the gradient axis; normalize 0..1
    # corners
    corners = [(0, 0), (w, 0), (0, h), (w, h)]
    projs = [x * dx + y * dy for x, y in corners]
    pmin, pmax = min(projs), max(projs)

    stops = [
        (0.00, DARK_BROWN),
        (0.20, BROWN),
        (0.50, PLUM),
        (0.80, ORANGE),
        (1.00, GOLD),
    ]

    def interp(t):
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                f = (t - t0) / (t1 - t0)
                return tuple(int(c0[k] + f * (c1[k] - c0[k])) for k in range(3))
        return stops[-1][1]

    for y in range(h):
        for x in range(w):
            t = (x * dx + y * dy - pmin) / (pmax - pmin)
            px[x, y] = interp(t)
    return img


# === Halftone dots (matches .halftone::before) ===
def add_halftone(img, color=(0, 0, 0), opacity=20, spacing=18, radius=3):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(0, img.size[1], spacing):
        for x in range(0, img.size[0], spacing):
            d.ellipse((x - radius, y - radius, x + radius, y + radius),
                      fill=(*color, opacity))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


# === Speed lines (subtle, matches SpeedLines component) ===
def add_speed_lines(img, color=CREAM, opacity=20, count=80):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = img.size[0] // 2, img.size[1] // 2
    for _ in range(count):
        a = random.uniform(0, 2 * math.pi)
        r1 = random.uniform(300, 800)
        r2 = r1 + random.uniform(400, 1200)
        x1 = cx + r1 * math.cos(a)
        y1 = cy + r1 * math.sin(a)
        x2 = cx + r2 * math.cos(a)
        y2 = cy + r2 * math.sin(a)
        w = random.choice([2, 3, 4])
        d.line([(x1, y1), (x2, y2)], fill=(*color, opacity), width=w)
    return Image.alpha_composite(img, overlay)


# === Comic burst shapes ===
def burst_polygon(cx, cy, r_outer, r_inner, points, rotate=0):
    pts = []
    for i in range(points * 2):
        r = r_outer if i % 2 == 0 else r_inner
        a = math.radians(rotate + i * (360 / (points * 2)))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_comic_burst(img, cx, cy, text, bg, fg=CREAM, size="md",
                     shape="star", rotate=0):
    """size: xs,sm,md,lg ; shape: star, pow, jagged, bang, zap, cloud"""
    sizes = {"xs": 70, "sm": 110, "md": 165, "lg": 230}
    r = sizes.get(size, 130)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # outline (dark) layer first
    if shape in ("star", "bang"):
        pts_out = burst_polygon(cx, cy, r * 1.05, r * 0.55, 10, rotate)
        pts = burst_polygon(cx, cy, r, r * 0.5, 10, rotate)
    elif shape == "pow":
        pts_out = burst_polygon(cx, cy, r * 1.05, r * 0.65, 12, rotate)
        pts = burst_polygon(cx, cy, r, r * 0.6, 12, rotate)
    elif shape == "jagged":
        pts_out = burst_polygon(cx, cy, r * 1.05, r * 0.7, 14, rotate)
        pts = burst_polygon(cx, cy, r, r * 0.65, 14, rotate)
    elif shape == "zap":
        pts_out = burst_polygon(cx, cy, r * 1.05, r * 0.4, 8, rotate)
        pts = burst_polygon(cx, cy, r, r * 0.35, 8, rotate)
    else:  # cloud
        pts_out = burst_polygon(cx, cy, r * 1.05, r * 0.85, 16, rotate)
        pts = burst_polygon(cx, cy, r, r * 0.8, 16, rotate)

    # offset shadow
    shadow = [(p[0] + 8, p[1] + 8) for p in pts]
    d.polygon(shadow, fill=(0, 0, 0, 110))
    d.polygon(pts_out, fill=(*BROWN, 255))
    d.polygon(pts, fill=bg)

    # text
    f_size = int(r * 0.55)
    f = font(BANGERS, f_size)
    bbox = d.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2 - bbox[0]
    ty = cy - th / 2 - bbox[1]
    # rotate text by drawing on a separate image
    tlayer = Image.new("RGBA", (int(r * 2.4), int(r * 2.4)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tlayer)
    tcx, tcy = tlayer.size[0] / 2, tlayer.size[1] / 2
    td.text((tcx - tw / 2 - bbox[0], tcy - th / 2 - bbox[1]),
            text, font=f, fill=fg,
            stroke_width=4, stroke_fill=BROWN)
    tlayer = tlayer.rotate(-rotate, resample=Image.BICUBIC)
    layer.alpha_composite(tlayer, (int(cx - tlayer.size[0] / 2),
                                   int(cy - tlayer.size[1] / 2)))

    return Image.alpha_composite(img, layer)


# === Growing letter title — each letter bigger and higher than the last ===
def draw_title(img, text, cx, cy, base_size, grow_per_letter, rotate=0,
               uphill_per_letter=0):
    """
    Each letter grows slightly larger than the previous (matches .grow-letter).
    With uphill_per_letter > 0, each letter is also lifted that many pixels
    above the previous one — creates a left-to-right uphill climb.
    """
    sizes = []
    for i, ch in enumerate(text):
        sizes.append(int(base_size + i * grow_per_letter))
    total_w = 0
    max_h = 0
    glyphs = []
    for i, ch in enumerate(text):
        sz = sizes[i]
        f = font(BANGERS, sz)
        tmp = Image.new("RGBA", (sz * 2, int(sz * 1.6)), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        bbox = td.textbbox((0, 0), ch if ch != " " else "M", font=f)
        gw = bbox[2] - bbox[0]
        gh = bbox[3] - bbox[1]
        if ch == " ":
            glyphs.append((None, sz // 2, gh, sz))
            total_w += sz // 2 + 12
            max_h = max(max_h, gh)
            continue
        # Extrusion depth scales with letter size for consistent feel
        depth = max(8, int(sz * 0.10))
        cw = gw + 80 + depth
        ch_h = gh + 80 + depth
        gl = Image.new("RGBA", (cw, ch_h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        ox, oy = 40 - bbox[0], 40 - bbox[1]
        # Soft drop shadow on the ground
        gd.text((ox + depth + 10, oy + depth + 10), ch, font=f,
                fill=(0, 0, 0, 140))
        # 3D extrusion: stack of offset copies stepping down-right
        for d_off in range(depth, 0, -1):
            shade = 1 - (d_off / depth) * 0.35
            r = int(BROWN[0] * shade)
            g_ = int(BROWN[1] * shade)
            b = int(BROWN[2] * shade)
            gd.text((ox + d_off, oy + d_off), ch, font=f, fill=(r, g_, b))
        # Orange highlight peeking from top-left edge
        gd.text((ox - 3, oy - 3), ch, font=f, fill=ORANGE)
        # Bright cream top face with dark stroke
        gd.text((ox, oy), ch, font=f, fill=CREAM,
                stroke_width=4, stroke_fill=BROWN)
        glyphs.append((gl, gw, gh, sz))
        total_w += gw + max(12, sz // 8)
        max_h = max(max_h, ch_h)

    # Make canvas taller to accommodate uphill lift
    total_lift = uphill_per_letter * max(0, len(text) - 1)
    canvas_h = max_h + 60 + total_lift
    canvas = Image.new("RGBA", (total_w + 80, canvas_h), (0, 0, 0, 0))
    x = 0
    baseline = canvas_h - 20
    for i, (g, gw, gh, sz) in enumerate(glyphs):
        if g is None:
            x += gw + 12
            continue
        lift = uphill_per_letter * i
        canvas.alpha_composite(g, (x, baseline - g.size[1] - lift))
        x += gw + max(12, sz // 8)

    if rotate:
        canvas = canvas.rotate(rotate, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(canvas, (int(cx - canvas.size[0] / 2),
                                 int(cy - canvas.size[1] / 2)))
    return img


# === Comic panel border (matches .comic-panel) ===
def draw_border(img, inset=40, thickness=18):
    d = ImageDraw.Draw(img)
    w, h = img.size
    # outer cream frame
    d.rectangle((inset - 14, inset - 14, w - inset + 14, h - inset + 14),
                outline=CREAM, width=10)
    # main brown frame
    d.rectangle((inset, inset, w - inset, h - inset),
                outline=BROWN, width=thickness)
    # offset shadow on inner
    return img


# === QR ===
def make_qr(url, size=900, fg=BROWN, bg=CREAM):
    qr = qrcode.QRCode(box_size=20, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_H)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fg, back_color=bg).convert("RGBA")
    return img.resize((size, size), Image.LANCZOS)


# === Place a character image ===
def place_character(canvas, char_path, cx, cy, target_h, rotate=0):
    img = Image.open(char_path).convert("RGBA")
    scale = target_h / img.size[1]
    new_w = int(img.size[0] * scale)
    img = img.resize((new_w, target_h), Image.LANCZOS)
    if rotate:
        img = img.rotate(rotate, resample=Image.BICUBIC, expand=True)

    # drop shadow
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    a = img.split()[-1]
    sd = Image.new("RGBA", img.size, (0, 0, 0, 100))
    sd.putalpha(a)
    sd = sd.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(sd, (int(cx - img.size[0] / 2) + 12,
                                int(cy - img.size[1] / 2) + 18))
    canvas.alpha_composite(img, (int(cx - img.size[0] / 2),
                                 int(cy - img.size[1] / 2)))


# === Build poster ===
def build():
    random.seed(42)
    print(f"Building {W}x{H} poster ({W/DPI}x{H/DPI} inches at {DPI} DPI)…")

    # gradient bg
    bg = make_gradient(W, H)
    bg = bg.convert("RGBA")
    bg = add_halftone(bg, color=(0, 0, 0), opacity=22, spacing=24, radius=4)
    bg = add_speed_lines(bg, color=CREAM, opacity=22, count=140)

    img = bg

    # === Top scattered bursts (corners + edges) ===
    edge_bursts = [
        # (x_frac, y_frac, text, color, fg, size, shape, rotate)
        (0.10, 0.06, "BAM!", RED, CREAM, "md", "pow", -20),
        (0.90, 0.06, "POW!", YELLOW, BROWN, "md", "jagged", 15),
        (0.07, 0.34, "ZAP!", PINK, CREAM, "sm", "zap", -10),
        (0.93, 0.32, "WHAM!", BLUE, CREAM, "sm", "bang", 25),
        (0.07, 0.93, "CRASH!", TEAL, CREAM, "sm", "jagged", 20),
        (0.93, 0.93, "OOF!", PINK, CREAM, "sm", "pow", -15),
        (0.94, 0.55, "KERPOW!", RUST, CREAM, "md", "star", -22),
    ]
    for fx, fy, t, bgc, fgc, sz, sh, rot in edge_bursts:
        img = draw_comic_burst(img, int(fx * W), int(fy * H), t,
                               (*bgc, 255), fg=fgc, size=sz, shape=sh, rotate=rot)

    # === Three main bursts row (THOSE! ONE! GUYS!) ===
    main_bursts_y = int(0.10 * H)
    img = draw_comic_burst(img, int(0.28 * W), main_bursts_y, "THOSE!",
                           (*ORANGE, 255), fg=CREAM, size="lg", shape="star", rotate=-12)
    img = draw_comic_burst(img, int(0.50 * W), main_bursts_y - 30, "ONE!",
                           (*TEAL, 255), fg=CREAM, size="lg", shape="pow", rotate=8)
    img = draw_comic_burst(img, int(0.72 * W), main_bursts_y, "GUYS!",
                           (*PLUM, 255), fg=CREAM, size="lg", shape="jagged", rotate=-5)

    # === Title (growing letters, climbing uphill left-to-right) ===
    title_cx, title_cy = W // 2, int(0.22 * H)
    img = draw_title(img, "THOSE ONE GUYS!", title_cx, title_cy,
                     base_size=130, grow_per_letter=10,
                     rotate=0, uphill_per_letter=14)

    # === Tagline ===
    d = ImageDraw.Draw(img)
    tag = "Loud guitars. Big grooves. Zero chill."
    f_tag = font(BANGERS, 90)
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    tag_y = int(0.27 * H)
    d.text(((W - tw) / 2 + 6, tag_y + 6), tag, font=f_tag, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, tag_y), tag, font=f_tag, fill=CREAM,
           stroke_width=3, stroke_fill=BROWN)

    # === Three characters in a row (matches hero-characters) ===
    char_y = int(0.44 * H)
    char_h = 950
    p_path = os.path.join(PUBLIC, "p.png")
    dano_path = os.path.join(PUBLIC, "dano.png")
    darby_path = os.path.join(PUBLIC, "darby.png")
    place_character(img, p_path, int(0.20 * W), char_y, char_h, rotate=-2)
    place_character(img, dano_path, int(0.50 * W), char_y - 30, char_h + 60, rotate=0)
    place_character(img, darby_path, int(0.80 * W), char_y, char_h, rotate=2)

    # === TOG HERO SQUAD section ===
    section_y = int(0.62 * H)
    panel_h = int(0.36 * H)

    # Comic panel-style cream banner behind text + QR
    panel = Image.new("RGBA", (int(W * 0.84), panel_h), (*CREAM, 240))
    pd = ImageDraw.Draw(panel)
    pd.rectangle((0, 0, panel.size[0] - 1, panel.size[1] - 1),
                 outline=BROWN, width=14)
    # offset shadow
    sh = Image.new("RGBA", (panel.size[0] + 24, panel.size[1] + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rectangle((24, 24, panel.size[0] + 24, panel.size[1] + 24),
                 fill=(0, 0, 0, 140))
    px = int(W * 0.08)
    img.alpha_composite(sh, (px, section_y - 24))
    img.alpha_composite(panel, (px, section_y))

    # Banner title
    f_join = font(BANGERS, 150)
    join_text = "JOIN THE TOG HERO SQUAD!"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), join_text, font=f_join)
    tw = bbox[2] - bbox[0]
    join_y = section_y + 50
    d.text(((W - tw) / 2 + 5, join_y + 5), join_text, font=f_join, fill=(0, 0, 0, 120))
    d.text(((W - tw) / 2, join_y), join_text, font=f_join, fill=BROWN,
           stroke_width=4, stroke_fill=ORANGE)

    # Subtitle
    f_sub = font(RIGHTEOUS, 60)
    sub = "Free pin. Custom hero card. Squad perks."
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, join_y + 180), sub, font=f_sub, fill=BROWN)

    # === QR code ===
    qr_size = 640
    qr = make_qr("https://thoseoneguys.band/fanclub", size=qr_size, fg=BROWN, bg=CREAM)
    qr_frame = Image.new("RGBA", (qr_size + 60, qr_size + 60), (*CREAM, 255))
    qfd = ImageDraw.Draw(qr_frame)
    qfd.rectangle((0, 0, qr_frame.size[0] - 1, qr_frame.size[1] - 1),
                  outline=BROWN, width=10)
    qr_x = (W - qr_size - 60) // 2
    qr_y = section_y + 350
    img.alpha_composite(qr_frame, (qr_x, qr_y))
    img.alpha_composite(qr, (qr_x + 30, qr_y + 30))

    # SCAN ME burst beside QR
    img = draw_comic_burst(img, qr_x + qr_size + 220, qr_y + 100, "SCAN!",
                           (*YELLOW, 255), fg=BROWN, size="md", shape="bang", rotate=15)
    img = draw_comic_burst(img, qr_x - 180, qr_y + qr_size - 120, "FREE!",
                           (*RED, 255), fg=CREAM, size="md", shape="star", rotate=-18)

    # URL
    f_url = font(BANGERS, 80)
    url_text = "thoseoneguys.band/fanclub"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), url_text, font=f_url)
    tw = bbox[2] - bbox[0]
    url_y = qr_y + qr_size + 90
    d.text(((W - tw) / 2 + 4, url_y + 4), url_text, font=f_url, fill=(0, 0, 0, 140))
    d.text(((W - tw) / 2, url_y), url_text, font=f_url, fill=CREAM,
           stroke_width=3, stroke_fill=BROWN)

    # === Comic panel border around the whole thing ===
    img = draw_border(img.convert("RGBA"), inset=40, thickness=20)

    out_path = os.path.join(PUBLIC, "tog-squad-poster.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"Saved -> {out_path} ({os.path.getsize(out_path) // 1024} KB)")


if __name__ == "__main__":
    build()
