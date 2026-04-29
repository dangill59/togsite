"""
TOG Venmo tip poster — same style + size as the squad poster.
18 x 24 inches at 150 DPI = 2700 x 3600 (portrait).

QR is a placeholder for now — pass --qr <path> to drop in the real one,
or set VENMO_QR_PATH env var.
"""
import os
import sys
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Reuse helpers from the squad poster generator
from gen_poster import (
    DPI, W, H, PUBLIC, BANGERS, RIGHTEOUS,
    ORANGE, GOLD, BROWN, DARK_BROWN, CREAM, TEAL, PLUM,
    RUST, RED, YELLOW, PINK, BLUE,
    font, make_gradient, add_halftone, add_speed_lines,
    draw_comic_burst, draw_title, draw_border, place_character,
)

VENMO_BLUE = (0, 138, 215)  # Venmo brand blue


def load_qr_placeholder(qr_path, size):
    """Load supplied QR or generate a labeled placeholder square."""
    if qr_path and os.path.exists(qr_path):
        qr = Image.open(qr_path).convert("RGBA")
        return qr.resize((size, size), Image.LANCZOS)

    # Placeholder: white square with grid + "QR PLACEHOLDER" text
    ph = Image.new("RGBA", (size, size), (*CREAM, 255))
    pd = ImageDraw.Draw(ph)
    # subtle grid
    step = size // 12
    for i in range(0, size, step):
        pd.line([(i, 0), (i, size)], fill=(*BROWN, 40), width=2)
        pd.line([(0, i), (size, i)], fill=(*BROWN, 40), width=2)
    # frame
    pd.rectangle((0, 0, size - 1, size - 1), outline=BROWN, width=8)
    # corner squares (mimic QR finder patterns)
    box = size // 6
    for cx, cy in [(box // 2, box // 2),
                   (size - box - box // 2, box // 2),
                   (box // 2, size - box - box // 2)]:
        pd.rectangle((cx, cy, cx + box, cy + box), fill=BROWN)
        pd.rectangle((cx + box // 6, cy + box // 6,
                      cx + box - box // 6, cy + box - box // 6), fill=CREAM)
        pd.rectangle((cx + box // 3, cy + box // 3,
                      cx + box - box // 3, cy + box - box // 3), fill=BROWN)
    # label
    f = font(BANGERS, size // 12)
    txt = "QR HERE"
    bbox = pd.textbbox((0, 0), txt, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pd.text(((size - tw) / 2, (size - th) / 2 - bbox[1]),
            txt, font=f, fill=BROWN)
    return ph


def build(qr_path=None):
    random.seed(7)
    print(f"Building {W}x{H} tip poster ({W/DPI}x{H/DPI} inches)…")

    bg = make_gradient(W, H).convert("RGBA")
    bg = add_halftone(bg, color=(0, 0, 0), opacity=22, spacing=24, radius=4)
    bg = add_speed_lines(bg, color=CREAM, opacity=22, count=140)
    img = bg

    # === Edge bursts (money/tip themed) ===
    edge_bursts = [
        # x_frac, y_frac, text, bg, fg, size, shape, rotate
        (0.10, 0.06, "TIPS!", GOLD, BROWN, "md", "star", -18),
        (0.90, 0.06, "$$$!", TEAL, CREAM, "md", "pow", 15),
        (0.07, 0.34, "WOW!", PINK, CREAM, "sm", "zap", -10),
        (0.93, 0.32, "ROCK!", RED, CREAM, "sm", "bang", 25),
        (0.94, 0.55, "BOOM!", ORANGE, CREAM, "md", "star", -22),
    ]
    for fx, fy, t, bgc, fgc, sz, sh, rot in edge_bursts:
        img = draw_comic_burst(img, int(fx * W), int(fy * H), t,
                               (*bgc, 255), fg=fgc, size=sz, shape=sh, rotate=rot)

    # === Three main bursts row ===
    main_y = int(0.10 * H)
    img = draw_comic_burst(img, int(0.28 * W), main_y, "BUY US!",
                           (*ORANGE, 255), fg=CREAM, size="lg", shape="star", rotate=-12)
    img = draw_comic_burst(img, int(0.50 * W), main_y - 30, "A!",
                           (*GOLD, 255), fg=BROWN, size="lg", shape="pow", rotate=8)
    img = draw_comic_burst(img, int(0.72 * W), main_y, "BEER!",
                           (*PLUM, 255), fg=CREAM, size="lg", shape="jagged", rotate=-5)

    # === Title (growing letters, climbing uphill left-to-right) ===
    img = draw_title(img, "TIP THE BAND!", W // 2, int(0.22 * H),
                     base_size=170, grow_per_letter=12,
                     rotate=0, uphill_per_letter=18)

    # === Tagline ===
    d = ImageDraw.Draw(img)
    tag = "Loved the show? Show us the love."
    f_tag = font(BANGERS, 90)
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    tag_y = int(0.27 * H)
    d.text(((W - tw) / 2 + 6, tag_y + 6), tag, font=f_tag, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, tag_y), tag, font=f_tag, fill=CREAM,
           stroke_width=3, stroke_fill=BROWN)

    # === Three characters (same as squad poster) ===
    char_y = int(0.44 * H)
    char_h = 950
    place_character(img, os.path.join(PUBLIC, "p.png"),
                    int(0.20 * W), char_y, char_h, rotate=-2)
    place_character(img, os.path.join(PUBLIC, "dano.png"),
                    int(0.50 * W), char_y - 30, char_h + 60, rotate=0)
    place_character(img, os.path.join(PUBLIC, "darby.png"),
                    int(0.80 * W), char_y, char_h, rotate=2)

    # === Bottom panel (Venmo QR) ===
    section_y = int(0.62 * H)
    panel_h = int(0.36 * H)
    panel = Image.new("RGBA", (int(W * 0.84), panel_h), (*CREAM, 240))
    pd = ImageDraw.Draw(panel)
    pd.rectangle((0, 0, panel.size[0] - 1, panel.size[1] - 1),
                 outline=BROWN, width=14)
    sh = Image.new("RGBA", (panel.size[0] + 24, panel.size[1] + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rectangle((24, 24, panel.size[0] + 24, panel.size[1] + 24),
                 fill=(0, 0, 0, 140))
    px = int(W * 0.08)
    img.alpha_composite(sh, (px, section_y - 24))
    img.alpha_composite(panel, (px, section_y))

    # === Venmo header ===
    f_venmo = font(BANGERS, 200)
    venmo_text = "VENMO"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), venmo_text, font=f_venmo)
    tw = bbox[2] - bbox[0]
    venmo_y = section_y + 50
    d.text(((W - tw) / 2 + 6, venmo_y + 6), venmo_text, font=f_venmo, fill=(0, 0, 0, 120))
    d.text(((W - tw) / 2, venmo_y), venmo_text, font=f_venmo, fill=VENMO_BLUE,
           stroke_width=5, stroke_fill=BROWN)

    # Subtitle
    f_sub = font(RIGHTEOUS, 60)
    sub = "Tap, pay, rock on."
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, venmo_y + 220), sub, font=f_sub, fill=BROWN)

    # === QR ===
    qr_size = 640
    qr = load_qr_placeholder(qr_path, qr_size)
    qr_frame = Image.new("RGBA", (qr_size + 60, qr_size + 60), (*CREAM, 255))
    qfd = ImageDraw.Draw(qr_frame)
    qfd.rectangle((0, 0, qr_frame.size[0] - 1, qr_frame.size[1] - 1),
                  outline=BROWN, width=10)
    qr_x = (W - qr_size - 60) // 2
    qr_y = section_y + 380
    img.alpha_composite(qr_frame, (qr_x, qr_y))
    img.alpha_composite(qr, (qr_x + 30, qr_y + 30))

    # SCAN/THANKS bursts beside QR
    img = draw_comic_burst(img, qr_x + qr_size + 220, qr_y + 100, "SCAN!",
                           (*YELLOW, 255), fg=BROWN, size="md", shape="bang", rotate=15)
    img = draw_comic_burst(img, qr_x - 180, qr_y + qr_size - 120, "THANKS!",
                           (*RED, 255), fg=CREAM, size="md", shape="star", rotate=-18)

    # Footer line
    f_foot = font(BANGERS, 80)
    foot = "Every dollar = one extra riff"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), foot, font=f_foot)
    tw = bbox[2] - bbox[0]
    foot_y = qr_y + qr_size + 90
    d.text(((W - tw) / 2 + 4, foot_y + 4), foot, font=f_foot, fill=(0, 0, 0, 140))
    d.text(((W - tw) / 2, foot_y), foot, font=f_foot, fill=CREAM,
           stroke_width=3, stroke_fill=BROWN)

    img = draw_border(img.convert("RGBA"), inset=40, thickness=20)

    out_path = os.path.join(PUBLIC, "tog-tip-poster.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"Saved -> {out_path} ({os.path.getsize(out_path) // 1024} KB)")


if __name__ == "__main__":
    qr_path = None
    if "--qr" in sys.argv:
        qr_path = sys.argv[sys.argv.index("--qr") + 1]
    elif os.environ.get("VENMO_QR_PATH"):
        qr_path = os.environ["VENMO_QR_PATH"]
    build(qr_path)
