"""Owner-facing boards for the rally built from the kit."""
import json, sys
sys.path.insert(0, '.')
from PIL import Image, ImageDraw, ImageFont
from render import render, person

F = '/System/Library/Fonts/Supplemental/Arial.ttf'
FB = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
BG, INK, SUB = (247, 244, 236), (30, 30, 34), (96, 92, 88)


def font(p, s): return ImageFont.truetype(p, s)


def compare():
    ref = Image.open('../scenes/rally-town-square-v2.jpg').convert('RGB').resize((1376, 768))
    built = Image.open('rally-from-parts.jpg').convert('RGB').resize((1376, 768))
    W, H = 1376 + 48, 768 * 2 + 190
    c = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(c)
    d.text((24, 22), 'Generated in one piece (for orientation only)', font=font(FB, 30), fill=INK)
    c.paste(ref, (24, 66))
    y = 66 + 768 + 24
    d.text((24, y), 'Built from the kit: 26 people from 6 bodies, each part recolored or swapped', font=font(FB, 30), fill=INK)
    c.paste(built, (24, y + 44))
    c.save('rally-compare.jpg', quality=90)


def howmade(spots):
    pick = ['G', 'S1', 'L', 'O', 'S5', 'stage-R2']
    sp = {s['id']: s for s in spots}
    cols = []
    for pid in pick:
        s = sp[pid]['spec']
        orig, _, _ = render({'p': s['p'], 'k': s['k']})
        new, _, _ = render(s)
        cols.append((s, orig, new))
    th = 520
    def fit(im):
        r = th / im.height
        return im.convert('RGBa').resize((int(im.width * r), th), Image.LANCZOS).convert('RGBA')
    cells = []
    for s, o, n in cols:
        o, n = fit(o), fit(n)
        w = o.width + n.width + 70
        tw = 0
        cell = Image.new('RGBA', (max(w, 470), th + 170), BG + (255,))
        cell.alpha_composite(o, (0, 40)); cell.alpha_composite(n, (o.width + 70, 40))
        d = ImageDraw.Draw(cell)
        d.text((o.width + 18, 40 + th // 2 - 30), '>', font=font(FB, 54), fill=SUB)
        d.text((0, 4), 'as drawn', font=font(F, 22), fill=SUB)
        d.text((o.width + 70, 4), 'in the rally', font=font(F, 22), fill=SUB)
        body = s['p'].replace('-', ' ')
        lines = [body + ', pose ' + str(s['k'])]
        bits = []
        if s.get('hair_from'): bits.append(s['hair_from'][0].replace('-', ' ') + "'s hairstyle")
        if s.get('hair'): bits.append(s['hair'][2:].replace('darkbrown', 'dark brown') + ' hair')
        lines.append(', '.join(bits) if bits else 'own hair')
        cl = [s.get('top'), s.get('trousers'), s.get('shoes')]
        lines.append(' / '.join(x for x in cl if x) or 'own clothes')
        for i, t in enumerate(lines):
            d.text((0, th + 52 + i * 34), t, font=font(FB if i == 0 else F, 26), fill=INK if i == 0 else SUB)
        cells.append(cell)
    per = 3
    rows = [cells[i:i + per] for i in range(0, len(cells), per)]
    W = max(sum(c.width for c in r) + 60 * (len(r) - 1) for r in rows) + 80
    H = sum(max(c.height for c in r) for r in rows) + 60 * len(rows) + 110
    board = Image.new('RGBA', (W, H), BG + (255,)); d = ImageDraw.Draw(board)
    d.text((40, 30), 'How some of the crowd were made: same painting, parts swapped or recolored', font=font(FB, 34), fill=INK)
    y = 110
    for r in rows:
        x = 40
        for c in r:
            board.alpha_composite(c, (x, y)); x += c.width + 60
        y += max(c.height for c in r) + 60
    board.convert('RGB').save('rally-how-made.jpg', quality=90)


if __name__ == '__main__':
    spots = json.load(open('spots-final.json'))
    compare()
    howmade(spots)
