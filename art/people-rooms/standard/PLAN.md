# The standard: backgrounds, mannequins and people (owner, Oct 29)

Rulings (OWNER-DECISIONS Oct 29 16:30 UTC): every pose at 5 angles (front, 3/4 left, 3/4 right, back-3/4 left, back-3/4 right; never mirrored); two standard shots per place (wide, medium) with the same eye-level camera and horizon; Firefly paints each room WITH green mannequins, then an edit removes them; first batch = golden path rooms in order + region/size versions + people at 5 angles (pack v4, with six second faces). Owner, same day: "Just make sure these people don't look like superheroes."

## 1. Mannequin pose library (master)
- Firefly, Nano Banana 2 (Gemini 3.1) at 1K (free), Square, reference = `scenario-kit/woman-medium-8dir.png` (8-angle sheet). Prompt `__mqPose` in the Firefly tab: "Redraw the reference sheet with the same layout: every figure replaced by a simple green mannequin... same place, same angle... gender-neutral, artist's-mannequin forms, no chest/buttock/muscle detail, ordinary proportions... pose: X. Seated sits on nothing."
- Copying the 8-angle sheet's layout is what makes the angles right (a free 5-in-a-row prompt gave two identical 3/4 views).
- Sheet layout: top row back-3/4 left, back, back-3/4 right; middle left/right profiles; bottom row front-3/4 left, front, front-3/4 right. The five used: bottom left, bottom center, bottom right, top left, top right.
- Poses: stand, talk, fold, clap, walk, sit, sitdesk, couch, lectern. Files: `cto-notes/scenario/mqlib/<pose>.png`; rejects in `mqlib/first-try/`.
- **The 8-angle people sheet is a bad layout reference:** its two front three-quarter figures both turn to screen right, and Firefly copies that, so most first sheets had two identical three-quarter views. Fixed reference: `mqlib/ref-standing.png` (the folded-arms mannequin sheet with its bottom-right figure replaced by the bottom-left one flipped, so one turns left and one right). Seated poses use the passing `sitdesk.png` as their reference: a standing reference makes Firefly keep the standing legs and add a seated pair.
- Style: plain jointed wooden mannequin (ball joints, no chest or buttock shapes); the sheets drawn in the smooth "body" style were redone.
- **Check every sheet** with `standard/check_lib.py out.jpg <pose...>` (the five used angles side by side) and the left/right score: for each pair (tq, btq) the right figure flipped must be closer to the left one than the unflipped right one (`mirror < same`), or the two face the same way. The score misses a front cell left standing in a seated sheet and shuffled cells, so look at the row too.

## 2. Standard camera (both shots, 16:9)
- Eye-level camera at standing head height: the horizon at 40% of the frame height; a standing adult's head top sits at the horizon wherever they stand.
- Wide shot: floor rows with feet at 92% (front), 77% (middle), 63% (back) of the height; standing height in pixels = 1.06 × (feet y − horizon y).
- Medium shot: same horizon; front row feet below the frame (people cut at the knees), middle row feet at 95%.
- Spot grid (wide): front left/right, middle left/center/right, back left/right; poses and angles chosen per room (audience rooms: back-3/4 toward the speaker; conversations: 3/4 facing each other; speakers: front).

## 3. Room pipeline (mannequins first)
1. Template (`template.template2`, specs in `rooms.py`): a gray one-point-perspective room box drawn on the standard horizon (back wall, side walls, floor), brown blocks for furniture that must hide a body (a desk block whose top is at a seated mannequin's waist), and the library mannequins at the grid spots and angles; JSON of pose/angle per spot.
   - Oct 29 test 1 failed: on a plain gray canvas with only a horizon line, Firefly pasted the mannequin like a sticker (in front of the desk it painted, chair empty behind) and copied the style picture's camera. The room box and desk block give it the camera and the depth order to paint into.
2. Firefly: "Paint a <room description, region, size, condition, time> around these green mannequins; keep each mannequin exactly where it is, sitting or standing in the furniture; horizon at the line; same art style" → the plate.
3. Firefly edit of the plate: "remove every green mannequin, paint what is behind" → the empty room.
4. Detect the mannequins in the plate (green), match each to its template spot (pose, angle), write `<room>.mannequins.json` + front masks (`intro/mannequins.py export_spots`).
5. Check: plate and empty room line up; mannequins in furniture; people fitted look right at full size (people-art-checks).

## 4. People pack v4
Each of the six people (then six second faces) redrawn on each library pose sheet (reference = the mannequin sheet + the person's 8-angle sheet): same angles, the person's own face and clothes; formal looks the same way. Ordinary bodies, never superheroes.

## Order of rooms (golden path)
Opening: Resolute desk address (close), Oval Office wide, colonnade, depot/route places, people pausing (diner counter, porch, fire station, factory floor, a family at the TV); home rooms by dwelling and condition; Main Street, coffee shop, park, community room; clerk counter, county clerk offices (big and small); doorsteps (suburban/urban/rural, worn and nice); polling place (school gym, church hall, fire station, library); election-night hall (rented hall, storefront); morning-after home; council chamber (small, town, city), county commission.
Each in wide + medium, then region and town-size versions.

## Status
- Oct 29 1:15 p.m. EDT: **library done** (9 poses × 5 angles, `mqlib/`, `overrides.json` swaps lectern's 3/4 pair). **Oval Office address shot done**: `plates/oval-medium.plate.png` + `.empty.png` + `.mannequins.json` (desk spot, 4 picture-frame spots). Wide shot: room box + desk block + seat blocks (`templates/oval-wide-v3`), painted (`oval-wide-e`), couch sitters' feet edited down to the floor (`feet-a`, legs composited back only), empty edit running. Tools: `rooms.py`, `template.template2` (room box, desk/seat blocks), `export.py` (spot JSON from plate), `preview.py` (pack figures on spots).
- How a finished shot is made: paint from the room-box template with the old painting as style picture only → fix at full size with edits (frames to plain glass, feet to the floor) → copy back only the changed areas → empty edit → copy back only the mannequin areas (never the frames) → `export.py` → `preview.py` check.
- Oct 29 12:45 EDT: pass = clap, walk, sitdesk. Redrawing stand, talk, fold, lectern from ref-standing (`__mq3`), then sit and couch from sitdesk (`__mq4`). `template.strip(pose)` makes the five angles in a row at 16:9 (each figure about 700 px tall), the layout reference for drawing people in pack v4.
- Oct 29 16:30 UTC: library pilot ok (stand8); 9 poses queued in the Firefly tab (`__mqqlog`).
