#!/usr/bin/env python3
"""Check front bust layers against the Round 4 registration and counterpart layers.

Requires Pillow, NumPy and SciPy. Run from any directory. The JSON report records
each nonzero result and the number of pairings per check.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art/busts/round4"
NEW = ROOT / "art/busts/codex-nov26"
SIZE = (1254, 1254)
HEADS = {
    f"head-{name}.png" for name in (
        "fair-adult light-older olive-adult medium-older brown-adult dark-older "
        "heart-fair-adult round-brown-adult long-dark-older oval-light-adult "
        "diamond-medium-older pear-olive-adult"
    ).split()
}
STYLES = {
    "women": ("butterfly-layers", "headband-blowout", "bantu-knots"),
    "men": ("classic-mullet", "pompadour", "faux-hawk"),
}
COLORS = ("black", "darkbrown", "blond", "gray")
CHECKS = (
    "missing", "canvas", "offset", "collar_holes", "collar_skin_leak",
    "chin_overlap", "red_tee", "hair_gap", "hair_see_through",
    "hair_poke_out", "hair_over_face", "stray_pixels",
)


def load(path):
    with Image.open(path) as im:
        return np.asarray(im.convert("RGBA"))


def solid(pixels):
    return pixels[..., 3] >= 128


def holes(mask):
    return ndi.binary_fill_holes(mask) & ~mask


def red_tee(pixels):
    collar = pixels[715:865]
    r, g, b, a = np.moveaxis(collar.astype(np.int16), -1, 0)
    edge = ndi.distance_transform_edt(a > 0)
    return (edge <= 16) & (a > 0) & (r >= 55) & (r - g >= 35) & (
        r > 1.63 * g
    ) & (g - b < 22)


def stray(mask):
    labels, n = ndi.label(mask, structure=np.ones((3, 3), dtype=int))
    if not n:
        return 0
    sizes = np.bincount(labels.ravel())[1:]
    return sizes.sum() - sizes.max()


def audit():
    totals = Counter(dict.fromkeys(CHECKS, 0))
    samples = Counter(dict.fromkeys(CHECKS, 0))
    findings = []

    def record(check, amount, piece, other=None):
        amount = int(amount)
        totals[check] += amount
        samples[check] += 1
        if amount:
            finding = dict(check=check, pixels=amount, piece=piece)
            if other is not None:
                finding["against"] = other
            findings.append(finding)

    for sex, styles in STYLES.items():
        base = SOURCE / sex / "front"
        out = NEW / sex / "front"
        expected = {f"hair-{style}-{color}.png" for style in styles for color in COLORS}
        if sex == "women":
            expected |= HEADS
        for name in sorted(expected):
            record("missing", not (out / name).is_file(), f"{sex}/{name}")
        heads = {p.name: solid(load(p))[:900, 260:990] for p in base.glob("head-*.png")}
        tops = {p.name: solid(load(p))[695:875, 420:840] for p in base.glob("top-*.png")}
        originals = {
            p.name: solid(load(p))[:900, 260:990] for p in base.glob("hair-*.png")
        }
        edited = {}
        new_hair = {}
        for path in sorted(out.glob("*.png")):
            name = f"{sex}/{path.name}"
            with Image.open(path) as im:
                valid = im.size == SIZE and im.mode == "RGBA"
                record("canvas", not valid, name)
                record("offset", int(im.info.get("offset", (0, 0)) != (0, 0)), name)
            if not valid:
                continue
            px = load(path)
            alpha = px[..., 3]
            if not np.any(alpha):
                record("offset", 1, name)
                continue
            record("stray_pixels", stray(alpha > 0), name)
            mask = solid(px)
            if path.name in HEADS and sex == "women":
                old = load(base / path.name)[..., 3]
                record("offset", np.count_nonzero(alpha[:533] != old[:533]), name)
                record("offset", np.count_nonzero(alpha[712:] != old[712:]), name)
                record("red_tee", red_tee(px).sum(), name)
                record("chin_overlap", np.count_nonzero(mask[533:712] & (old[533:712] < 128)), name)
                neck = mask[695:875, 420:840]
                for top_name, top in tops.items():
                    record("collar_holes", holes(neck | top).sum(), name, top_name)
                    # Skin silhouette may not enter transparent/antialiased
                    # garment pixels beyond the original neckline.
                    leak = (alpha[695:875, 420:840] > old[695:875, 420:840]) & ~top
                    record("collar_skin_leak", leak.sum(), name, top_name)
                edited[path.name] = mask[:900, 260:990]
            elif path.name.startswith("hair-"):
                new_hair[path.name] = alpha[:900, 260:990]
                y, x = np.where(mask)
                record("offset", int(not (15 < y.min() < (127 if sex == "women" else 108)
                                          and x.min() < 625 < x.max())), name)

        # Use the original hair masks to identify the common crown footprint,
        # independent of color and not redefined by the candidate hairstyles.
        crown_y = 240 if sex == "women" else 215
        crown = np.logical_and.reduce(list(originals.values()))
        crown = ndi.binary_erosion(crown, iterations=2)
        crown[crown_y:] = False
        for hair_name, a in new_hair.items():
            name = f"{sex}/{hair_name}"
            hair = a >= 128
            inside = ndi.binary_erosion(hair, iterations=2)
            record("hair_see_through", np.count_nonzero(inside & (a < 250)), name)
            record("hair_gap", holes(hair).sum(), name)
            for head_name, head in (heads | edited).items():
                required = head & crown
                record("hair_poke_out", (required & ~hair).sum(), name, head_name)
                # Central eye and face window must remain clear.
                record("hair_over_face", (hair & head)[350:680, 220:510].sum(), name, head_name)
                # Holes inside the combined hair/scalp silhouette are background leaks.
                record("hair_gap", holes(hair | head).sum(), name, head_name)
        for head_name, head in edited.items():
            for hair_name, hair in originals.items():
                record("hair_gap", holes(hair | head).sum(), f"{sex}/{head_name}", hair_name)
                record("hair_poke_out", (head & crown & ~hair).sum(), f"{sex}/{head_name}", hair_name)

    return dict(totals=dict(totals), tests=dict(samples), findings=findings)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, help="write detailed JSON results")
    args = parser.parse_args()
    report = audit()
    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + "\n")
    for check, count in report["totals"].items():
        print(f"{check:18} {count:8}  ({report['tests'][check]} checks)")
    return int(any(report["totals"].values()))


if __name__ == "__main__":
    raise SystemExit(main())
