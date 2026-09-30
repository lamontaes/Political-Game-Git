"""Candidate coordinate overlays. Reads immutable installed art; never edits it."""
import hashlib, json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
REPO = OUT.parents[4]
HEAD = '54930d427555034f3a92f335064586247985784d'
SOURCE = Path('/Users/lamontae/Documents/OCD-UI-Kit/assets/backgrounds')
raw = subprocess.check_output(['git', 'show', HEAD + ':art/backdrops/staging.json'], cwd=REPO)
staging = json.loads(raw)
keys = sorted(k for k in staging['places'] if not k.startswith('state-capitol-'))
assert len(keys) == 59
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
native_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 23)
audits = []

def annotate(key):
    path = SOURCE / (key + '__midday.jpg')
    source = Image.open(path).convert('RGB')
    assert source.size == (1672, 941)
    draw = ImageDraw.Draw(source)
    place = staging['places'][key]
    spots = []
    for i, spot in enumerate(place['spots']):
        assert 0 <= spot['x'] <= 100 and 0 <= spot['y'] <= 100
        assert spot['pose'] in ['stand', 'sit', 'podium', 'lean']
        assert spot.get('facing') in ['viewer', 'left', 'right']
        assert 'floor' not in spot or spot['floor'] in place.get('floors', {})
        x, y = spot['x'] * 16.72, spot['y'] * 9.41
        scale = place.get('floors', {}).get(spot.get('floor'), place['metersPercent'])
        height = 1.7 * scale * (spot['y'] - place['horizonY'])
        assert height > 0
        color = '#ff22d0' if spot.get('hero') else '#00b8ff' if spot['pose'] == 'sit' else '#ffac00' if spot['pose'] in ['lean', 'podium'] else '#00e661'
        draw.ellipse((x-9, y-9, x+9, y+9), fill=color, outline='black', width=2)
        draw.text((x+11, y-28), str(i+1), font=native_font, fill=color, stroke_width=2, stroke_fill='black')
        if spot['pose'] != 'sit':
            top = y - height * 9.41
            draw.line((x, y, x, top), fill=color, width=3)
            draw.line((x-9, top, x+9, top), fill=color, width=3)
        for field, shade in [('seatY', '#00b8ff'), ('clipBelowY', '#ff5555'), ('clipBandEndY', '#ffaaaa')]:
            if field in spot:
                assert 0 <= spot[field] <= 100
                yy = spot[field] * 9.41
                draw.line((x-24, yy, x+24, yy), fill=shade, width=4)
        spots.append(dict(index=i+1, sourceSpot=spot, footPx=[round(x, 2), round(y, 2)], inheritedStandingHeightPercent=round(height, 4)))
    record = dict(key=key, sourcePath=str(path), sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(), dimensions=list(source.size), spots=spots, overlayReview='pending', actorContactAndOcclusion='NOT RUN', otherLightingVariants='NOT CHECKED')
    return source, record

for page in range(3):
    part = keys[page*20:(page+1)*20]
    sheet = Image.new('RGB', (1800, 95 + math.ceil(len(part)/3)*370), '#eeeae2')
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 10), f'REMAINING CANONICAL SPOTS / PAGE {page+1} / CANDIDATE ONLY', font=font, fill='black')
    draw.text((12, 38), 'Dots: foot points. Blue bars: seats. Red bars: clipping. Lines: inherited scale guides, not actors.', font=font, fill='black')
    draw.text((12, 64), 'Hidden floors remain inferred. Source rasters preserved. Runtime contact and occlusion NOT RUN.', font=font, fill='black')
    for i, key in enumerate(part):
        source, record = annotate(key)
        audits.append(record)
        if key in ['appellate-courtroom', 'barbershop', 'radio-booth', 'us-senate-floor', 'county-courtroom', 'supreme-courtroom']:
            source.save('/private/tmp/team7-remaining-' + key + '.png')
        source.thumbnail((600, 338))
        x, y = i % 3 * 600, 95 + i // 3 * 370
        sheet.paste(source, (x, y))
        draw.text((x+3, y+338), key + ' / ' + str(len(record['spots'])) + ' spots', font=font, fill='black')
    sheet.save(OUT / f'spot-contact-{page+1:02}.jpg', quality=95)

(OUT / 'inherited-staging.json').write_text(json.dumps(dict(schema=staging['schema'], note='Unchanged canonical excerpt for candidate review only; source claims do not establish new acceptance.', places={k:staging['places'][k] for k in keys}), indent=2) + '\n')
(OUT / 'spot-audit.json').write_text(json.dumps(dict(schema='team7-inherited-spot-audit/v1', sourceHead=HEAD, sourceStagingSha256=hashlib.sha256(raw).hexdigest(), status='candidate-pending-visual-review', images=audits, limits=['Only named native midday images are bound to this review.', 'Scale and hidden foot positions are inherited artistic assumptions.', 'These are geometric guides, not rendered character acceptance.', 'No canonical staging, art original or game code changed.']), indent=2) + '\n')
print('PASS:', len(audits), 'native sources;', sum(len(x['spots']) for x in audits), 'spot coordinate/floor/pose/scale checks; visual review pending')
