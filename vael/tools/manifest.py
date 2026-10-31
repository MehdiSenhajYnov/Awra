#!/usr/bin/env python3
"""List the images and sprite atlases present in public/, so the game only requests files that exist."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "public"
img = sorted(p.stem for p in (root / "img").glob("*.webp"))
sprites = sorted(p.stem for p in (root / "sprites").glob("*.json"))
json.dump({"img": img, "sprites": sprites}, open(root / "manifest.json", "w"))
print(len(img), "images,", len(sprites), "atlases")
