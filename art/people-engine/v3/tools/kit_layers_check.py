"""Layer checks for kit (recolorable) figures: the defects the owner saw as "sleeves bleeding into hands".

A kit figure is stacked body, shoes, trousers, top, hair; the game recolors trousers and top. Anything of the
person that sits in a clothes layer takes the clothes' color. Checks:
  hand-in-clothes   one solid piece of skin in the trousers or top layer (a hand resting on the lap)
                    (khaki trousers match skin too, but only as scattered shading, so a single big piece is the test)
  top-holds-legs    the top layer also covers most of the solid trousers (a broken split: the whole outfit in top)
  top-holds-shoes   the top layer covers the shoes
  waist-gap         bare body showing between the top's hem and the trousers' soft top edge
python3 kit_layers_check.py <pack dir> [--sheet out.jpg]   (exit 1 when anything is flagged)
The --sheet renders every flagged figure with loud test colors (green trousers, magenta top) for an eye check."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colors import to_lab


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'))


def check(pack, fig):
    P = fig['parts']
    L = {pn: rgba(os.path.join(pack, P[pn]['file'])) for pn in ('body', 'shoes', 'trousers', 'top') if pn in P}
    flags = []
    body = L['body']; bl = to_lab(body[..., :3])
    skin_b = (body[..., 3] > 200) & (bl[..., 1] > 8) & (bl[..., 2] > 10) & (bl[..., 0] > 40) & (bl[..., 0] < 85)
    if skin_b.sum() >= 50:
        ref = np.median(bl[skin_b], 0)
        for pn in ('trousers', 'top'):
            if pn not in L: continue
            p = L[pn]; pl = to_lab(p[..., :3])
            hit = (p[..., 3] > 200) & (np.sqrt(((pl - ref) ** 2).sum(-1)) < 12)
            lab, n = ndi.label(hit)
            if n:
                sizes = ndi.sum(hit, lab, range(1, n + 1))
                if sizes.max() > 600 and sizes.max() > 0.6 * hit.sum():
                    flags.append(f'hand-in-clothes:{pn}:{int(sizes.max())}')
    if 'top' in L and 'trousers' in L:
        ta = L['top'][..., 3] > 0; solid = L['trousers'][..., 3] >= 200
        if solid.sum() and (ta & solid).sum() > 0.5 * solid.sum():
            flags.append('top-holds-legs')
        tr_any = L['trousers'][..., 3] > 0
        gap = (body[..., 3] > 0) & ~ta & ((L['trousers'][..., 3] < 200)) & ndi.binary_dilation(ta, iterations=3) & ndi.binary_dilation(tr_any, iterations=3)
        # a waist gap runs across the body; a hand's edge or a hand on a hip is a short run
        width = int(ta.any(0).sum())
        longest = 0
        for y in np.nonzero(gap.any(1))[0]:
            row = gap[y]; runs = np.diff(np.concatenate([[0], row.astype(int), [0]]))
            starts, ends = np.nonzero(runs == 1)[0], np.nonzero(runs == -1)[0]
            if len(starts):
                longest = max(longest, int((ends - starts).max()))
        if width and longest > 0.3 * width:
            flags.append(f'waist-gap:{longest}px')
    if 'hair' in P:
        hl_img = rgba(os.path.join(pack, P['hair']['file'])); ha = hl_img[..., 3] > 200
        if ha.sum() > 300:
            hlab = to_lab(hl_img[..., :3]); href = np.median(hlab[ha], 0)
            near = ndi.binary_dilation(ha, iterations=6)
            for pn, tag in (('top', 'hair-in-top'), ('body', 'hair-in-body')):
                if pn not in L: continue
                p = L[pn]; pl = to_lab(p[..., :3])
                hit = (p[..., 3] > 200) & near & ~ha & (np.sqrt(((pl - href) ** 2).sum(-1)) < 12)
                # the drawn outline is dark like dark hair: only count pieces thicker than a line
                hit = ndi.binary_opening(hit, iterations=1)
                if pn == 'body':
                    hit &= ~skin_b
                if hit.sum() > 150:
                    flags.append(f'{tag}:{int(hit.sum())}')
            if 'top' in L:
                ta_ = L['top'][..., 3] > 200
                if ta_.sum() > 300:
                    tref = np.median(to_lab(L['top'][..., :3])[ta_], 0)
                    hit = ha & (np.sqrt(((hlab - tref) ** 2).sum(-1)) < 12) & (np.sqrt(((hlab - href) ** 2).sum(-1)) > 18)
                    if ndi.binary_opening(hit, iterations=1).sum() > 150:
                        flags.append(f'top-in-hair:{int(hit.sum())}')
    if 'top' in L and 'shoes' in L:
        if ((L['top'][..., 3] > 0) & (L['shoes'][..., 3] > 0)).sum() > 100:
            flags.append('top-holds-shoes')
    return flags


def loud(pack, fig):
    layers = []
    for pn in ('body', 'shoes', 'trousers', 'top', 'hair'):
        if pn not in fig['parts']: continue
        a = rgba(os.path.join(pack, fig['parts'][pn]['file'])).copy()
        if pn in ('trousers', 'top', 'hair'):
            target = {'trousers': (60, 150, 70), 'top': (190, 60, 170), 'hair': (240, 130, 20)}[pn]
            al = a[..., 3] > 0; g = a[..., :3].astype(float).mean(-1, keepdims=True) / 128.0
            a[..., :3] = np.where(al[..., None], np.clip(np.array(target) * g, 0, 255), a[..., :3]).astype(np.uint8)
        layers.append(Image.fromarray(a))
    comp = layers[0]
    for l in layers[1:]:
        comp = Image.alpha_composite(comp, l)
    bg = Image.new('RGB', comp.size, (200, 190, 175)); bg.paste(comp, (0, 0), comp)
    bg.thumbnail((260, 380))
    return bg


if __name__ == '__main__':
    pack = sys.argv[1]
    man = json.load(open(os.path.join(pack, 'manifest.json')))
    bad = []
    for f in man['figures']:
        if f.get('kind') != 'kit': continue
        fl = check(pack, f)
        if fl:
            bad.append((f, fl)); print(f['id'], f.get('pose'), ' '.join(fl))
    print(len(bad), 'flagged of', sum(1 for f in man['figures'] if f.get('kind') == 'kit'), 'kit figures')
    if '--sheet' in sys.argv and bad:
        ims = [loud(pack, f) for f, _ in bad[:30]]
        W = 6; cw = max(i.width for i in ims); ch = max(i.height for i in ims)
        s = Image.new('RGB', (W * (cw + 8), ((len(ims) + W - 1) // W) * (ch + 8)), 'white')
        for i, im in enumerate(ims):
            s.paste(im, ((i % W) * (cw + 8), (i // W) * (ch + 8)))
        s.save(sys.argv[sys.argv.index('--sheet') + 1], quality=88)
    sys.exit(1 if bad else 0)
