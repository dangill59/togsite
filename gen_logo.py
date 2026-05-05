"""
TOG branded logo banner — uses the home-page hero style with swappable
color palettes and backgrounds.

Default: 1200 x 320 px transparent PNG with the 'comic' palette.

Usage:
  python gen_logo.py                     # default: comic palette, transparent bg
  python gen_logo.py --palette neon      # neon, fire, comic, tog, mono, rainbow
  python gen_logo.py --bg gradient       # bg: none, gradient, dark, cream
  python gen_logo.py --print             # 3600x960 at 300 DPI
  python gen_logo.py --all               # generate the whole palette/bg matrix
"""
import os
import sys
import random
from PIL import Image, ImageDraw

from gen_poster import (
    PUBLIC, BANGERS,
    ORANGE, GOLD, BROWN, DARK_BROWN, CREAM, TEAL, PLUM, RED, YELLOW, PINK, BLUE,
    font, make_gradient, add_halftone, add_speed_lines,
    draw_title,
)

# === Palettes (cycled letter-by-letter) ===
PALETTES = {
    "comic":   [ORANGE, TEAL, PLUM, RED, GOLD],
    "tog":     [ORANGE, GOLD, TEAL],
    "fire":    [(232, 37, 27), (232, 100, 27), (245, 166, 35), (255, 225, 53)],
    "neon":    [(30, 144, 255), (255, 105, 180), (50, 220, 90), (255, 225, 53), (232, 100, 27)],
    "mono":    [CREAM],
    "rainbow": [(232, 37, 27), (232, 100, 27), (245, 166, 35),
                (50, 200, 90), (30, 144, 255), (107, 45, 91), (255, 105, 180)],
}

BACKGROUNDS = ("none", "gradient", "dark", "cream")


def make_bg(W: int, H: int, mode: str, s: float):
    if mode == "none":
        return Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if mode == "dark":
        img = Image.new("RGBA", (W, H), (*DARK_BROWN, 255))
        return add_halftone(img, color=CREAM, opacity=10,
                            spacing=int(20 * s), radius=int(2 * s))
    if mode == "cream":
        img = Image.new("RGBA", (W, H), (*CREAM, 255))
        return add_halftone(img, color=BROWN, opacity=18,
                            spacing=int(20 * s), radius=int(2 * s))
    # gradient (default-style backdrop)
    img = make_gradient(W, H).convert("RGBA")
    img = add_halftone(img, color=(0, 0, 0), opacity=24,
                       spacing=int(20 * s), radius=int(3 * s))
    img = add_speed_lines(img, color=CREAM, opacity=22, count=int(80 * s))
    return img


def build(palette: str = "comic", bg: str = "none",
          print_ready: bool = False, suffix_override: str = None):
    random.seed(11)

    if print_ready:
        W, H = 3600, 960
        s = 3.0
    else:
        W, H = 1200, 320
        s = 1.0

    if palette not in PALETTES:
        raise ValueError(f"Unknown palette: {palette}. Options: {', '.join(PALETTES)}")
    if bg not in BACKGROUNDS:
        raise ValueError(f"Unknown bg: {bg}. Options: {', '.join(BACKGROUNDS)}")

    img = make_bg(W, H, bg, s)

    # Pick shadow + highlight colors based on background brightness
    if bg == "cream":
        shadow_color = BROWN
        highlight_color = ORANGE
        tagline_color = BROWN
        tagline_stroke = (0, 0, 0)  # subtle stroke
    elif bg == "none":
        shadow_color = BROWN
        highlight_color = ORANGE
        tagline_color = BROWN
        tagline_stroke = CREAM
    else:
        shadow_color = DARK_BROWN
        highlight_color = ORANGE
        tagline_color = CREAM
        tagline_stroke = BROWN

    # === Title (growing uphill, 3D extruded, multi-color letters) ===
    img = draw_title(
        img, "THOSE ONE GUYS!",
        cx=W // 2,
        cy=int(H * 0.48),
        base_size=int(54 * s),
        grow_per_letter=int(5 * s),
        rotate=0,
        uphill_per_letter=int(7 * s),
        letter_colors=PALETTES[palette],
        shadow_color=shadow_color,
        highlight_color=highlight_color,
    )

    # === Tagline ===
    d = ImageDraw.Draw(img)
    tag = "LOUD GUITARS. BIG GROOVES. ZERO CHILL."
    f_tag = font(BANGERS, int(36 * s))
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    tag_y = int(H * 0.83)
    d.text(((W - tw) / 2 + int(2 * s), tag_y + int(2 * s)), tag,
           font=f_tag, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, tag_y), tag, font=f_tag, fill=tagline_color,
           stroke_width=max(1, int(1.5 * s)), stroke_fill=tagline_stroke)

    # Filename: tog-logo-<palette>[-<bg>][-print].png
    parts = ["tog-logo", palette]
    if bg != "none":
        parts.append(bg)
    if print_ready:
        parts.append("print")
    out_path = os.path.join(PUBLIC, "-".join(parts) + ".png")
    if suffix_override:
        out_path = os.path.join(PUBLIC, suffix_override)

    if bg == "none":
        img.save(out_path, "PNG", optimize=True)
    else:
        img.convert("RGB").save(out_path, "PNG", optimize=True)
    kb = os.path.getsize(out_path) // 1024
    print(f"  -> {os.path.basename(out_path)} ({kb} KB)")


def build_all():
    """Generate the full palette x background matrix at web res."""
    print("Generating logo matrix...")
    for palette in PALETTES:
        for bg in BACKGROUNDS:
            build(palette=palette, bg=bg, print_ready=False)


if __name__ == "__main__":
    args = sys.argv[1:]
    palette = "comic"
    bg = "none"
    print_ready = "--print" in args
    do_all = "--all" in args

    if "--palette" in args:
        palette = args[args.index("--palette") + 1]
    if "--bg" in args:
        bg = args[args.index("--bg") + 1]

    if do_all:
        build_all()
    else:
        build(palette=palette, bg=bg, print_ready=print_ready)
