"""Import Firefly place paintings into art/backdrops (or a campus's variants into art/campuses).

Usage:
  python3 scripts/art-asset-factory/import-firefly-places.py <plan.json> <source-dir>

The plan is a list of rows:
  {"source": "<file in source-dir>", "place": "county-sheriff-front-desk", "variant": "midday",
   "tags": ["public-safety"], "fireflyAssetId": "urn:aaid:...", "fireflyName": "[C13-...] ..."}
A row with "campus": "<campus id>" instead of "place" adds that campus's variant to
art/campuses/manifest.json, copying the campus's own facts from its midday row.

Each picture is resized to the backdrops' 1672 x 941 (Lanczos) and saved as JPEG
quality 88 named <place>__<variant>.jpg. A row replaces an earlier row for the same
place and variant; every other row is kept. Tags are kind:<place>, uses:shared-location
and the plan's domain tags. Approval is owner-placeholder-2026-10-13 (the owner
reviews in play).
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

WIDTH, HEIGHT, QUALITY = 1672, 941, 88
APPROVAL = "owner-placeholder-2026-10-13"
ROOT = Path(__file__).resolve().parents[2]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_jpeg(source: Path, out: Path) -> None:
    with Image.open(source) as im:
        im = im.convert("RGB")
        # A square generation is cut to the backdrops' shape around its middle,
        # never stretched.
        if abs(im.width / im.height - WIDTH / HEIGHT) > 0.03:
            tall = round(im.width * HEIGHT / WIDTH)
            top = (im.height - tall) // 2
            im = im.crop((0, top, im.width, top + tall))
        im.resize((WIDTH, HEIGHT), Image.LANCZOS).save(
            out, "JPEG", quality=QUALITY, optimize=True
        )


ORDER = ["midday", "morning", "night", "rain", "winter"]


def merged(existing: list, rows: dict, key: str) -> list:
    """Existing rows keep their order (replaced in place); each new row goes in
    after the last row that sorts before it, so separate imports touch separate
    lines of the file."""
    sort_key = lambda r: (r[key], ORDER.index(r["variant"]))
    out = [rows[(r[key], r["variant"])] for r in existing]
    known = {(r[key], r["variant"]) for r in existing}
    for row in sorted((r for k, r in rows.items() if k not in known), key=sort_key):
        at = 0
        for i, r in enumerate(out):
            if sort_key(r) < sort_key(row):
                at = i + 1
        out.insert(at, row)
    return out


def main(plan_path: str, source_dir: str) -> None:
    plan = json.loads(Path(plan_path).read_text())
    src = Path(source_dir)
    backdrops = ROOT / "art/backdrops"
    campuses = ROOT / "art/campuses"
    manifest_path = backdrops / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    campus_path = campuses / "manifest.json"
    campus_manifest = json.loads(campus_path.read_text())
    rows = {(r["place"], r["variant"]): r for r in manifest["backdrops"]}
    campus_rows = {(r["campus"], r["variant"]): r for r in campus_manifest["campuses"]}
    for item in plan:
        source = src / item["source"]
        variant = item["variant"]
        if "campus" in item:
            campus = item["campus"]
            base = campus_rows[(campus, "midday")]
            name = f"{campus}__{variant}.jpg"
            out = campuses / name
            write_jpeg(source, out)
            campus_rows[(campus, variant)] = {
                **{k: v for k, v in base.items() if k not in ("sha256", "sourceFile", "sourceSha256", "fireflyAssetId", "approval")},
                "variant": variant,
                "file": name,
                "width": WIDTH,
                "height": HEIGHT,
                "sha256": sha256(out),
                "sourceFile": item["source"],
                "sourceSha256": sha256(source),
                "fireflyAssetId": item.get("fireflyAssetId"),
                "approval": APPROVAL,
            }
            continue
        place = item["place"]
        name = f"{place}__{variant}.jpg"
        out = backdrops / name
        write_jpeg(source, out)
        tags = [f"kind:{place}", "uses:shared-location", *item.get("tags", [])]
        rows[(place, variant)] = {
            "place": place,
            "variant": variant,
            "file": name,
            "width": WIDTH,
            "height": HEIGHT,
            "sha256": sha256(out),
            "sourceFile": item["source"],
            "sourceSha256": sha256(source),
            "fireflyAssetId": item.get("fireflyAssetId"),
            "approval": APPROVAL,
            "tags": tags,
        }
    manifest["backdrops"] = merged(manifest["backdrops"], rows, "place")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    campus_manifest["campuses"] = merged(campus_manifest["campuses"], campus_rows, "campus")
    campus_path.write_text(json.dumps(campus_manifest, indent=2, ensure_ascii=False) + "\n")
    print("run prettier --write on both manifests")
    print(f"{len(plan)} pictures imported")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
