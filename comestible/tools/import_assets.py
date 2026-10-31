#!/usr/bin/env python3
"""Import PNGs produced by the Codex image launcher into public/assets as WebP.

Specimens, objects and icons are generated on a white background: the background
connected to the image border is removed (flood fill) so pale mushrooms keep their
whites, and the edge is feathered. Everything else is converted as-is.

Usage: python3 tools/import_assets.py <dir-with-pngs> [...]
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "img"
CUTOUT_PREFIXES = ("sp_", "an_", "obj_", "chr_", "ct_", "ui_")
# Objects have no white parts of their own: white areas enclosed by them (the gap under a
# basket handle) are background too. Mushrooms keep enclosed whites.
ENCLOSED_WHITE_PREFIXES = ("obj_",)
WHITE_THRESHOLD = 236


def cutout(img: Image.Image, enclosed: bool = False) -> Image.Image:
    rgb = img.convert("RGB")
    # Pixels close to white in every channel are background candidates.
    lightest = rgb.convert("L").point(lambda v: 255 if v >= WHITE_THRESHOLD else 0)
    channel_min = ImageChops.darker(ImageChops.darker(*rgb.split()[:2]), rgb.split()[2])
    candidates = ImageChops.multiply(lightest, channel_min.point(lambda v: 255 if v >= WHITE_THRESHOLD - 6 else 0))
    # Flood fill from the border marks only the background connected to it.
    mask = candidates.copy()
    w, h = mask.size
    seeds = [(x, y) for x in range(0, w, 8) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 8) for x in (0, w - 1)]
    for seed in seeds:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128)
    background = mask.point(lambda v: 255 if v in (128, 255) else 0) if enclosed else mask.point(lambda v: 255 if v == 128 else 0)
    # Grow the cut by one pixel to drop the white halo, then feather.
    background = background.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    alpha = ImageChops.invert(background)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def main(dirs: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for d in dirs:
        for png in sorted(Path(d).rglob("*.png")):
            img = Image.open(png)
            name = png.stem
            if name.startswith(CUTOUT_PREFIXES):
                img = cutout(img, enclosed=name.startswith(ENCLOSED_WHITE_PREFIXES))
                img.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
            else:
                img.convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=84, method=6)
            count += 1
            print(f"{name}.webp", img.size)
    print(f"{count} assets imported into {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
