---
name: room-spots
description: How a room picture for Our Civic Duty is painted in the standard camera with spots where people may stand or sit, how each spot is measured (pose, angle, head, feet, desk edge, furniture in front, depth order), and how a filled room is checked by eye before anyone sees it. Use when painting or repainting a backdrop, adding mannequin spots, sizing people at a desk, couch or window, or judging whether people sit and stand in a room believably. Not for the pack's rows or the game's loader (people-pack) or for admitting a backdrop to the game (asset-scene-admission).
---

# Rooms and their spots

Owner, Oct 29: "5 angles per pose and have those 5 angles be able to be used throughout the game"; two standard shots per place (wide and medium) with the same eye-level camera and horizon; Firefly paints the room with green mannequins first and an edit removes them. Oct 28: "do not put people in until there are mannequins in there for every position." Oct 29, on couches: "They have to sit on the seat, but it has to appear behind the arm thing."

The tools and the worked Oval Office are on the art branch under `art/people-rooms/standard/` (`tools/`, `PLAN.md`).

## The standard camera

- Eye level at standing height: the horizon is 40% of the way down the picture, 16:9.
- Wide shot floor rows (feet) at 92%, 77% and 63% of the height; the medium shot is closer (front row cut at the knees).
- Five angles per pose: front, front three-quarter left and right, back three-quarter left and right, each its own drawing, never mirrored. The mannequin library (`mqlib/`) has nine poses at those angles.

## Painting a room

1. **Template:** a gray one-point room box on the standard horizon, brown blocks for desks (top at a seated mannequin's waist), tan blocks for seats (top at its hips), library mannequins at the grid spots (`template.template2`). A blank gray canvas with only a horizon line fails: Firefly pastes the mannequins on like stickers and copies the style picture's camera.
2. **Paint** from the template with an existing game painting as the style reference only ("do not copy its camera or layout"). Without a style picture the style drifts and lettering appears.
3. **Fix at full size with edits** (picture frames to plain glass, feet down to the floor), then copy back only the changed area onto the original so nothing else moves.
4. **Empty room:** an edit removes the mannequins. Make two and use the clean one: removals can leave see-through ghosts and shoe shadows. Copy back the mannequin areas plus what changed near them, matched in tone and feathered, never the frames.

## Spots for many people (`blobs.py`)

- Lay library silhouettes (gray with a dark rim) on the finished empty room, one plate per group of spots that do not overlap, and have Firefly repaint them as green mannequins in the furniture (prompt in `PLAN.md`). The silhouette fixes each spot's pose and angle; Firefly fixes how it sits in the furniture.
- **Couches:** put the hips on a seat cushion, never on the rolled arm. Check the mannequin plate first: a mannequin sitting on an arm puts every person there on the arm (Oct 29, the owner caught it).
- **Read the spots** (`export_multi`): each green mannequin is matched to its silhouette. A mannequin Firefly moved lower (in front of furniture) gets no cutout. A mannequin whose lower body furniture hides (behind a desk) takes its height and feet from the silhouette, and the band from where it disappears down to the floor, wider than the person, is the cutout. Differences between a silhouette and its mannequin are never furniture: they slice arms and legs off.

## Measuring by eye, and depth

- **Size from things of known size.** A seated adult's head sits about 0.3 of a big desk's front length above the desk top; a person standing behind a desk is taller than its chair back. Firefly drew the wide-shot President 20 to 40% small; size desk spots from the painted desk (`export.desk_width`).
- **Height from the floor row:** standing height grows with the distance of the feet below the horizon; measure the factor from the room's own painted mannequins (the Oval wide: about 1.2 times feet-minus-horizon standing, 0.76 seated).
- **Depth order:** draw people from the farthest to the nearest (smallest feet row first) so nearer people overlap farther ones. Two people on one couch read naturally; three is a squeeze.
- **Furniture in front:** a `front` mask is furniture that crosses the body (at least 35% of its width: a desk edge, a couch arm, a table) and hugs the mannequin's own black outline. Room seen through the gap between legs or between an arm and the body is never in front.
- **Desks:** draw desk sitters behind a flat gray table, so forearms and hands lie on the desk as drawn. Adobe's background removal keeps the drawn table; its prompt selection ("the five men") gives the people only but with a loose edge, so the person is where both agree, and the table's top row is `deskTop` (`v4.add_desk_cutout`). Cutting a figure drawn without a desk at the desk edge either clips the arms or lets the wood show through (Oct 29, owner: "the hands and the arms aren't lined up. And the wood is still going through").
- **Cut people with Adobe, never by keying the sheet gray** (Oct 29, owner: "why don't you just use the image removal tool? On Adobe"): Adobe's background removal on the whole sheet (one call each, or Firefly's Creative production batch page), then `v4.add(..., cutout=)` only splits the figures and subtracts the known sheet gray from edge pixels. Keying left gray rims, gray between arm and body, and shaved fingertips.
- **Seated strips:** the straight-on figure of a seated strip must itself be seated and the hands must rest on the thighs (or lie on a drawn desk). Oct 29: all three seated strips had a standing middle mannequin and the couch strip held its arms out, so models that copy the picture stood people up and drew arms reaching across the next person. A redrawn cell goes in `mqlib/overrides.json` under `replace`.
- **Colors of one look:** a tie, jacket or dress in another color is the same drawing recolored by Adobe: select the garment by prompt, shift its hue (or set a target color for gold, white and grays) on that mask, then put the dark drawn outline back (`v4.keep_outlines`). Nothing outside the garment changes, so the face and pose stay identical.

## Check before showing (`preview.py`)

Fill the room from pack figures on its spots and look at every person at full size: hips on the seat, feet on the floor, nobody on an arm or floating, heads where the mannequin's were, whole fingers, no sheet-gray rim or trapped gray between an arm and the body, no green left in the empty room, frames with no faces, nobody holding a prop the scene does not call for.
