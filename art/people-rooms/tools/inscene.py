"""Assemble people in poses painted in place: a mannequin plate marks where a person stands and what
hides them, a "person" edit turns the mannequin into a bald person in a gray suit, a "marker" edit
paints that person's clothes flat red/yellow/blue/green. This cuts the person (only where the person
edit differs from the empty painting, inside the widened mannequin outline, so furniture in front
stays painting), labels the clothes, finds the head, and assembles any number of people from it:
garment colors, skin tone, and a hair piece fitted to the head.
usage: python3 inscene.py EMPTY PLATE PERSON MARKER OUT_PREFIX PEOPLE.json [VIEW]
PEOPLE.json: [{"colors": {"jacket": rgb, ...}, "skin": rgb, "hair": {"n": 2, "rgb": rgb}}, ...]
VIEW: front | threeq | threeqr | back (which hair pieces fit this head)."""
import sys, json, os, numpy as np
from PIL import Image
from scipy import ndimage
from hairfit import head as fig_head
from recolor_demo import recolor
SHEET = {'front': '37', 'threeq': '01', 'threeqr': '70', 'back': '06', 'prof': 'prof', 'tqb': 'tqb'}   # prof faces left, tqb turns away to the right; add '-m' for the mirror image
MANNEQUIN = None
KEYS = {'jacket': (255, 0, 0), 'shirt': (255, 255, 0), 'pants': (0, 0, 255), 'shoes': (0, 255, 0)}

def load(p, size): return np.asarray(Image.open(p).convert('RGB').resize(size, Image.LANCZOS)).astype(float)

def tint(layer, rgb):                      # recolor a gray piece by luminance (as in compose_scene.py)
    A = np.asarray(layer).astype(float); lum = A[..., :3] @ [0.299, 0.587, 0.114]; m = A[..., 3] > 128
    ref = np.median(lum[m]) if m.any() else 128
    A[..., :3] = np.clip(np.array(rgb, float) * (lum / ref)[..., None], 0, 255); return Image.fromarray(A.astype(np.uint8))

def skin(fig, gm_p, rgb):                  # recolor warm, non-clothing pixels by luminance (as in compose_scene.py)
    F = np.asarray(fig).astype(float); G = np.asarray(Image.open(gm_p).convert('RGB'))
    mx = F[..., :3].max(2); mn = F[..., :3].min(2); sat = (mx - mn) / (mx + 1); lum = F[..., :3] @ [0.299, 0.587, 0.114]
    m = (F[..., 3] > 40) & (sat > 0.18) & (F[..., 0] >= F[..., 1]) & (F[..., 1] >= F[..., 2]) & (lum > 60) & (G.sum(2) == 0)
    ref = np.median(lum[m]) if m.any() else 150
    F[m, :3] = np.clip(np.array(rgb, float) * (lum[m] / ref)[:, None], 0, 255); return Image.fromarray(F.astype(np.uint8))

def cut(E, P, A, M):
    green = (P[..., 1] > 170) & (P[..., 0] < 140) & (P[..., 2] < 140)
    lab, n = ndimage.label(green)
    sizes = ndimage.sum(green, lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s > 400]
    zone = ndimage.binary_dilation(np.isin(lab, keep), iterations=10)
    diff = ndimage.gaussian_filter(np.abs(A - E).max(2), 1.5)              # blurred, so texture noise does not flicker at the edge
    person = zone & (diff > 24)
    person = ndimage.binary_opening(person, iterations=1)
    # the mannequin's inner core is always body: a gray suit against a gray building differs too little to cut by color
    person |= ndimage.binary_erosion(np.isin(lab, keep), iterations=4)
    person = ndimage.binary_fill_holes(person)
    lab2, n2 = ndimage.label(person)                       # keep the big pieces (the person), drop specks
    if n2:
        s2 = ndimage.sum(person, lab2, range(1, n2 + 1)); person = np.isin(lab2, [i + 1 for i, s in enumerate(s2) if s > 0.05 * s2.max()])
    # clothing labels from the marker edit: pixels that turned a strong marker color
    G = np.zeros(A.shape, np.uint8)
    for k, key in KEYS.items():
        d = np.abs(M - np.array(key, float)).sum(2)
        G[(d < 170) & person] = key
    # a faint light line the person edit left where the mannequin's outline was: near-white edge pixels that are not clothing
    edge = person & ~ndimage.binary_erosion(person, iterations=4)
    ghost = edge & (A.min(2) > 205) & (G.sum(2) == 0)
    person &= ~ghost
    # gray cloth the marker edit missed (seams, folds) takes the nearest labelled piece, as in sheetart.py
    marked = G.sum(2) > 0
    if marked.any():
        mx, mn = A.max(2), A.min(2); sat = (mx - mn) / (mx + 1)
        miss = person & ~marked & (sat < 0.16) & (mx > 40)
        dist, (iy, ix) = ndimage.distance_transform_edt(~marked, return_indices=True)
        fill = miss & (dist <= 14); G[fill] = G[iy[fill], ix[fill]]
    global MANNEQUIN
    MANNEQUIN = ndimage.binary_dilation(np.isin(lab, keep), iterations=2)
    return person, G

def head_of(person):
    ys, xs = np.where(person); top = ys.min(); widths = []
    for y in range(top, top + int((ys.max() - top) * 0.6)):
        r = np.where(person[y])[0]; widths.append((r.max() - r.min() + 1, (r.max() + r.min()) / 2) if len(r) else (0, 0))
    w = np.array([a for a, _ in widths], float); base = np.median(w[3:max(6, len(w) // 8)]) if len(w) > 6 else w.max()
    end = next((i for i in range(len(w)) if i > 5 and w[i] > 1.55 * base), len(w))   # the shoulders start here
    hw = int(w[:end].max()); cx = widths[int(np.argmax(w[:end]))][1]
    return top, cx, hw

def build(A, person, G, p, view):              # one assembled person as an RGBA layer the size of the painting
    fig = np.zeros(A.shape[:2] + (4,), np.uint8); fig[..., :3] = A.astype(np.uint8); fig[..., 3] = person * 255
    fp, gp = '/tmp/_in_fig.png', '/tmp/_in_gm.png'
    Image.fromarray(fig).save(fp); Image.fromarray(np.where(person[..., None], G, 0).astype(np.uint8)).save(gp)
    F = recolor(fp, gp, p['colors']); F = skin(F, gp, p['skin'])
    if p.get('hair'):
        mq = MANNEQUIN & ndimage.binary_dilation(person, iterations=6)          # this body's own mannequin: its head is the spot's head
        use_mq = os.environ.get('HEADSRC', 'person') == 'mannequin' and mq.sum() > 0.3 * person.sum()   # bowed heads fit better on the person
        top, cx, hw = head_of(mq if use_mq else person)
        mirror = view.endswith('-m'); v = view[:-2] if mirror else view
        src = f"v2-{SHEET[v]}-{p.get('sex', 'm')}-{p.get('build', 'medium')}"
        piece = f"art/build/hair/{v}/{p['hair']['n']:02d}/{src}-hair.png"
        if os.path.exists(piece):
            sf = Image.open(f'figs/{src}.png').convert('RGBA'); pc = Image.open(piece).convert('RGBA')
            if mirror: sf, pc = sf.transpose(Image.FLIP_LEFT_RIGHT), pc.transpose(Image.FLIP_LEFT_RIGHT)
            st, sx, sw = fig_head(sf); s = hw / sw
            pc = pc.resize((max(1, int(pc.width * s)), max(1, int(pc.height * s))), Image.LANCZOS)
            layer = Image.new('RGBA', F.size, (0, 0, 0, 0)); layer.paste(pc, (int(round(cx - sx * s)), int(round(top - st * s))), pc)
            F = Image.alpha_composite(F, tint(layer, p['hair']['rgb']))
    return F

def bodies(person):                              # each separate person, left to right
    lab, n = ndimage.label(person)
    if not n: return []
    sizes = ndimage.sum(person, lab, range(1, n + 1)); big = [i + 1 for i, s in enumerate(sizes) if s > 0.2 * sizes.max()]
    comps = [lab == i for i in big]; return sorted(comps, key=lambda m: np.where(m)[1].mean())

def assemble(E, A, person, G, people, v, view, out):   # variant v: body i is assembled as people[(v + i) % len]
    room = Image.fromarray(E.astype(np.uint8)).convert('RGBA')
    views = view.split(',')
    for i, b in enumerate(bodies(person)): room = Image.alpha_composite(room, build(A, b, G, people[(v + i) % len(people)], views[min(i, len(views) - 1)]))
    room.convert('RGB').save(out, quality=90)

if __name__ == '__main__':
    e, pl, pa, mk, out, ppl = sys.argv[1:7]; view = sys.argv[7] if len(sys.argv) > 7 else 'front'
    size = Image.open(pa).size
    E, P, A, M = load(e, size), load(pl, size), load(pa, size), load(mk, size)
    person, G = cut(E, P, A, M)
    cov = (G.sum(2) > 0).sum() / max(1, person.sum()); B = bodies(person)
    print('person px', int(person.sum()), 'clothes labelled', round(float(cov), 2), 'bodies', len(B), 'heads', [head_of(b) for b in B])
    people = json.load(open(ppl))
    for v in range(len(people)): assemble(E, A, person, G, people, v, view, f'{out}-{v + 1}.jpg')
