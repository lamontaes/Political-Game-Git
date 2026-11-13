---
name: room-spots
description: How a room picture for Our Civic Duty is painted in the standard camera with spots where people may stand or sit, how each spot is measured (pose, angle, head, feet, desk edge, furniture in front, depth order), and how a filled room is checked by eye before anyone sees it. Use when painting or repainting a backdrop, adding spots, sizing people at a desk, couch or window, or judging whether people sit and stand in a room believably. Not for the pack's rows or the game's loader (people-pack) or for admitting a backdrop to the game (asset-scene-admission).
---

# Rooms and their spots

**Set aside until after early access (owner, Nov 10 and 11, 2026).** Rooms draw no figures now: a room is its painting, and the people in it are a strip of busts (`src/bench/ui/bust-strip.mjs`, `peopleHere` in `src/bench/scene.ts`). Nothing in this skill is built or fixed while busts are the system. `docs/art/full-body-people-after-early-access.md` says what was removed, where the last working copy is, and how the work comes back. The methods and traps below are kept for that day.

Owner, Oct 29: "5 angles per pose and have those 5 angles be able to be used throughout the game"; two standard shots per place (wide and medium) with the same eye-level camera and horizon; Firefly paints the room empty. Oct 28: "do not put people in until there are mannequins in there for every position" (positions are still required first); Nov 3: "Delete that mannequin." The green mannequin pictures are gone and seats are blobs, positions only (`art/people-rooms/mannequin-plates/README.md`). Oct 29, on couches: "They have to sit on the seat, but it has to appear behind the arm thing."

The tools and the worked Oval Office are on the art branch under `art/people-rooms/standard/` (`tools/`, `PLAN.md`); that folder is not on main, so fetch the art branch before using them, and if it is gone say so on the item's pull request.

**Busts are coming (owner, Nov 10, about 8:40 a.m.):** "I'm not necessarily worried about the staging code now because you're going to be making busts. I haven't decided how they're going to display yet." Do not file or reopen full-body staging defects (who stands where, people blocking each other) and do not paint new full-body room sets for them until he rules on how busts are shown; check `docs/coordination/OWNER-DECISIONS.md` for that ruling first. The plate rules below stay true for the rooms that already have plates (`people-pack`).

## The standard camera

- Eye level at standing height: the horizon is 40% of the way down the picture, 16:9.
- Wide shot floor rows (feet) at 92%, 77% and 63% of the height; the medium shot is closer (front row cut at the knees).
- Five angles per pose: front, front three-quarter left and right, back three-quarter left and right, each its own drawing, never mirrored. The pose library has nine poses at those angles.

## Painting a room

1. **Template:** a gray one-point room box on the standard horizon, brown blocks for desks (top at a seated person's waist), tan blocks for seats (top at their hips), plain gray blobs at the grid spots. A blank gray canvas with only a horizon line fails: Firefly copies the style picture's camera.
2. **Paint** from the template with an existing game painting as the style reference only ("do not copy its camera or layout"). Without a style picture the style drifts and lettering appears.
3. **Fix at full size with edits** (picture frames to plain glass, feet down to the floor), then copy back only the changed area onto the original so nothing else moves.
4. **Empty room:** the finished painting has no figures, blobs or green in it. Nothing is removed afterward, so no ghosts or shoe shadows are left to check.

**Other lights of a finished room.** A room's night, morning, midday and rain pictures are one painting re-lit when the furniture and camera have not moved. Check it before a plate serves them (the plate's `backdrops` list): same size, and their edges line up (downscale both, find edges, correlate; the house living rooms scored 0.93 to 0.98, Oct 29). A condition picture (lived-in, rundown) puts things on or in front of the seats and gets its own plate. `people-pack.test.ts` refuses a `backdrops` entry that is not a light of the same place and size.

## Spots for many people (`blobs.py`)

- Lay library silhouettes (gray with a dark rim) on the finished empty room as blobs, one group of spots that do not overlap at a time. The silhouette fixes each spot's pose and angle; the blob's place on the furniture fixes how it sits. Nothing is painted green.
- **Couches:** put the hips on a seat cushion, never on the rolled arm. Check the blob first: a blob on an arm puts every person there on the arm (Oct 29, the owner caught it).
- **Read the spots** (`export_multi`): each blob is matched to its silhouette. A blob whose lower body furniture hides (behind a desk) takes its height and feet from the silhouette, and the band from where it disappears down to the floor, wider than the person, is the cutout. Differences between a silhouette and its blob are never furniture: they slice arms and legs off.

## Measuring by eye, and depth

- **Size from things of known size.** A seated adult's head sits about 0.3 of a big desk's front length above the desk top; a person standing behind a desk is taller than its chair back. Firefly drew the wide-shot President 20 to 40% small; size desk spots from the painted desk (`export.desk_width`).
- **Height from the floor row:** standing height grows with the distance of the feet below the horizon; measure the factor from the room's own measured spots (the Oval wide: about 1.2 times feet-minus-horizon standing, 0.76 seated).
- **Depth order:** draw people from the farthest to the nearest (smallest feet row first) so nearer people overlap farther ones. Two people on one couch read naturally; three is a squeeze.
- **Furniture in front:** a `front` mask is furniture that crosses the body (at least 35% of its width: a desk edge, a couch arm, a table) and hugs the spot's own outline. Room seen through the gap between legs or between an arm and the body is never in front.
- **Desks:** draw desk sitters behind a flat gray table, so forearms and hands lie on the desk as drawn. Adobe's background removal keeps the drawn table; its prompt selection ("the five men") gives the people only but with a loose edge, so the person is where both agree, and the table's top row is `deskTop` (`v4.add_desk_cutout`). Cutting a figure drawn without a desk at the desk edge either clips the arms or lets the wood show through (Oct 29, owner: "the hands and the arms aren't lined up. And the wood is still going through").
- **Cut people with Adobe, never by keying the sheet gray** (Oct 29, owner: "why don't you just use the image removal tool? On Adobe"): Adobe's background removal on the whole sheet (one call each, or Firefly's Creative production batch page), then `v4.add(..., cutout=)` only splits the figures and subtracts the known sheet gray from edge pixels. Keying left gray rims, gray between arm and body, and shaved fingertips.
- **Seated strips:** the straight-on figure of a seated strip must itself be seated and the hands must rest on the thighs (or lie on a drawn desk). Oct 29: all three seated strips had a standing middle mannequin and the couch strip held its arms out, so models that copy the picture stood people up and drew arms reaching across the next person. A redrawn cell goes in `mqlib/overrides.json` under `replace`.
- **Colors of one look:** a tie, jacket or dress in another color is the same drawing recolored by Adobe: select the garment by prompt, shift its hue (or set a target color for gold, white and grays) on that mask, then put the dark drawn outline back (`v4.keep_outlines`). Nothing outside the garment changes, so the face and pose stay identical.

## Check before showing (`preview.py`)

Fill the room from pack figures on its spots and look at every person at full size: hips on the seat, feet on the floor, nobody on an arm or floating, heads where the spots put them, whole fingers, no sheet-gray rim or trapped gray between an arm and the body, no green left in the empty room, frames with no faces, nobody holding a prop the scene does not call for.

## Plate for a workplace room in an hour (Nov 8, Small fixes)

- A workplace room with no plate draws nobody: `visitPlace` returns its staff in `names` and `unplaced: [{reason: "no-plate"}]`. Find the rooms a town uses with `POST /api/goto/visit?org=<id>` after a dev jump to noon, and read each `backdrop.file` and `unplaced`.
- For open-floor spots a plate needs only a horizon and a floor row: with the horizon at 40% of the picture height (376 on a 941 picture), a standing person with feet at row `f` is `1.205 * (f - 376)` tall, head top `f - height`, head width `height * 60 / 512`, box width `0.24 * height` (checked against the old coffee-shop spot: feet 801 gives head top 289 and width 60). Pick `pose`, `facing` and `seat` from the pack's real combinations (`stand`, `walk`, `gesture`, `fold` at 0, 45, -45, with seat `none`); keep spots on bare floor, not behind a counter, shelf or desk, and skip seats behind furniture until a `front` mask exists.
- List another light in `backdrops` only after an edge correlation with the midday painting scores 0.9 or more at 418 by 235 (the lights of one painting score 0.92 to 0.99; a different painting scored 0.03); the general store's morning and rain are other paintings and get no plate.
- Check the filled room in the running game, not in a test: visit the room at noon and look at feet, scale and overlaps. `people-pack.test.ts` may not load on main.
- Trap: moving new plate files with `mv *.mannequins.json` moves the existing plates too, and `git add -A` then commits their deletion. Copy files by name and `git add` them by name.
