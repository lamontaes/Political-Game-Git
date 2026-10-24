"""Rebuild one complete room using repository paths; fail before publishing incomplete art."""
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent


def run(script, *args):
    subprocess.run([sys.executable, str(TOOLS / script), *map(str, args)], check=True)


def main(place, build):
    build = Path(build).resolve()
    room = ROOT / 'art/seat-slots' / place
    plate = ROOT / 'art/backdrops' / f'{place}__midday.jpg'
    run('build_seats.py', place, plate, ROOT / 'art/seat-slots-source' / place,
        room / 'chairs.json', build)
    report = json.loads((build / 'report.json').read_text())
    if not report['complete']:
        raise SystemExit(f'Regeneration required; packed assets preserved. See {build / "report.json"}')
    lights = [f'{light}={path}' for light in ('morning', 'night', 'rain')
              if (path := ROOT / 'art/backdrops' / f'{place}__{light}.jpg').is_file()]
    if lights:
        run('seat_lights.py', build, plate, *lights)
    # Review outputs stay beside this build until a human has looked at every sheet.
    pack = build / 'packed'
    run('pack_atlas.py', build, pack)
    for name, light, share in [('full', 'midday', 1), ('third', 'midday', 1/3), ('night', 'night', 1)]:
        light_plate = ROOT / 'art/backdrops' / f'{place}__{light}.jpg'
        if light_plate.exists():
            run('render_atlas.py', pack, light_plate, light, share, 4280, build / f'{place}__{name}.jpg')
    meta = json.loads((build / 'seats.json').read_text())
    variants = [(s['chair'], v) for s in meta['seats'] for v in s['variants']]
    cell_w, cell_h, columns = 180, 220, 8
    sheet = Image.new('RGB', (columns * cell_w, ((len(variants) + columns - 1)//columns)*cell_h), '#aaa5a0')
    draw = ImageDraw.Draw(sheet)
    for index, (chair, variant) in enumerate(variants):
        image = Image.open(build / 'cut' / variant['file']).convert('RGBA')
        image.thumbnail((cell_w - 12, cell_h - 40))
        x, y = index % columns * cell_w, index // columns * cell_h
        sheet.paste(image, (x + 6, y + 36), image)
        draw.text((x + 6, y + 4), f'{chair}\nvariant {index + 1}', fill='black')
    sheet.save(build / f'{place}.jpg', quality=95)
    print(f'Ready for visual review: {build}')


if __name__ == '__main__':
    main(*sys.argv[1:])
