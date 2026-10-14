"""Build chair-addressed cut-outs from independent person masks at source resolution.

Usage: build_seats.py PLACE PLATE SOURCE_DIR CHAIRS_JSON OUTDIR
No difference masking, connected-component splitting, fragment attachment,
edge cleaning, or body warping is performed. Rejected inputs remain rejected.
"""
import collections
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from align import align, rigid_shift


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def head(mask):
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    top = int(ys.min())
    upper = mask[top:top + max(1, min(4, int(ys.max()) - top + 1))]
    return [float(np.nonzero(upper)[1].mean()), float(top)]


def assign_chair(point, chairs):
    hx, hy = point
    candidates = []
    for chair in chairs:
        x, y, w, h = chair['box']
        sx, sy = chair['seat']
        if x <= hx <= x + w and y <= hy < min(y + h, sy):
            candidates.append(((sx - hx) ** 2 + (sy - hy) ** 2, chair['id'], chair))
    return min(candidates, key=lambda item: item[:2])[2] if candidates else None


def translate(array, dx, dy):
    """Translate without interpolation; return an array in the same frame."""
    h, w = array.shape[:2]
    result = np.zeros_like(array)
    sx, sy = max(0, -dx), max(0, -dy)
    tx, ty = max(0, dx), max(0, dy)
    width, height = min(w - sx, w - tx), min(h - sy, h - ty)
    if width > 0 and height > 0:
        result[ty:ty + height, tx:tx + width] = array[sy:sy + height, sx:sx + width]
    return result


def rejection_reasons(mask, point, chair, width, median_width, room_share):
    reasons = []
    if not mask.any():
        return ['empty']
    if ndimage.label(mask, structure=np.ones((3, 3)))[1] != 1:
        reasons.append('disconnected')
    if chair is None:
        reasons.append('no_chair')
    elif point[1] >= chair['seat'][1]:
        reasons.append('head_below_seat')
    if median_width is not None and width > 1.6 * median_width:
        reasons.append('too_wide')
    if room_share > 0.05:
        reasons.append('room_pixels')
    return reasons


def furniture_mask(annotations, chair, size):
    """Rasterize reviewed empty-painting geometry, selecting foreground by chair."""
    result = Image.new('L', size)
    drawing = ImageDraw.Draw(result)
    for item in annotations['furniture']:
        if chair['id'] in item['in_front_of']:
            if 'mask' in item:
                layer = Image.open(Path(annotations['_folder']) / item['mask']).convert('L')
                if layer.size != size:
                    raise ValueError('Furniture mask does not match the empty painting')
                if 'min_y' in item:
                    layer.paste(0, (0, 0, size[0], int(item['min_y'])))
                result.paste(255, (0, 0), layer)
            else:
                drawing.polygon([tuple(p) for p in item['polygon']], fill=255)
    return np.array(result) > 0


def main(place, plate_path, source_dir, chairs_path, outdir):
    plate_path, source_dir, chairs_path, outdir = map(Path, (plate_path, source_dir, chairs_path, outdir))
    if outdir.exists():
        raise FileExistsError(f'Use a fresh build directory: {outdir}')
    annotations = json.loads(chairs_path.read_text())
    annotations['_folder'] = str(chairs_path.parent)
    chairs = annotations['chairs']
    ids = [c['id'] for c in chairs]
    if len(ids) != len(set(ids)) or not chairs:
        raise ValueError('Chair IDs must be unique and nonempty')
    plate = Image.open(plate_path).convert('RGB')
    if list(plate.size) != annotations['size']:
        raise ValueError('Chair geometry does not match the empty painting')
    if hashlib.sha256(plate_path.read_bytes()).hexdigest() != annotations['plate_sha256']:
        raise ValueError('The empty painting changed; review chair geometry')
    outdir.mkdir(parents=True)
    (outdir / 'cut').mkdir()
    review_path = source_dir / 'review.json'
    reviewed_rejections = json.loads(review_path.read_text())['rejected'] if review_path.exists() else {}
    candidates = []
    for source in sorted(source_dir.glob('*.jpg')):
        folder = source.with_suffix('.persons')
        provenance = json.loads((folder / 'provenance.json').read_text())
        if provenance['source_sha256'] != hashlib.sha256(source.read_bytes()).hexdigest():
            raise ValueError(f'Stale masks: {source}')
        image = np.array(Image.open(source).convert('RGB'))
        h, w = image.shape[:2]
        masks = [np.array(Image.open(folder / item['mask']).convert('L')) > 127
                 for item in provenance['instances']]
        if any(m.shape != (h, w) for m in masks):
            raise ValueError(f'Masks are not at source size: {source}')
        if not masks:
            continue
        room = np.array(plate.resize((w, h), Image.Resampling.LANCZOS))
        union = np.logical_or.reduce(masks)
        _, _, flow = align(room, image, ndimage.binary_dilation(union, iterations=6), warp=False)
        scale = np.array(plate.size) / [w, h]
        for index, mask in enumerate(masks):
            reasons = []
            try:
                dx, dy = rigid_shift(mask, union, flow)
            except ValueError:
                dx, dy = 0, 0
                reasons.append('no_room_ring')
            moved = translate(mask, dx, dy)
            if moved.sum() != mask.sum():
                reasons.append('outside_frame')
            point = head(moved)
            chair = assign_chair(np.array(point) * scale, chairs) if point else None
            xs = np.nonzero(moved)[1]
            width = (int(np.ptp(xs)) + 1) * scale[0] if len(xs) else 0
            moved_image = translate(image, dx, dy)
            diff = np.abs(moved_image.astype(np.int16) - room.astype(np.int16)).max(axis=2)
            share = float((diff[moved] <= 12).mean()) if moved.any() else 1.0
            candidates.append(dict(source=source.name, instance=index, mask=mask,
                                   image=image, shift=[dx, dy], head=(np.array(point) * scale).tolist() if point else None,
                                   chair=chair, width=width, room_share=share,
                                   reasons=reasons, scale=scale))
        print(f'{place}/{source.name}: {len(masks)} independent people', flush=True)
    generated_path = source_dir / 'generated.json'
    if generated_path.exists():
        for item in json.loads(generated_path.read_text())['people']:
            rgba = np.array(Image.open(source_dir / item['file']).convert('RGBA'))
            mask = rgba[..., 3] > 127
            chair = next(c for c in chairs if c['id'] == item['chair'])
            visible_x = np.nonzero(mask)[1]
            scale = np.array([item['width'] / (int(np.ptp(visible_x)) + 1)] * 2)
            point = head(mask)
            at = [int(round(chair['seat'][0] - point[0] * scale[0])),
                  int(round(item['head_top'] - point[1] * scale[1]))]
            final_head = (np.array(point) * scale + at).tolist()
            placed = Image.fromarray(rgba).resize(tuple(np.rint(np.array(rgba.shape[1::-1]) * scale).astype(int)), Image.Resampling.LANCZOS)
            x, y = at
            room = np.array(plate.crop((x, y, x + placed.width, y + placed.height)))
            pixels = np.array(placed)
            diff = np.abs(pixels[..., :3].astype(np.int16) - room.astype(np.int16)).max(axis=2)
            share = float((diff[pixels[..., 3] > 127] <= 12).mean())
            candidates.append(dict(source=item['file'], instance=0, mask=mask,
                                   alpha=rgba[..., 3], image=rgba[..., :3], shift=[0, 0],
                                   head=final_head, chair=chair, width=item['width'],
                                   room_share=share, reasons=[], scale=scale, at=at))
    seats = {c['id']: {'id': f"{place}:chair:{c['id']}", 'chair': c['id'],
                       'head': None, 'variants': []} for c in chairs}
    rejected = []
    widths = collections.defaultdict(list)
    for p in candidates:
        if p['chair'] and not p['reasons'] and ndimage.label(p['mask'], structure=np.ones((3, 3)))[1] == 1:
            widths[p['chair']['depth']].append(p['width'])
    for person in candidates:
        chair, mask = person['chair'], person['mask']
        peers = widths[chair['depth']] if chair else []
        reasons = person['reasons'] + rejection_reasons(
            mask, person['head'], chair, person['width'],
            float(np.median(peers)) if peers else None, person['room_share'])
        name = f"{Path(person['source']).stem}__person{person['instance']:03d}"
        if 'at' in person:
            name += '__' + chair['id']
        if name in reviewed_rejections:
            reasons.append('visual_' + reviewed_rejections[name])
        rgba = Image.fromarray(np.dstack((person['image'], person.get('alpha', mask.astype(np.uint8) * 255))))
        bounds = rgba.getbbox()
        if not reasons:
            dx, dy = person['shift']
            x0, y0, x1, y1 = bounds
            scale = person['scale']
            left, top = np.rint(np.array([x0 + dx, y0 + dy]) * scale).astype(int)
            right, bottom = np.rint(np.array([x1 + dx, y1 + dy]) * scale).astype(int)
            if 'at' in person:
                left += person['at'][0]
                right += person['at'][0]
                top += person['at'][1]
                bottom += person['at'][1]
            cut = rgba.crop(bounds).resize((right - left, bottom - top), Image.Resampling.LANCZOS)
            # The room frame clips edge chairs in the original painting too.
            cut = cut.crop((max(0, -left), max(0, -top),
                            min(cut.width, plate.width - left), min(cut.height, plate.height - top)))
            left, top = max(0, left), max(0, top)
            right, bottom = left + cut.width, top + cut.height
            data = np.array(cut)
            foreground = furniture_mask(annotations, chair, plate.size)[top:bottom, left:right]
            data[..., 3][foreground] = 0
            # Validate the person before furniture occlusion. Furniture may
            # legitimately hide the middle of one already identified person;
            # those visible parts remain one variant, never independent seats.
            if not (data[..., 3] > 127).any():
                reasons.append('fully_occluded')
        if reasons:
            folder = outdir / 'rejected' / name
            folder.mkdir(parents=True)
            rgba.crop(bounds or (0, 0, 1, 1)).save(folder / 'cutout.png')
            diag = {'source': person['source'], 'instance': person['instance'],
                    'chair': chair['id'] if chair else None, 'reasons': reasons,
                    'room_pixel_share': person['room_share'], 'shift': person['shift']}
            write_json(folder / 'diag.txt', diag)
            rejected.append(diag)
            continue
        filename = name + '.png'
        Image.fromarray(data).save(outdir / 'cut' / filename)
        seat = seats[chair['id']]
        seat['head'] = seat['head'] or person['head']
        seat['variants'].append({'file': filename, 'left': int(left), 'top': int(top),
                                 'head': person['head'], 'bottom': int(bottom - 1),
                                 'activity': 'plain', 'chair': chair['id'],
                                 'source': person['source'], 'instance': person['instance']})
    missing = {key: max(0, 3 - len(s['variants'])) for key, s in seats.items() if len(s['variants']) < 3}
    reasons = collections.Counter(reason for item in rejected for reason in item['reasons'])
    report = {'place': place, 'chairs': len(chairs),
              'kept': sum(len(s['variants']) for s in seats.values()),
              'rejected': len(rejected), 'rejected_by_reason': dict(reasons),
              'regeneration_needed': missing, 'complete': not missing}
    write_json(outdir / 'report.json', report)
    write_json(outdir / 'seats.json', {'place': place, 'plate': plate_path.name,
               'width': plate.width, 'height': plate.height, 'seats': list(seats.values())})
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main(*sys.argv[1:])
