"""Golden path rooms in the standard camera: the spots for each shot and the words Firefly paints from.

python3 rooms.py <room>   writes templates/<room>.png + .json (mannequins from the library at the grid spots).
Angles name the way the person faces on screen: tq-right = front three-quarter turned toward screen right,
btq-right = seen from behind, turned toward screen right. A person left of a speaker who faces the speaker
is 'tq-right' (facing us) or 'btq-right' (back to us)."""
import os, sys, json
import template as T

HERE = os.path.dirname(os.path.abspath(__file__))

STYLE = ('Image 2 is only for the art style: the same clean dark ink outlines, flat painted colors and soft '
         'shading. Do not copy its layout or its room.')
PAINT = ('[{key}] Image 1 is a layout sketch: a light gray canvas, a thin horizon line and plain green mannequins. '
         'Paint the full scene: {room}. Keep every green mannequin exactly where it is, at exactly its size, pose '
         'and facing, and keep it plain green: standing ones stand on the floor, seated ones sit on real chairs, '
         'couches or benches painted under them, never floating, and a desk or table is painted in front of anyone '
         'drawn at one. The camera is at standing eye level, level and straight, never tilted; the horizon line is '
         'eye height, so the far walls meet the floor below it. ' + STYLE + ' No other people, no text, no '
         'lettering on signs, screens or papers.')
EMPTY = ('[{key}] Remove every green mannequin from the reference picture and paint what was behind each one '
         '(the floor, the wall, the furniture, the chair seat and backrest). Keep everything else exactly the same: '
         'same room, same furniture, same places, same light and same art style. No people.')

ROOMS = {
    'oval-wide': dict(
        room='the Oval Office of the White House at midday: the curved wall with three tall windows and gold drapes '
             'behind the Resolute desk, the United States flag and the presidential flag beside it, the blue oval '
             'rug with the seal border, two cream couches facing each other in front, side tables and lamps',
        style='intro/oval-office-resolute__midday.jpg',
        spots=[dict(pose='sitdesk', angle='front', row='back', x=0.50),
               dict(pose='stand', angle='btq-right', row='middle', x=0.33),
               dict(pose='fold', angle='btq-left', row='middle', x=0.67),
               dict(pose='couch', angle='tq-right', row='front', x=0.13),
               dict(pose='couch', angle='tq-left', row='front', x=0.87)]),
    'oval-medium': dict(
        room='the Oval Office of the White House at night for a televised address: the Resolute desk in front with '
             'the president seated behind it, the window drapes closed behind, the United States flag on the left '
             'and the presidential flag on the right, family photographs on the credenza, warm lamplight',
        style='intro/oval-office-resolute__night.jpg',
        spots=[dict(pose='sitdesk', angle='front', row='medium-front', x=0.50)]),
}


def build(name):
    r = ROOMS[name]
    os.makedirs(os.path.join(HERE, 'templates'), exist_ok=True)
    out = os.path.join(HERE, 'templates', name)
    placed = T.template(r['spots'], out + '.png', out + '.json')
    meta = json.load(open(out + '.json'))
    meta.update(room=name, prompt=PAINT.format(key='std-' + name, room=r['room']), style=r['style'],
                empty=EMPTY.format(key='std-' + name + '-empty'))
    json.dump(meta, open(out + '.json', 'w'), indent=1)
    return placed


if __name__ == '__main__':
    for n in sys.argv[1:] or ROOMS:
        print(n, build(n))
