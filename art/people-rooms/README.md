# People in rooms: art for the builder

Made Oct 27, 2026 from the owner's mannequin idea (playtest sitting 1). The CTO makes the art; a crew session writes the code. This branch gets more files as Firefly delivers them, and each delivery is listed at the bottom.

## What each folder holds

| Path | What it is |
|---|---|
| `art/people-rooms/plates/<scene>.png` | An edit of `art/backdrops/<scene>__<variant>.jpg` with a flat green (#00FF00) mannequin at every natural spot. **Never drawn in the game.** It exists only to be measured. |
| `art/people-rooms/spots/<scene>.json` | The measured spots, in pixels of the empty painting at its own size, each with the shared tags. |
| `art/people-rooms/tags/<scene>.tags.json` | The scene's zones (desk, couch, crowd, lectern, gallery, aisle) that hand tags to the spots inside them. Edit a zone and re-run `tools/tag_spots.py`; don't hand-edit spots. |
| `art/people-rooms/tools/` | `slots.py EMPTY PLATE OUT.json` measures a plate, `tag_spots.py TAGS SPOTS OUT` tags it, and `spotcheck.py OUT.jpg SPOTS...` draws the boxes for checking by eye. |
| `art/people-engine/v2/hair-on-figures/` | Hair pieces painted onto the v2 figures' own heads, plus `index.json`. |
| `art/people-engine/v2/garments/` | One garment map per v2 figure, plus `index.json`. |
| `art/people-engine/v2/outfits.json` | Outfits by dress level, where worn, role, and which sheet holds each outfit for each pose. |

## Spots: how a person goes into a painting

1. **The room shows only the people who are there** (owner). Spots with nobody in them draw nothing, so the painting shows through.
2. **Pick a figure by the tags.**
   - Match on `pose` (stand / sit / lectern) and `facing`.
   - Facing: 0 = toward the camera, ±45 = three-quarter, ±90 = profile, 180 = back. Minus means the person faces screen-left.
   - v2 figures by angle: front = 0, three-quarter left = −45, three-quarter right = +45, sitting from behind = 180.
   - A park bench at +45 takes the same figures as a couch at +45.
3. **Size and place it.**
   - Scale the figure so its head width equals the spot's `headWidth`.
   - Line up its head top with `headTop` and its head center with `headX`.
   - The figure's own head numbers are in `hair-on-figures/index.json` under `head` = [top, centreX, width], in the figure's own pixels.
4. **Hide what's behind furniture.** For each column, starting at `frontLineX0`, `frontLine` gives the lowest row where the mannequin still showed. Below that row the furniture is in front, so the room is drawn over the figure.
   - This replaces the single horizontal cut (`clipBelowY`) that chops legs today.
   - The depth maps from the helper's research (Depth Anything V2 Small) are the other way to do this, and both can be combined.
5. **Flags.**
   - `touching: true` means two mannequins touched and were measured as one spot. Put one person there, or split it.
   - `tags.check` says the same in words.
6. **Dress and role.**
   - `tags.dress` gives the scene's dress level (formal, business, casual).
   - `tags.role` marks the seat that belongs to someone: `president` at the Resolute desk, `speaker` at a lectern, `presiding` on the rostrum.

## Hair

- **Pick a piece** by `view` (front, threeq, back), `style` (1–12) and `sex`. `styles` in the index lists the names.
- **On the figure it was painted on:** lay it straight on top. It's the same frame as `figures/<figure>.png`.
- **On another figure of the same view:** scale by the ratio of the two head widths, then line up head top and center (`cto-notes/firefly/people-rooms/tools/hairfit.py` on the CTO's Mac does this).
- **Three-quarter pieces face left.** Mirror them for right-facing figures.
- **Color:** the pieces are plain gray, so recolor by luminance, the same way as clothes.

## Clothes, skin, outfits

- **Garment map colors:** red = jacket, blazer or vest; yellow = shirt; blue = pants; green = shoes.
- **Recoloring a piece:** new color × (pixel luminance ÷ that piece's median luminance), which keeps the folds and shading.
- **Coverage:** maps mark only pixels that were clothing on the original figure, 95–99.6% of each outfit. Skin, eyes and hair are never touched.
- **Skin:** recolor the warm, non-clothing, non-hair pixels the same way.
- **Clothing picker (owner, Oct 27: "just clicking next"):** keep the body and pose. Next steps through the outfit sheets for that pose, listed in `outfits.json` `byPose`, and each piece keeps its own color.
- **Suits:** the president, governors, lawmakers, judges and candidates on stage wear the blazer, with blazer and slacks in one color.

## Deliveries

- **Oct 27, first:**
  - Plates and tagged spots: Oval Office (6 spots), House floor (104), Lincoln Memorial at night (26), town-square rally (27).
  - 138 hair pieces: front, three-quarter and back, 23 style sheets.
  - Garment maps for 108 figures (18 outfit sheets).
  - Outfit tags.
- **Coming:**
  - The other seven main-menu scenes: convention floor and stage, rally stage, courthouse rally, Senate, debate stage, White House.
  - The opening rooms: governor's office, living room, bedroom, workforce office, Capitol.
  - A redone Oval Office with the couch sitters apart.
  - The remaining hair styles and garment maps, plus hair painted facing right (three-quarter right), not mirrored.
  - Faces: 12 faces per sex, each with its own expression, in front and both three-quarter angles. Each is a tight patch in its figure's frame, laid on like the hair, and its skin recolors the same way.
  - Standing figures seen from behind, which the crowds facing away need and which don't exist yet.
