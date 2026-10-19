"""Draw a place's staged spots on its picture, to check staging by eye.

Usage:
  python3 scripts/art-asset-factory/staging-overlay.py <place> <out.jpg> [staging.json] [variant] [pictures-dir]

Each spot is drawn at its foot point with a bar as tall as a 1.7 m adult there
(1.7 x metersPercent x (y - horizonY) percent of the picture, or the spot's
floor scale), a seat line at seatY, a clip line at clipBelowY, and a label with
its index, pose and facing. The horizon is a dashed line. An optional staging
file lets a draft be checked before it is merged into art/backdrops/staging.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def main(place: str, out: str, staging_path: str | None = None, variant: str = "midday", pictures: str | None = None) -> None:
    staging = json.loads(Path(staging_path or ROOT / "art/backdrops/staging.json").read_text())
    stage = staging.get("places", staging)[place]
    im = Image.open(Path(pictures or ROOT / "art/backdrops") / f"{place}__{variant}.jpg").convert("RGB")
    w, h = im.size
    d = ImageDraw.Draw(im)
    hy = stage["horizonY"] / 100 * h
    for x in range(0, w, 24):
        d.line([(x, hy), (x + 12, hy)], fill=(255, 0, 255), width=2)
    for i, spot in enumerate(stage["spots"]):
        x, y = spot["x"] / 100 * w, spot["y"] / 100 * h
        scale = stage.get("floors", {}).get(spot.get("floor"), stage["metersPercent"])
        tall = 1.7 * scale * (spot["y"] - stage["horizonY"]) / 100 * h
        if spot.get("pose") == "sit":
            tall *= 0.72
        color = (255, 40, 40) if spot.get("hero") else (40, 200, 255)
        d.rectangle([x - 6, y - tall, x + 6, y], outline=color, width=3)
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=color)
        if "seatY" in spot:
            sy = spot["seatY"] / 100 * h
            d.line([(x - 30, sy), (x + 30, sy)], fill=(255, 220, 0), width=3)
        if "clipBelowY" in spot:
            cy = spot["clipBelowY"] / 100 * h
            d.line([(x - 40, cy), (x + 40, cy)], fill=(0, 255, 0), width=2)
        label = f"{i} {spot.get('pose', 'stand')[:3]} {spot.get('facing', 'viewer')[:4]}"
        d.rectangle([x + 8, y - 18, x + 8 + 7 * len(label), y - 2], fill=(0, 0, 0))
        d.text((x + 10, y - 17), label, fill=(255, 255, 255))
    im.save(out, quality=85)


if __name__ == "__main__":
    main(*sys.argv[1:])
