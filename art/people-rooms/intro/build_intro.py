"""Build every intro frame: people fitted to their painted mannequins (plates/<scene>-mannequins.png)."""
import sys, json
sys.path.insert(0, '.')
from PIL import Image
from frames import fig, hands_line, CASUAL, room_light
import mannequins as mq


def scenes():
    out = {}
    sp = json.load(open('spots-house-suburban-living.json'))['spots']
    out['home'] = ('house-suburban-living__night.jpg', [
        dict(fig=fig('man-medium-p2r0', 1, CASUAL), where=dict(mode='spot', spot=sp[2])),
        dict(fig=fig('woman-medium-p2r0', 1, CASUAL), where=dict(mode='spot', spot=sp[3]))],
        lambda bd, im: room_light(bd, im, (300, 250, 900, 780)))
    H, k = 387, 1.68
    out['colonnade'] = ('white-house-colonnade__morning.jpg', [
        dict(fig=fig('mm-suitcharcoal-p2r1', 0), where=dict(mode='feet', x=640, feet_y=600, stature=k * (600 - H)), order=0, shadow=True),
        dict(fig=fig('wm-pantsuitnavy-p2r1', 0), where=dict(mode='feet', x=470, feet_y=712, stature=k * (712 - H)), order=1, shadow=True)], None)
    H, k = 440, 1.5
    crowd = [('man-heavy-p2r1', 2, 165, 590), ('woman-heavy-p2r1', 2, 262, 594), ('woman-slim-p2r1', 2, 455, 566), ('man-slim-rr1', 2, 525, 549),
             ('woman-medium-p2r1', 2, 705, 541), ('man-medium-rr1', 3, 770, 528), ('man-heavy-rr1', 2, 985, 509), ('woman-slim-p2r1', 3, 1050, 503),
             ('man-slim-p2r1', 2, 1185, 497), ('woman-heavy-rr1', 3, 1240, 489)]
    out['depot'] = ('train-depot-platform__midday.jpg', [
        dict(fig=fig(s, kk, CASUAL), where=dict(mode='feet', x=x, feet_y=fy, stature=k * (fy - H)), order=fy, shadow=True) for s, kk, x, fy in crowd], None)
    sp = json.load(open('spots-oval-office-resolute.json'))['spots']
    dt = min(sp[2]['frontLine'])
    out['oval-briefing'] = ('oval-office-resolute__midday.jpg', [
        dict(fig=fig('mm-address', 0), where=dict(mode='spot', spot=sp[2]), clip_below=dt + 6, desk_edge=dt, order=0),
        dict(fig=fig('wm-pantsuitblack-p2r0', 1), where=dict(mode='spot', spot=sp[3]), order=2),
        dict(fig=fig('mm-blazer-p2r0', 2), where=dict(mode='spot', spot=sp[4]), order=2),
        dict(fig=fig('wm-blazercamel-p2r1', 3), where=dict(mode='spot', spot=sp[1]), order=1, shadow=True)], None)
    f = fig('wm-address', 4); ht, hl = f['head_top'], hands_line(f); s = (492 - 246) / max(hl - ht, 1)
    out['oval-address'] = ('oval-address-close__night.png', [
        dict(fig=f, where=dict(mode='feet', x=690, feet_y=246 + (f['feet'] - ht) * s, stature=(f['feet'] - ht) * s), clip_below=478, desk_edge=470)], None)
    return out


if __name__ == '__main__':
    for name, (bd, pls, light) in scenes().items():
        back = Image.open(bd).convert('RGB')
        mq.blob_plate(back, pls)
        c, g, rep = mq.fit_to_mannequins(back, Image.open(f'plates/{name}-mannequins.png'), pls, light)
        c.convert('RGB').save(f'frame-{name}.jpg', quality=93)
        print(name, rep)
