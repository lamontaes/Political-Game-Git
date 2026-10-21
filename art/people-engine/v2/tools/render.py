"""Room tests for the v2 figures: a Python port of the game's placement (src/bench/whole-figures.ts
figureOn/placeSeated, src/bench/scene.ts turnOf) on the real staging spots.

Scale: the game sizes a figure so its standing look's feet-to-head equals the person's height
(1.72 m adult x metersPercent x (y - horizonY)). The Codex sheets were painted separately, so a
seated figure's pixel scale is not its standing sheet's. Each figure's standing height in pixels
is therefore estimated from its own head width (bald heads, every view), using the median
height/head-width ratio of the standing figures of the same sex and build.
"""
import json, os, sys, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOMS = os.path.join(HERE, "rooms")
REND = os.path.join(HERE, "renders")
ASPECT = 1672 / 941
HEIGHT_M = {"adult": 1.72}
SHADOW_FLATNESS, SEATED_SHADOW, SHADOW_SPREAD = 0.22, 0.9, 1.3
ON_THE_LINE = 3

stg = json.load(open(os.path.join(HERE, "staging.json")))["places"]
rules = json.load(open(os.path.join(HERE, "wfrules.json")))
FRONTS = rules["roomFronts"]
idx = json.load(open(os.path.join(OUT, "index.json")))
FIG = [f for f in idx["figures"] if f["prop"] == "none" and not f.get("flag") and f["outfit"] not in ("base", "longsleeve")]


def h(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


_img = {}


def img(f):
    if f["file"] not in _img:
        _img[f["file"]] = Image.open(os.path.join(OUT, f["file"])).convert("RGBA")
    return _img[f["file"]]


def head_width(f):
    a = np.asarray(img(f))[:, :, 3] > 60
    rows = np.where(a.any(1))[0]
    top = rows.min()
    hh = max(4, int((rows.max() - top) * 0.05))
    xs = np.where(a[top + hh // 2: top + hh * 2].any(0))[0]
    return xs.max() - xs.min()


for f in FIG:
    f["headW"] = head_width(f)
ratio = {}
for sex in ("female", "male"):
    for b in ("slim", "medium", "heavy"):
        st = [f for f in FIG if f["pose"] == "stand" and f["sex"] == sex and f["build"] == b]
        rs = [(f["footY"] - (np.where((np.asarray(img(f))[:, :, 3] > 60).any(1))[0].min())) / f["headW"] for f in st]
        ratio[(sex, b)] = float(np.median(rs))


def standing_px(f):
    return f["headW"] * ratio[(f["sex"], f["build"])]


def person_percent(stage, spot):
    meters = spot.get("floorMetersPercent") or (stage.get("floors", {}).get(spot["floor"]) if spot.get("floor") else None) or stage["metersPercent"]
    horizon = spot.get("floorHorizonY", stage["horizonY"])
    return HEIGHT_M["adult"] * meters * (spot["y"] - horizon)


def toward_of(spot, turn):
    if turn.get("toward"):
        return turn["toward"]
    if spot.get("facing") in ("left", "right"):
        return spot["facing"]
    return "right" if spot["x"] < 50 else "left"


def turn_of(spot, front):
    view = "back" if spot.get("facing") == "away" else None
    if abs(front - spot["x"]) < ON_THE_LINE:
        return {"view": view} if view else {}
    t = {"toward": "right" if front > spot["x"] else "left"}
    if view:
        t["view"] = view
    return t


OFFICIAL = ("blazer", "vest", "shirt")
PUBLIC = ("shirt", "polo", "vest", "blazer")


def pick(spot, turn, place, i):
    pose = "lectern" if spot["pose"] == "podium" else ("sit" if spot["pose"] == "sit" else "stand")
    role = spot.get("role", "")
    outfits = OFFICIAL if role in ("member-at-dais", "presiding", "speaker") else PUBLIC
    angle = "back" if turn.get("view") == "back" else ("front" if pose == "lectern" else "three-quarter")
    key = f"{place}:{spot.get('id', i)}"
    sex = ("female", "male")[h(key + "s") % 2]
    build = ("slim", "medium", "medium", "heavy")[h(key + "b") % 4]
    outfit = outfits[h(key + "o") % len(outfits)]
    def cands(o, a):
        return [f for f in FIG if f["pose"] == pose and f["angle"] == a and f["outfit"] == o and f["sex"] == sex and f["build"] == build]
    c = cands(outfit, angle) or next((cands(o, angle) for o in outfits if cands(o, angle)), []) or cands(outfit, "front")
    if not c:
        c = [f for f in FIG if f["pose"] == pose and f["angle"] == angle and f["sex"] == sex] or [f for f in FIG if f["pose"] == pose]
    return c[h(key + "v") % len(c)]


def place_rect(f, stage, spot, turn, W, H):
    scale = person_percent(stage, spot) / standing_px(f)  # percent of picture height per pixel
    hp = f["height"] * scale
    wp = hp * (f["width"] / f["height"]) / ASPECT
    left = spot["x"] - wp / 2
    if f["pose"] == "sit":
        hip = f.get("seatY", f["height"] * 0.6)
        top = spot.get("seatY", spot["y"]) - hip * scale
    else:
        top = spot["y"] - hp * (f["footY"] / f["height"])
    mirrored = f["facing"] in ("left", "right") and f["facing"] != toward_of(spot, turn)
    return left, top, wp, hp, mirrored


def render(place, light, share, label):
    stage = stg[place]
    bg = Image.open(os.path.join(ROOMS, f"{place}__{light}.jpg")).convert("RGBA")
    W, H = bg.size
    front = FRONTS.get(place)
    spots = [s for s in stage["spots"] if s["pose"] in ("sit", "podium")]
    if share < 1:
        spots = [s for s in spots if s["pose"] == "podium" or h(f"{place}:{s.get('id')}:occ") % 100 < share * 100]
    spots.sort(key=lambda s: s.get("depth", s["y"]))
    canvas = bg.copy()
    shadow = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    layers = []
    for i, spot in enumerate(spots):
        turn = turn_of(spot, front) if front is not None else {}
        f = pick(spot, turn, place, i)
        left, top, wp, hp, mir = place_rect(f, stage, spot, turn, W, H)
        px, py, pw, ph = left / 100 * W, top / 100 * H, wp / 100 * W, hp / 100 * H
        hidden = spot.get("clipBelowY") is not None
        if not hidden:
            swp = (wp * (SEATED_SHADOW if f["pose"] == "sit" else 0.5)) / 100 * W
            shp = swp * SHADOW_FLATNESS
            cx, cy = spot["x"] / 100 * W, spot["y"] / 100 * H
            sd.ellipse((cx - swp / 2, cy - shp / 2, cx + swp / 2, cy + shp / 2), fill=(0, 0, 0, 70))
        layers.append((f, px, py, pw, ph, mir, spot))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(3)))
    for f, px, py, pw, ph, mir, spot in layers:
        im = img(f)
        if mir:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        im = im.resize((max(1, round(pw)), max(1, round(ph))), Image.LANCZOS)
        if light == "night":
            r, g, b, a = im.split()
            im = Image.merge("RGBA", [c.point(lambda v: int(v * 0.78)) for c in (r, g, b)] + [a])
        if spot.get("clipBelowY") is not None:
            cut = spot["clipBelowY"] / 100 * H - py
            arr = np.asarray(im).copy()
            if cut < arr.shape[0]:
                arr[max(0, int(round(cut))):, :, 3] = 0
            im = Image.fromarray(arr)
        canvas.alpha_composite(im, (int(round(px)), int(round(py))))
    os.makedirs(REND, exist_ok=True)
    name = f"{place}__{light}__{label}.jpg"
    canvas.convert("RGB").save(os.path.join(REND, name), quality=88)
    return name, len(layers)


if __name__ == "__main__":
    out = []
    for place in ("council-chamber", "state-house-chamber", "us-senate-floor"):
        for light in ("midday", "night"):
            for share, label in ((0.5, "half"), (1.0, "full")):
                out.append(render(place, light, share, label))
    for n, c in out:
        print(n, c)
