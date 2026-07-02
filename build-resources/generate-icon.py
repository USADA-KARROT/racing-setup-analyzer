#!/usr/bin/env python3
"""Racing Setup Analyzer — temporary brand icon (Style A: abstract geometric monogram).

Original, programmatically-drawn design (no third-party assets):
  - abstract capital R built from bold geometric strokes (silver-white)
  - the R's lower-right diagonal leg doubles as the Japanese katakana レ stroke
  - the enclosed counter (negative-space window) inside the R bowl hints at the
    boxed 口-frame of 賽 without rendering any actual glyph
  - deep graphite background (full-bleed; macOS applies its own squircle mask)
  - one vermilion apex dot at the leg's knee — the racing-line apex
  - a subtle 3x2 checkered-flag block, top-right
  - no text; bold shapes stay legible at 16 px

Output: 1024x1024 master PNG (full-bleed background, ~12% safe margin for the mark).
"""
from PIL import Image, ImageDraw
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "icon-master-1024.png"
S = 1024

GRAPHITE_TOP = (26, 29, 33, 255)      # #1a1d21
GRAPHITE_BOT = (16, 18, 21, 255)      # #101215
SILVER = (222, 226, 231, 255)         # #dee2e7
SILVER_DIM = (196, 201, 208, 255)     # #c4c9d0
VERMILION = (223, 41, 53, 255)        # #df2935
CHECKER_LIGHT = (222, 226, 231, 210)
CHECKER_DARK = (16, 18, 21, 0)        # transparent -> shows background

img = Image.new("RGBA", (S, S))
d = ImageDraw.Draw(img)

# ---- background: vertical graphite gradient, full bleed ----
for y in range(S):
    t = y / (S - 1)
    r = int(GRAPHITE_TOP[0] + (GRAPHITE_BOT[0] - GRAPHITE_TOP[0]) * t)
    g = int(GRAPHITE_TOP[1] + (GRAPHITE_BOT[1] - GRAPHITE_TOP[1]) * t)
    b = int(GRAPHITE_TOP[2] + (GRAPHITE_BOT[2] - GRAPHITE_TOP[2]) * t)
    d.line([(0, y), (S, y)], fill=(r, g, b, 255))

# ---- geometry (safe margin ~128 px on each side) ----
# Stroke width for the monogram
W = 118
# R stem (vertical bar), left side
stem_x0, stem_x1 = 268, 268 + W
top_y, bot_y = 232, 806
# Bowl: top bar + right bar + middle bar enclose a negative-space window (the 賽-hint frame)
bowl_right_x1 = 662
bowl_right_x0 = bowl_right_x1 - W
mid_y0 = 448
mid_y1 = mid_y0 + W

# stem
d.rectangle([stem_x0, top_y, stem_x1, bot_y], fill=SILVER)
# top bar of the bowl
d.rectangle([stem_x0, top_y, bowl_right_x1 - 42, top_y + W], fill=SILVER)
# top-right corner bevel (45°) — softens the block, reads as speed
d.polygon([(bowl_right_x1 - 42, top_y), (bowl_right_x1, top_y + 42), (bowl_right_x1, top_y + W), (bowl_right_x1 - 42, top_y + W)], fill=SILVER)
# right bar of the bowl
d.rectangle([bowl_right_x0, top_y + 42, bowl_right_x1, mid_y1], fill=SILVER)
# middle bar (closes the bowl; the window above it is the negative space)
d.rectangle([stem_x0, mid_y0, bowl_right_x1, mid_y1], fill=SILVER)

# ---- the レ leg: one bold diagonal growing straight out of the bowl's ----
# ---- lower-right corner, finishing with レ's short upward hook        ----
# Same SILVER as the body so the R reads as ONE mark.
leg_top_left = (bowl_right_x0 - 24, mid_y1)
leg_top_right = (bowl_right_x1, mid_y1)
knee_outer = (802, 812)      # outer knee at the baseline
knee_inner = (802 - (bowl_right_x1 - bowl_right_x0) - 24, 812)
d.polygon([leg_top_left, leg_top_right, knee_outer, knee_inner], fill=SILVER)
# レ hook: from the knee, a short bold stroke rising to the upper-right
d.polygon([(knee_inner[0], 812), (knee_outer[0], 812), (884, 694), (884, 622), (812, 700), (knee_inner[0], 758)], fill=SILVER)

# ---- vermilion apex dot nestled in the hook's crook (racing-line apex) ----
apex_r = 44
apex_cx, apex_cy = 872, 776
d.ellipse([apex_cx - apex_r, apex_cy - apex_r, apex_cx + apex_r, apex_cy + apex_r], fill=VERMILION)

# ---- compact checkered-flag block, top-right (3 cols x 2 rows, full board) ----
cell = 46
cx0, cy0 = 748, 236
CHECKER_DIM = (64, 69, 76, 255)
for row in range(2):
    for col in range(3):
        x0 = cx0 + col * cell
        y0 = cy0 + row * cell
        color = CHECKER_LIGHT if (row + col) % 2 == 0 else CHECKER_DIM
        d.rectangle([x0, y0, x0 + cell - 2, y0 + cell - 2], fill=color)

img.save(OUT, "PNG")
print(f"wrote {OUT}")

# ---- self-checks: contrast + legibility probes ----
im = Image.open(OUT).convert("RGBA")
# 1. mark/background contrast at known points
probe_mark = im.getpixel((stem_x0 + W // 2, (top_y + bot_y) // 2))     # stem center
probe_bg = im.getpixel((80, 80))
lum = lambda p: 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
contrast = (max(lum(probe_mark), lum(probe_bg)) + 5) / (min(lum(probe_mark), lum(probe_bg)) + 5)
print(f"mark/bg contrast ratio ~{contrast:.1f}:1 (want >6)")
# 2. apex dot present
probe_apex = im.getpixel((apex_cx, apex_cy))
print(f"apex px {probe_apex} (want vermilion)")
# 3. 16px downscale still has both silver + dark pixels (legibility proxy)
tiny = im.resize((16, 16), Image.LANCZOS)
px = list(tiny.convert("L").getdata())
print(f"16px luminance spread: min={min(px)} max={max(px)} (want max-min > 100)")
# 4. negative-space window is background-dark (the 賽-hint frame reads)
win = im.getpixel(((stem_x1 + bowl_right_x0) // 2, (top_y + W + mid_y0) // 2))
print(f"negative-space window px {win} (want dark graphite)")
assert contrast > 6 and (max(px) - min(px)) > 100 and probe_apex[0] > 180 and win[0] < 60, "SELF-CHECK FAILED"
print("ICON SELF-CHECKS PASS")
