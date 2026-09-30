"""Render one recorded archive front page. No world writes or authored news."""
import argparse
import hashlib
import html
import json
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--style', choices=['heritage', 'civic-blue', 'evening'], default='heritage')
style = parser.parse_args().style
OUTPUT = ROOT / 'variations' / style
OUTPUT.mkdir(parents=True, exist_ok=True)
packet = json.loads((ROOT / 'recorded-issue-packet.json').read_text())
stories = [packet['assembly']['lead'], *packet['assembly']['stories']]
assert len(stories) == 7 and len({s['id'] for s in stories}) == 7
assert all(s['outletKey'] == packet['assembly']['outlet']['outletKey'] for s in stories)
W, H = 1200, 1420
paper, ink, rule = {'heritage': ('#eee8d7', '#302b25', '#968b76'), 'civic-blue': ('#faf8ee', '#183b4a', '#a4b4b7'), 'evening': ('#f0e7d7', '#492832', '#ae918d')}[style]
image = Image.new('RGB', (W, H), paper)
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', f'<rect width="{W}" height="{H}" fill="{paper}"/>']
rendered = []
boxes = []

def font(size, bold=False, italic=False):
    suffix = ' Bold' if bold else ' Italic' if italic else ''
    family = 'Arial' if style == 'civic-blue' else 'Georgia'
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/' + family + suffix + '.ttf', size)

def line(x, y, xx, yy, color=ink, width=1):
    draw.line((x, y, xx, yy), fill=color, width=width)
    svg.append(f'<line x1="{x}" y1="{y}" x2="{xx}" y2="{yy}" stroke="{color}" stroke-width="{width}"/>')

def text(x, y, copy, size, bold=False, italic=False):
    f = font(size, bold, italic)
    draw.text((x, y), copy, fill=ink, font=f, anchor='lt')
    svg.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" fill="{ink}" font-family="{"Arial,sans-serif" if style == "civic-blue" else "Georgia,serif"}" font-size="{size}" font-weight="{700 if bold else 400}" font-style="{"italic" if italic else "normal"}">{html.escape(copy)}</text>')
    return f.getlength(copy)

def wrap(copy, width, size, bold=False):
    rows, current = [], ''
    f = font(size, bold)
    for word in copy.split():
        test = (current + ' ' + word).strip()
        if current and f.getlength(test) > width:
            rows.append(current)
            current = word
        else:
            current = test
        assert f.getlength(current) <= width, (current, width)
    if current:
        rows.append(current)
    return rows

def date_text(value):
    d = date.fromisoformat(value)
    return f'{d:%B} {d.day}, {d.year}'

def story(s, x, y, width, height, headline_size, body_size):
    top = y
    text(x, y, date_text(s['publishedAt']), 18, italic=True)
    y += 30
    headline = s['readerHeadline']
    rows = wrap(headline, width, headline_size, True)
    for row in rows:
        text(x, y, row, headline_size, True)
        y += headline_size * 1.13
    y += 20
    # Exact body paragraphs. Both columns follow the same six-column page grid.
    column_width = (width - 24) / 2
    paragraphs = s['body'].split('\n\n')
    for col, paragraph in enumerate(paragraphs):
        yy = y
        for row in wrap(paragraph, column_width, body_size):
            text(x + col * (column_width + 24), yy, row, body_size)
            yy += body_size * 1.24
        assert yy <= top + height, (s['id'], yy, top + height)
    assert ' '.join(rows) == headline
    rendered.append(dict(id=s['id'], sourceEventId=s['sourceEventId'], sourceRecordIds=s['sourceRecordIds'], headline=headline, body=s['body'], publishedAt=s['publishedAt']))
    boxes.append(dict(id=s['id'], x=x, y=top, width=width, height=height))

margin, gutter = 48, 30
name = packet['recordedOutlet']['name']
size = 70
while font(size, True).getlength(name) > W - 2 * margin:
    size -= 1
text((W - font(size, True).getlength(name)) / 2, 50, name, size, True)
line(margin, 136, W - margin, 136, width=3)
line(margin, 143, W - margin, 143)
text(margin, 157, packet['provenance']['place'], 21)
label = 'Archive through ' + date_text(packet['provenance']['currentDate'])
text(W - margin - font(21).getlength(label), 157, label, 21)
line(margin, 190, W - margin, 190)
text(margin, 210, 'METRO', 21, True)
text(W - margin - font(21, True).getlength('A1'), 210, 'A1', 21, True)
story(stories[0], margin, 253, W - 2 * margin, 265, 43, 24)
line(margin, 536, W - margin, 536)
columns = 2 if style == 'evening' else 3
pair_width = (W - 2 * margin - (columns - 1) * gutter) / columns
row_height = 260 if columns == 2 else 390
for i, s in enumerate(stories[1:]):
    col, row = i % columns, i // columns
    x, y = margin + col * (pair_width + gutter), 555 + row * row_height
    story(s, x, y, pair_width, row_height - 20, 26 if columns == 2 else 27, 19 if columns == 2 else 20)
    if col < columns - 1:
        line(x + pair_width + gutter / 2, y, x + pair_width + gutter / 2, y + row_height - 30, rule)
    if row and col == 0:
        line(margin, y - 15, W - margin, y - 15, rule)
# The fold is a physical-page treatment, not a content or chronology boundary.
line(0, H / 2, W, H / 2, '#d5ccb8')
line(margin, 1341, W - margin, 1341)
footer = 'Seven recorded stories | January 28–March 18, 2026'
text(margin, 1363, footer, 19)
text(W - margin - font(19).getlength('METRO · A1'), 1363, 'METRO · A1', 19)
svg.append('</svg>')
(OUTPUT / 'filled-frontpage.svg').write_text('\n'.join(svg) + '\n')
image.save(OUTPUT / 'filled-frontpage.png')
# Explicit preview reduction; originals and all source artwork remain untouched.
contact = image.copy()
contact.thumbnail((600, 710))
contact.save(OUTPUT / 'filled-frontpage-contact.jpg', quality=95)
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
receipt = dict(schema='ocd-newspaper-recorded-render/v1', status='candidate-only', packetSha256=sha(ROOT / 'recorded-issue-packet.json'), sourceHead=packet['provenance']['sourceHead'], saveSha256ProducerReported=packet['provenance']['saveSha256'], dimensions=[W, H], style=style, columns=6, stories=rendered, boxes=boxes, checks=dict(exactHeadlineAndBody=True, allSevenStories=True, uniquePublicationIds=True, correctOutlet=True, textWidthAndBodyBounds=True), limitations=['Photo/headshot completion is blocked pending exact saved-person portrait and event-photo bindings. This is a typography/layout candidate only; no invented portrait or event photo.', 'Bodies contain only declined-comment sentences and reporter bylines.', 'Archive date is the saved-world cutoff; individual publication dates remain visible.', 'Team8 save purity and ID verification are producer-reported, not independently rerun.', 'SVG font metrics and actual game/browser consumer fit are NOT RUN.', 'CTO review and Lamontae pixel approval are pending.'], outputs={n:sha(OUTPUT / n) for n in ['filled-frontpage.svg', 'filled-frontpage.png', 'filled-frontpage-contact.jpg']})
(OUTPUT / 'filled-frontpage-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('PASS:', style, 'seven exact stories; text bounds checked; photos/headshots pending.')
