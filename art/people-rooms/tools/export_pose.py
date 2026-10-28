"""Export in-scene poses as reusable figures: for each person in the picture (left to right), the cut gray
person (RGBA, cropped), its garment map, and tags in the people-engine index's field names
(art/people-engine/v2/index.json, ocd-people-v2/1) plus what a furniture pose adds: what the person
touches, the gesture, which hair view fits the head, the head box, and where the furniture's front edge
cuts the body (so the engine can line it up with any lectern, desk or counter of that kind).
usage: python3 export_pose.py EMPTY PLATE PERSON MARKER OUTDIR TAGS.json
TAGS.json: one object, or a list with one object per person left to right:
{"id", "scene", "pose", "angle", "facing", "gesture", "interacts", "hairView", "sex", "build", "frontEdgeY"}"""
import sys, json, os, numpy as np
from PIL import Image
from inscene import load, cut, head_of, bodies

e, pl, pa, mk, outdir, tp = sys.argv[1:7]
TT = json.load(open(tp)); TT = TT if isinstance(TT, list) else [TT]; size = Image.open(pa).size
E, P, A, M = load(e, size), load(pl, size), load(pa, size), load(mk, size)
person, G = cut(E, P, A, M); os.makedirs(outdir, exist_ok=True)
for b, T in zip(bodies(person), TT):
    ys, xs = np.where(b); pad = 4
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(size[0], xs.max() + pad + 1), min(size[1], ys.max() + pad + 1)
    fig = np.zeros(A.shape[:2] + (4,), np.uint8); fig[..., :3] = A.astype(np.uint8); fig[..., 3] = b * 255
    Gb = np.where(b[..., None], G, 0).astype(np.uint8); fid = T['id']
    Image.fromarray(fig[y0:y1, x0:x1]).save(f'{outdir}/{fid}.png'); Image.fromarray(Gb[y0:y1, x0:x1]).save(f'{outdir}/{fid}-garments.png')
    top, cx, hw = head_of(b)
    rec = {'id': fid, 'file': f'{fid}.png', 'garments': f'{fid}-garments.png', 'sheet': 'in-scene', 'scene': T['scene'], 'plate': os.path.basename(pl),
           'pose': T['pose'], 'angle': T['angle'], 'facing': T['facing'], 'gesture': T['gesture'], 'interacts': T['interacts'], 'hairView': T['hairView'],
           'sex': T.get('sex', 'any'), 'build': T.get('build', 'medium'), 'ageBand': 'adult', 'prop': 'none', 'outfit': 'suit',
           'width': int(x1 - x0), 'height': int(y1 - y0), 'boxInScene': [int(x0), int(y0), int(x1), int(y1)], 'sceneSize': list(size),
           'head': {'top': int(top - y0), 'x': round(float(cx - x0), 1), 'width': int(hw)},
           'frontEdgeY': (int(T['frontEdgeY'] - y0) if T.get('frontEdgeY') is not None else None),
           'clothesLabelled': round(float((Gb[y0:y1, x0:x1].sum(2) > 0).sum() / max(1, b[y0:y1, x0:x1].sum())), 2)}
    json.dump(rec, open(f'{outdir}/{fid}.json', 'w'), indent=1); print(fid, rec['width'], rec['height'], rec['head'])
