# Seat slots: handoff for review

Written by the CTO (Opus) on Oct 14, 2026, for Fable to review. The owner's verdict on the result: progress, but "there's still so much clipping and half-drawn people." This folder holds everything needed to see the problems, rerun the pipeline and fix it.

## What it is

Painted people for every seat in twelve chamber and meeting-room paintings, so a room can be drawn full, partly full or nearly empty with each person in a real chair. The owner chose the method on Oct 13 ("generate the scene with the people in it, cut them out"):

1. Firefly (Nano Banana 2) edits the empty room painting and seats a few people far apart.
2. Each version is aligned back onto the empty painting (block-matching flow, `align.py`), because Firefly redraws the room a few pixels off.
3. A people mask for that version is warped with the same flow; each connected person is cut out.
4. Cut-outs from all versions are grouped into seats by head position.
5. Hand review drops bad cut-outs (`curation-log.txt`).
6. Light copies are recolored for morning, night and rain, then everything is packed into one sprite sheet per light.

To draw a room: the empty painting, then one person per occupied seat, lowest floor line last. A person's cut-out leaves out whatever furniture was in front of them in their own version, so the room's own furniture shows through.

The packed result is already on main in `art/seat-slots/` (12 rooms, 244 seats, 1,111 people, 15.7 MB, format in its README). Nothing in the game draws it yet.

## The problems the owner sees

- **Half-drawn people.** The Adobe connector's people mask (`image_select_by_prompt`) stopped working at about 9:50 p.m. on Oct 13 (session token expired). 181 of the 225 newer versions were then cut with `local_mask.py`, which masks whatever differs from the empty painting. It misses clothing close in color to what's behind it (navy suits on navy chairs, dark jackets on black chairs), so bodies come out ragged or missing parts. `mask-sources.md` lists which versions used which mask. The `sheets/` contact sheets show every final cut-out per room.
- **Clipping.** The cut-out is right only if the version lines up with the empty painting. Where alignment is off by a few pixels, desk edges and chair backs from the version end up inside the cut-out or bite into the person. Seats are grouped by head distance; two entries can be the same chair painted in different versions, so two people can overlap.
- **Edge halos.** `clean_edges.py` clears room-colored pixels near each cut-out's edge. It helps, but it can also eat thin dark details.
- **Legs and pieces.** An audience member seen through an open chair back is several pieces (head and shoulders, back through the gap, feet). `build_seats.py` attaches any smaller part below a bigger one; when it guesses wrong, feet or legs go missing or land on the wrong person.

## Files

- `art/seat-slots-source/<place>/`: every Firefly version used, JPEG (1376 × 768), each with its mask (`.mask.png`, white = person). Names: `crowd-v*` and `sparse-v*` (first passes), `x-*` (very sparse, about 8–14 people), `y-*` (seated deep, seat back hiding the body), `w-*` (near rows), `z-*` (dais officials, empty hands). The empty paintings are `art/backdrops/<place>__midday.jpg` on main.
- `tools/seat-slots/`: the pipeline. `build_place.sh PLACE CODE OUT [old-folder]` builds one room with `STRICT=1` (`PREFIXES` picks which version series). `diag.py` shows why each blob was kept or rejected. `curate_seats.py`, `keep_only.py` and `tag_seats.py` apply hand review. `merge_seats.py` joins sets. `clean_edges.py`, `seat_lights.py`, `pack_atlas.py` finish a room. `render_atlas.py` is the reference renderer. `firefly-jobs/` holds the exact Firefly prompts.
- `tools/seat-slots/curation-log.txt`: every hand-review decision (drop, keep-only, reading tag) per set.
- `docs/handoff/seat-slots/renders/`: each room full, about a third full, and at night, drawn from the packed sheets.
- `docs/handoff/seat-slots/sheets/`: every final cut-out per room, labeled by seat and activity.

The scripts were written against a scratch folder layout: `backdrops/<place>__<light>.jpg`, `seats/<place>/v*.png` and `m*.png`, `seatfill/xs/<key>.png` and `m-<key>.png`. Point them at `art/backdrops/` and these source folders, or recreate that layout.

## Where I would look first

1. Redo every mask with a real person segmenter (Adobe once its connector is signed in again, or another model) instead of `local_mask.py`. That alone should fix most half-drawn people.
2. Replace head-distance grouping with seat anchors taken from the empty painting (one anchor per chair), so each cut-out snaps to exactly one chair and duplicates can't stack.
3. Check alignment per cut-out, not per picture: compare a ring around each person with the empty painting and drop or re-warp the ones that don't match.
4. Consider drawing the furniture in front as its own layer cut from the empty painting, instead of relying on each version's own occlusion.
