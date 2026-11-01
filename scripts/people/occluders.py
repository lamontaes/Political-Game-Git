"""What stands in front of a person at each spot of a place picture.

Offline, once per painting: a depth map of the room painting (Depth Anything
V2 Small, run on CPU, about 8 seconds a painting), then for each staging spot
an occluder mask: the painting's pixels that are nearer than a person at that
spot (a desk, a chair back, a counter, a sofa arm). The bench draws the
painting's own pixels back over a person through that mask, so furniture
covers the body along its real edge instead of one straight crop line.

Derived art: each mask names its parent painting by file and sha256 in
art/backdrops/occluders/index.json. All light and weather versions of a place
share the midday picture's camera (art/backdrops/staging.json, note), so one
depth map serves them all; the bench lays the current version's pixels through
the mask. Nothing is enlarged: masks are cut from the full-size picture.

Setup (once, outside the repository):
  python3 -m venv <dir> && <dir>/bin/pip install torch --index-url \
    https://download.pytorch.org/whl/cpu && <dir>/bin/pip install transformers pillow numpy
Run:
  <dir>/bin/python -I scripts/people/occluders.py [--cache <dir>] [place ...]
Depth maps are cached as .npy under --cache (default .source-cache/depth,
ignored by git); a cached map is reused. With no places, every staged place.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
BACKDROPS = ROOT / "art" / "backdrops"
OUT = BACKDROPS / "occluders"
MODEL = "depth-anything/Depth-Anything-V2-Small-hf"

# Presentation choices, TUNABLE by eye (people research, Oct 27: margin 0.05
# was cleanest on the Senate floor and the council chamber; 0.00 lets chair
# backs show through, 0.02 is close). Depth is the model's nearness scaled to
# 0..1 per painting.
MARGIN = 0.05  # how much nearer than the person a pixel must be to cover them
SOFT = 0.012  # the width of the soft edge, in the same units
WINDOW = 12  # half the window the spot's own depth is the median of, in pixels
TALLEST = 1.95  # meters: the region a person may fill (above every height band)
WIDE = 0.7  # a figure's width as a share of its height, with room to spare
SEATED_TOP = 0.8  # a seated figure's top, as a share of the standing height above the cushion
SEATED_BELOW = 0.6  # how far below its line a seated figure's feet may reach, the same way
SEATED_WIDE = 1.0  # a seated figure's width as a share of its standing height
ADULT = 1.72  # meters, an adult's height (a presentation estimate for the occluder bake)
SHOULDERS = 0.8  # a standing person's shoulder line, as a share of their height
SEATED_SHOULDERS = 0.3  # a seated person's, as a share of the standing height above the cushion
MIN_PIXELS = 40  # fewer covered pixels than this is noise, and no mask is kept


def painting(place: str) -> Path | None:
    midday = BACKDROPS / f"{place}__midday.jpg"
    if midday.exists():
        return midday
    found = sorted(BACKDROPS.glob(f"{place}__*.jpg"))
    return found[0] if found else None


def depth_of(file: Path, cache: Path, pipe_holder: list) -> np.ndarray:
    cached = cache / f"{file.stem}.npy"
    if cached.exists():
        return np.load(cached).astype(np.float32)
    if not pipe_holder:
        from transformers import pipeline

        pipe_holder.append(pipeline("depth-estimation", model=MODEL, device=-1))
    image = Image.open(file).convert("RGB")
    raw = pipe_holder[0](image)["predicted_depth"].squeeze().numpy()
    near = np.array(
        Image.fromarray(raw.astype(np.float32)).resize(image.size, Image.BILINEAR)
    )
    near = (near - near.min()) / (near.max() - near.min() + 1e-9)
    cache.mkdir(parents=True, exist_ok=True)
    np.save(cached, near.astype(np.float16))
    return near.astype(np.float32)


def region(stage: dict, spot: dict) -> tuple[float, float, float, float]:
    """The box a person on this spot can fill, in percent of the picture."""
    meters = (
        spot.get("floorMetersPercent")
        or stage.get("floors", {}).get(spot.get("floor"), None)
        or stage["metersPercent"]
    )
    horizon = spot.get("floorHorizonY", stage["horizonY"])
    tall = max(min(TALLEST * meters * (spot["y"] - horizon), spot["y"]), 4.0)
    aspect = 1672 / 941
    bottom = spot["y"] + 0.3
    if spot.get("pose") == "sit":
        # A seated figure is wider (knees forward) and its legs and feet can
        # reach below the spot's own line.
        seat = spot.get("seatY", spot["y"])
        top = seat - SEATED_TOP * tall
        bottom = max(spot["y"], seat) + SEATED_BELOW * tall
        width = tall * SEATED_WIDE / aspect
    else:
        top = spot["y"] - tall
        width = tall * WIDE / aspect
    left = max(0.0, spot["x"] - width / 2)
    right = min(100.0, spot["x"] + width / 2)
    # A figure near a side is moved in to fit the picture, so the box is too.
    if left == 0.0:
        right = min(100.0, max(right, width))
    if right == 100.0:
        left = max(0.0, min(left, 100.0 - width))
    return left, max(0.0, top), right, min(100.0, bottom)


def shown_above(stage: dict, spot: dict) -> float:
    """The line above which a person here is never covered: their head and
    shoulders. A spot placed inside furniture (staging off by a row) still
    shows who is there instead of hiding them whole."""
    meters = (
        spot.get("floorMetersPercent")
        or stage.get("floors", {}).get(spot.get("floor"), None)
        or stage["metersPercent"]
    )
    horizon = spot.get("floorHorizonY", stage["horizonY"])
    tall = min(ADULT * meters * (spot["y"] - horizon), spot["y"] - 2)
    if spot.get("pose") == "sit":
        return spot.get("seatY", spot["y"]) - SEATED_SHOULDERS * tall
    return spot["y"] - SHOULDERS * tall


def anchor(spot: dict) -> tuple[float, float]:
    """Where in the empty painting the person's own depth is read."""
    if "behindY" in spot:
        # Behind a desk or counter: just below its top edge, its front face;
        # the person is farther than that by the margin.
        return spot["x"], spot["behindY"] + 1.5
    if spot.get("pose") == "sit":
        return spot["x"], spot.get("seatY", spot["y"])
    return spot["x"], spot["y"]


def bake(
    place: str, stage: dict, near: np.ndarray, file: Path, numbering: list | None = None
) -> dict:
    """Masks for the stage's spots, each named by its number in `numbering` (the whole place's spots)."""
    height, width = near.shape
    out = OUT / place
    spots = {}
    for index, spot in enumerate(stage["spots"]):
        ax, ay = anchor(spot)
        cx = int(round(ax / 100 * (width - 1)))
        cy = int(round(min(ay, 100) / 100 * (height - 1)))
        window = near[
            max(cy - WINDOW, 0) : cy + WINDOW, max(cx - WINDOW, 0) : cx + WINDOW
        ]
        # A pixel covers the person where it is nearer than them by the
        # margin; behind a desk the anchor is the desk's front, which must
        # cover them, so the line sits the margin behind the anchor.
        # Seated facing away, the anchor is their own chair back, which
        # covers them the same way (people research, Oct 27).
        behind = "behindY" in spot or (
            spot.get("pose") == "sit" and spot.get("facing") == "away"
        )
        own = float(np.median(window)) + (-MARGIN if behind else MARGIN)
        left, top, right, bottom = region(stage, spot)
        x0, x1 = int(left / 100 * width), int(np.ceil(right / 100 * width))
        y0, y1 = int(top / 100 * height), int(np.ceil(bottom / 100 * height))
        part = near[y0:y1, x0:x1]
        line = np.full((y1 - y0, 1), own, dtype=np.float32)
        if spot.get("pose") == "sit" and spot.get("facing") != "away" and "behindY" not in spot:
            # Facing the room, a seated person's legs come forward from the
            # cushion to the feet on the floor: their depth runs from the
            # seat's to the floor's at the foot point, so their own chair or
            # sofa front never covers them.
            fx, fy = int(round(spot["x"] / 100 * (width - 1))), int(round(min(spot["y"], 99.9) / 100 * (height - 1)))
            feet = float(np.median(near[max(fy - WINDOW, 0) : fy + 1, max(fx - WINDOW, 0) : fx + WINDOW])) + MARGIN
            rows = np.arange(y0, y1)
            t = np.clip((rows - cy) / max(fy - cy, 1), 0, 1)
            line = (own + (feet - own) * t).astype(np.float32)[:, None]
        cover = np.clip((part - line) / SOFT + 0.5, 0, 1)
        shown = int(np.ceil(shown_above(stage, spot) / 100 * height)) - y0
        cover[: max(shown, 0)] = 0
        if spot.get("pose") == "podium" and "behindY" in spot:
            # At a lectern only the lectern is in front: nothing above its top.
            edge = int(spot["behindY"] / 100 * height) - y0
            cover[: max(edge, 0)] = 0
        alpha = Image.fromarray((cover * 255).astype(np.uint8)).filter(
            ImageFilter.MedianFilter(3)
        )
        a = np.array(alpha)
        if int((a > 127).sum()) < MIN_PIXELS:
            continue
        ys, xs = np.nonzero(a > 8)
        bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        a = a[by0:by1, bx0:bx1]
        rgba = np.zeros((*a.shape, 2), dtype=np.uint8)
        rgba[..., 1] = a
        out.mkdir(parents=True, exist_ok=True)
        name = f"{(numbering or stage['spots']).index(spot)}.png"
        Image.fromarray(rgba, "LA").save(out / name, optimize=True)
        spot_id = spot.get("id", f"{place}:spot:{(numbering or stage['spots']).index(spot)}")
        spots[spot_id] = {
            "file": f"{place}/{name}",
            "leftPercent": round((x0 + bx0) / width * 100, 3),
            "topPercent": round((y0 + by0) / height * 100, 3),
            "widthPercent": round((bx1 - bx0) / width * 100, 3),
            "heightPercent": round((by1 - by0) / height * 100, 3),
        }
    return {
        "parent": file.name,
        "parentSha256": hashlib.sha256(file.read_bytes()).hexdigest(),
        "spots": spots,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=str(ROOT / ".source-cache" / "depth"))
    parser.add_argument("places", nargs="*")
    args = parser.parse_args()
    staging = json.loads((BACKDROPS / "staging.json").read_text())["places"]
    index_file = OUT / "index.json"
    index = (
        json.loads(index_file.read_text())
        if index_file.exists()
        else {"places": {}}
    )
    index["about"] = (
        "What stands in front of a person at each staging spot: a mask of the "
        "painting's pixels nearer than the person, cut from a depth map of the "
        f"parent painting ({MODEL}, margin {MARGIN}). Made by "
        "scripts/people/occluders.py; the bench lays the current picture's "
        "pixels through the mask over the person on that spot."
    )
    holder: list = []
    for place in args.places or sorted(staging):
        file = painting(place)
        if not file:
            print(f"{place}: no painting", file=sys.stderr)
            continue
        near = depth_of(file, Path(args.cache), holder)
        stage = staging[place]
        if "spotsFrom" in stage:
            # Spots from a mannequin plate carry their own front line
            # (scripts/people/room-spots.ts), and their masks are kept; only
            # spots the plate has none for (a kept podium) are baked here.
            kept = index["places"][place]
            spots = [s for s in stage["spots"] if "head" not in s]
            baked = bake(place, {**stage, "spots": spots}, near, file, stage["spots"])
            kept["spots"].update(baked["spots"])
            print(f"{place}: plate masks kept, {len(baked['spots'])} of {len(spots)} other spots covered")
            continue
        for old in (OUT / place).glob("*.png") if (OUT / place).exists() else []:
            old.unlink()
        entry = bake(place, stage, near, file)
        index["places"][place] = entry
        print(f"{place}: {len(entry['spots'])} of {len(staging[place]['spots'])} spots covered")
    index["places"] = dict(sorted(index["places"].items()))
    ordered = {"about": index["about"], "places": index["places"]}
    index_file.write_text(json.dumps(ordered, indent=2) + "\n")


if __name__ == "__main__":
    main()
