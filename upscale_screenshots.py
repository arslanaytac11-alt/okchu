"""Upscale App Store screenshots from 430x932 to 1290x2796 via PIL LANCZOS."""
import os
from PIL import Image

SRC_DIR = os.path.join(os.path.dirname(__file__), "appstore-screenshots")
OUT_DIR = os.path.join(os.path.dirname(__file__), "appstore-screenshots-1290x2796")
TARGET = (1290, 2796)

os.makedirs(OUT_DIR, exist_ok=True)

files = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith(".png"))
for fname in files:
    src = os.path.join(SRC_DIR, fname)
    dst = os.path.join(OUT_DIR, fname)
    im = Image.open(src)
    print(f"{fname}: {im.size} -> {TARGET}")
    up = im.resize(TARGET, Image.LANCZOS)
    up.save(dst, "PNG", optimize=True)
print("Done. Output:", OUT_DIR)
