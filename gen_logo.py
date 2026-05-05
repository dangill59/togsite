"""
TOG branded logo banner — uses the home-page hero style.

Default: 1200 x 320 px (good for email headers, web, social).
--print: 3600 x 960 px at 300 DPI (good for merch printing).

Usage:
  python gen_logo.py                # web banner
  python gen_logo.py --print        # high-res print version
  python gen_logo.py --transparent  # text-only on transparent bg
"""
import os
import sys
import random
from PIL import Image, ImageDraw

from gen_poster import (
    PUBLIC, BANGERS,
    ORANGE, GOLD, BROWN, DARK_BROWN, CREAM, PLUM,
    font, make_gradient, add_halftone, add_speed_lines,
    draw_title,
)


def build(print_ready: bool = False, transparent: bool = False) -> None:
    random.seed(11)

    if print_ready:
        W, H = 3600, 960
        s = 3.0  # scale factor relative to the 150-DPI baseline
    else:
        W, H = 1200, 320
        s = 1.0

    label = "PRINT 300 DPI" if print_ready else "WEB 96 DPI"
    if transparent:
        label += " transparent"
    print(f"Building {W}x{H} TOG logo ({label})...")

    if transparent:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    else:
        img = make_gradient(W, H).convert("RGBA")
        img = add_halftone(img, color=(0, 0, 0), opacity=24,
                           spacing=int(20 * s), radius=int(3 * s))
        img = add_speed_lines(img, color=CREAM, opacity=22, count=int(80 * s))

    # === Title (growing uphill, 3D extruded) ===
    img = draw_title(
        img, "THOSE ONE GUYS!",
        cx=W // 2,
        cy=int(H * 0.48),
        base_size=int(54 * s),
        grow_per_letter=int(5 * s),
        rotate=0,
        uphill_per_letter=int(7 * s),
    )

    # === Tagline ===
    d = ImageDraw.Draw(img)
    tag = "LOUD GUITARS. BIG GROOVES. ZERO CHILL."
    f_tag = font(BANGERS, int(36 * s))
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    tag_y = int(H * 0.83)
    # subtle shadow
    d.text(((W - tw) / 2 + int(2 * s), tag_y + int(2 * s)), tag,
           font=f_tag, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, tag_y), tag, font=f_tag, fill=CREAM,
           stroke_width=max(1, int(1.5 * s)), stroke_fill=BROWN)

    suffix = ("-print" if print_ready else "") + ("-transparent" if transparent else "")
    out_path = os.path.join(PUBLIC, f"tog-logo{suffix}.png")
    if transparent:
        img.save(out_path, "PNG", optimize=True)
    else:
        img.convert("RGB").save(out_path, "PNG", optimize=True)
    kb = os.path.getsize(out_path) // 1024
    print(f"Saved -> {out_path} ({kb} KB)")


if __name__ == "__main__":
    print_ready = "--print" in sys.argv
    transparent = "--transparent" in sys.argv
    build(print_ready=print_ready, transparent=transparent)
