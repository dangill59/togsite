"""
TOG Venmo tip poster — same style + size as the squad poster.

Default: 18 x 24 inches at 150 DPI = 2700 x 3600 (portrait, web/preview).
--print: 18 x 24 inches at 300 DPI with 0.125" bleed = 5476 x 7276
         (commercial print: trim line is 38px in from each edge).

QR: pass --qr <path> to drop in the real one, or set VENMO_QR_PATH env var.
"""
import os
import sys
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Reuse helpers from the squad poster generator
from gen_poster import (
    PUBLIC, BANGERS, RIGHTEOUS,
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


def build(qr_path=None, print_ready=False):
    random.seed(7)

    DPI = 300 if print_ready else 150
    BLEED = int(0.125 * DPI) if print_ready else 0  # 0.125" bleed each side
    s = DPI / 150  # scale factor for sizes/fonts hardcoded at 150 DPI
    TRIM_W, TRIM_H = 18 * DPI, 24 * DPI
    W, H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

    mode = "PRINT (300 DPI + 0.125\" bleed)" if print_ready else "WEB (150 DPI)"
    print(f"Building {W}x{H} tip poster — {mode}")

    bg = make_gradient(W, H).convert("RGBA")
    bg = add_halftone(bg, color=(0, 0, 0), opacity=22, spacing=int(24*s), radius=int(4*s))
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
    img = draw_comic_burst(img, int(0.50 * W), main_y - int(30*s), "A!",
                           (*GOLD, 255), fg=BROWN, size="lg", shape="pow", rotate=8)
    img = draw_comic_burst(img, int(0.72 * W), main_y, "BEER!",
                           (*PLUM, 255), fg=CREAM, size="lg", shape="jagged", rotate=-5)

    # === Title (growing letters, climbing uphill left-to-right) ===
    img = draw_title(img, "TIP THE BAND!", W // 2, int(0.22 * H),
                     base_size=int(170*s), grow_per_letter=int(12*s),
                     rotate=0, uphill_per_letter=int(18*s))

    # === Tagline ===
    d = ImageDraw.Draw(img)
    tag = "Loved the show? Show us the love."
    f_tag = font(BANGERS, int(90*s))
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    tag_y = int(0.27 * H)
    d.text(((W - tw) / 2 + int(6*s), tag_y + int(6*s)), tag, font=f_tag, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, tag_y), tag, font=f_tag, fill=CREAM,
           stroke_width=int(3*s), stroke_fill=BROWN)

    # === Three characters (same as squad poster) ===
    char_y = int(0.44 * H)
    char_h = int(950*s)
    place_character(img, os.path.join(PUBLIC, "p.png"),
                    int(0.20 * W), char_y, char_h, rotate=-2)
    place_character(img, os.path.join(PUBLIC, "dano.png"),
                    int(0.50 * W), char_y - int(30*s), char_h + int(60*s), rotate=0)
    place_character(img, os.path.join(PUBLIC, "darby.png"),
                    int(0.80 * W), char_y, char_h, rotate=2)

    # === Bottom panel (Venmo QR) ===
    section_y = int(0.62 * H)
    panel_h = int(0.36 * H)
    panel = Image.new("RGBA", (int(W * 0.84), panel_h), (*CREAM, 240))
    pd = ImageDraw.Draw(panel)
    pd.rectangle((0, 0, panel.size[0] - 1, panel.size[1] - 1),
                 outline=BROWN, width=int(14*s))
    sh = Image.new("RGBA", (panel.size[0] + int(24*s), panel.size[1] + int(24*s)), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rectangle((int(24*s), int(24*s), panel.size[0] + int(24*s), panel.size[1] + int(24*s)),
                 fill=(0, 0, 0, 140))
    px = int(W * 0.08)
    img.alpha_composite(sh, (px, section_y - int(24*s)))
    img.alpha_composite(panel, (px, section_y))

    # === Venmo header ===
    f_venmo = font(BANGERS, int(200*s))
    venmo_text = "VENMO"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), venmo_text, font=f_venmo)
    tw = bbox[2] - bbox[0]
    venmo_y = section_y + int(50*s)
    d.text(((W - tw) / 2 + int(6*s), venmo_y + int(6*s)), venmo_text, font=f_venmo, fill=(0, 0, 0, 120))
    d.text(((W - tw) / 2, venmo_y), venmo_text, font=f_venmo, fill=VENMO_BLUE,
           stroke_width=int(5*s), stroke_fill=BROWN)

    # Subtitle
    f_sub = font(RIGHTEOUS, int(60*s))
    sub = "Tap, pay, rock on."
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, venmo_y + int(220*s)), sub, font=f_sub, fill=BROWN)

    # === QR ===
    qr_size = int(640*s)
    qr = load_qr_placeholder(qr_path, qr_size)
    qr_frame = Image.new("RGBA", (qr_size + int(60*s), qr_size + int(60*s)), (*CREAM, 255))
    qfd = ImageDraw.Draw(qr_frame)
    qfd.rectangle((0, 0, qr_frame.size[0] - 1, qr_frame.size[1] - 1),
                  outline=BROWN, width=int(10*s))
    qr_x = (W - qr_size - int(60*s)) // 2
    qr_y = section_y + int(380*s)
    img.alpha_composite(qr_frame, (qr_x, qr_y))
    img.alpha_composite(qr, (qr_x + int(30*s), qr_y + int(30*s)))

    # SCAN/THANKS bursts beside QR
    img = draw_comic_burst(img, qr_x + qr_size + int(220*s), qr_y + int(100*s), "SCAN!",
                           (*YELLOW, 255), fg=BROWN, size="md", shape="bang", rotate=15)
    img = draw_comic_burst(img, qr_x - int(180*s), qr_y + qr_size - int(120*s), "THANKS!",
                           (*RED, 255), fg=CREAM, size="md", shape="star", rotate=-18)

    # Footer line
    f_foot = font(BANGERS, int(80*s))
    foot = "Every dollar = one extra riff"
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), foot, font=f_foot)
    tw = bbox[2] - bbox[0]
    foot_y = qr_y + qr_size + int(90*s)
    d.text(((W - tw) / 2 + int(4*s), foot_y + int(4*s)), foot, font=f_foot, fill=(0, 0, 0, 140))
    d.text(((W - tw) / 2, foot_y), foot, font=f_foot, fill=CREAM,
           stroke_width=int(3*s), stroke_fill=BROWN)

    img = draw_border(img.convert("RGBA"), inset=int(40*s) + BLEED, thickness=int(20*s))

    suffix = "-print" if print_ready else ""
    out_path = os.path.join(PUBLIC, f"tog-tip-poster{suffix}.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    kb = os.path.getsize(out_path) // 1024
    inches = f"{TRIM_W/DPI:.0f}x{TRIM_H/DPI:.0f}\""
    bleed_note = f" (+0.125\" bleed)" if print_ready else ""
    print(f"Saved -> {out_path} ({kb} KB) [{inches} trim @ {DPI} DPI{bleed_note}]")


if __name__ == "__main__":
    qr_path = None
    if "--qr" in sys.argv:
        qr_path = sys.argv[sys.argv.index("--qr") + 1]
    elif os.environ.get("VENMO_QR_PATH"):
        qr_path = os.environ["VENMO_QR_PATH"]
    print_ready = "--print" in sys.argv
    build(qr_path, print_ready=print_ready)
