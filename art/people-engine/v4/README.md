# People pack v4

Owner, Oct 29: "ship the next model of people so those can start getting plugged into the game." Pack v4 replaces v3 (the `people-pack` skill: a new version replaces the old folder in the same PR, never layered). It holds every v3 row and file unchanged, plus people drawn on the standard library poses.

## What is new

- **Five angles per pose** (owner, Oct 29): `angle` is `front`, `tq-left`, `tq-right` (front three-quarter turned toward screen left or right), `btq-left`, `btq-right` (seen from behind, turned left or right). `facing` keeps the v3 numbers: 0, -45, 45, -135, 135 (minus is screen left). Every angle is its own drawing, never mirrored.
- **New poses:** `stand` (relaxed), `gesture` (standing, talking with an open hand), `fold` (arms folded; same name as v3), `couch` (seat `couch`, sitting back on a couch seat), `address` (at a desk, seen straight on; same name as v3).
- **Same person, many looks:** each person has looks in several outfits and hairstyles (`outfit`, `outfitLabel`, `hair`). Example: `man-medium` in `suitnavy` (red tie, at the desk), `suitgray` (no tie, on a couch), `shirtsleeves` (sleeves rolled, loosened tie). Ties and colors change by drawing a new look, never by recoloring a look.
- **Desk figures** (`pose: address`, `handsRestOnDesk`, `drawnBehindTable`): drawn behind a plain table that was keyed out, so the forearms and hands lie on the desk top as drawn, fingertips whole. `hands` is the row where the hands rest. Fit them head top to `hands` like v3 (`people-pack` skill); nothing below the hands is drawn.
- **Props** (owner, Oct 29: no accessories unless the scene calls for them): v3 rows that hold something carry `prop` (`phone`, `paper`, `pen-paper`); the new rows hold nothing.
- **Skipped** (in `skipped`): straight-on seated figures that came out standing, and figures drawn at a desk with no desk. They return as rows when redrawn.

## The standard rooms

`art/people-rooms/mannequin-plates/oval-office.mannequins.json` (the wide shot, 14 spots) and `oval-address-standard.mannequins.json` (the address) are ordinary plates with `"standard": true` and `"pack": "v4"`. Their backdrops are next to them (`oval-office-standard__midday.png`, `oval-address-standard__night.png`); add both to `art/backdrops/manifest.json`. They replace `oval-briefing` and `oval-address`.

- Spots: the President at the desk (`address`, `role: president`), six couch cushions (`couch`, three per couch, turned toward the middle of the room), five standing spots at different angles (one at the right window looking out), and the President standing in front of the desk or behind it (`role: president`; behind it, `front` is the desk drawn back over the legs).
- Desk spot sizes already follow the painted desk (a seated adult's head sits about 0.3 of the desk's front length above the desk top), so the v3 fit gives the right size with no code change.
- `pictures`: picture frames painted as plain glass; fill each box with a photo of the room owner's family (the owner, Oct 29). Until that is wired they show glass.
- Depth: draw spots from the farthest to the nearest (smallest `feet` row first), so nearer people overlap farther ones. On one couch, near and far together read as two people side by side; all three cushions at once is a squeeze.

## Adding to it

More looks, people or poses are more rows (the `people-pack` skill). How rooms and their spots are made, measured and checked is the `room-spots` skill.
