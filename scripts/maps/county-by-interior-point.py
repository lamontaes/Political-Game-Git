"""Finds the county a place's Census interior point sits in (pure Python, no packages).

usage: county-by-interior-point.py <gap geoids file> <2025 Gazetteer places txt> <county .shp> <county .dbf> <out json>
The county shapes are Census cartographic boundaries (cb_2024_us_county_500k); the
points are the Gazetteer's INTPTLAT/INTPTLONG. Prints places whose point is in no county.
"""
import json, struct, sys

gaps = [l.strip() for l in open(sys.argv[1]) if l.strip()]
pts = {}
for line in open(sys.argv[2], encoding="utf-8"):
    c = line.rstrip("\n").split("|")
    if c[1] in gaps: pts[c[1]] = (float(c[-1]), float(c[-2]))  # lon, lat

# dbf: GEOID per record
d = open(sys.argv[4], "rb").read()
n, hl, rl = struct.unpack("<IHH", d[4:12])
fields, off = [], 32
while d[off] != 0x0D:
    fields.append((d[off:off+11].split(b"\0")[0].decode(), d[off+16])); off += 32
geoids = []
for i in range(n):
    rec = d[hl + i*rl: hl + (i+1)*rl]; p = 1
    for name, ln in fields:
        if name == "GEOID": geoids.append(rec[p:p+ln].decode().strip())
        p += ln

# shp polygons
s = open(sys.argv[3], "rb").read()
polys = []  # (bbox, parts[list of rings], geoid)
pos, k = 100, 0
while pos < len(s):
    _, clen = struct.unpack(">ii", s[pos:pos+8]); body = s[pos+8: pos+8+clen*2]; pos += 8 + clen*2
    t = struct.unpack("<i", body[:4])[0]
    if t == 5:
        bbox = struct.unpack("<4d", body[4:36]); np_, npt = struct.unpack("<ii", body[36:44])
        parts = list(struct.unpack("<%di" % np_, body[44:44+4*np_])) + [npt]
        xy = struct.unpack("<%dd" % (2*npt), body[44+4*np_: 44+4*np_+16*npt])
        rings = [[(xy[2*j], xy[2*j+1]) for j in range(parts[q], parts[q+1])] for q in range(np_)]
        polys.append((bbox, rings, geoids[k]))
    k += 1

def inside(x, y, ring):
    c = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c

out, miss = {}, []
for g in gaps:
    if g not in pts: miss.append(g); continue
    x, y = pts[g]
    hit = [geo for bb, rings, geo in polys if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3]
           and sum(inside(x, y, r) for r in rings) % 2 == 1]
    if len(hit) == 1: out[g] = hit[0]
    else: miss.append(g)
json.dump(out, open(sys.argv[5], "w"), indent=0, sort_keys=True)
print("placed", len(out), "of", len(gaps), "unplaced", miss)
