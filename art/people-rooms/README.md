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
| `art/people-engine/v2/faces-on-figures/` | Face patches (12 faces per sex, each with its own expression) painted onto the v2 figures' own heads, plus `index.json`. |
| `art/people-engine/v2/figures/v2-sb*.png` + `figures-back.json` | Standing figures seen from behind (facing 180) in base, polo, vest and blazer, for crowds facing away. |
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
- **Facing:** every piece has `facing` (0 front, −45 three-quarter left, +45 three-quarter right, 180 back). Right-facing hair is painted, not mirrored, so side parts sit on the correct side.
- **Color:** the pieces are plain gray, so recolor by luminance, the same way as clothes.

## Faces

- Pick by `view` (front, threeq, threeqr), `face` (1–12) and `sex`; `faceName` and `expression` say what it is.
- Same frame as the figure: lay the face patch on the figure, then the hair on top.
- A patch holds only what the face edit changed, strictly inside the figure's outline, so it never redraws the head outline.
- Gray beards and mustaches take the person's hair color; the skin in a patch recolors like the body.
- Some men got beards Firefly added on its own; that's kept as variety (owner: "just to give the generations variety for now").

## Clothes, skin, outfits

- **Garment map colors:** red = jacket, blazer or vest; yellow = shirt; blue = pants; green = shoes.
- **Recoloring a piece:** new color × (pixel luminance ÷ that piece's median luminance), which keeps the folds and shading.
- **Coverage:** maps mark only pixels that were clothing on the original figure, 95–99.6% of each outfit. Skin, eyes and hair are never touched.
- **Skin:** recolor the warm, non-clothing, non-hair pixels the same way.
- **Clothing picker (owner, Oct 27: "just clicking next"):** keep the body and pose. Next steps through the outfit sheets for that pose, listed in `outfits.json` `byPose`, and each piece keeps its own color.
- **Suits:** the president, governors, lawmakers, judges and candidates on stage wear the blazer, with blazer and slacks in one color.

## Deliveries

- **Oct 27, first:** plates and tagged spots for 4 main-menu scenes; 138 hair pieces; garment maps for 108 figures; outfit tags.
- **Oct 27, second:**
  - Plates and tagged spots for 12 more scenes. Main menu: White House, Capitol, convention floor and stage, rally stage, courthouse rally, Senate, debate stage. Opening rooms: governor's office, living room, bedroom, workforce office. The Oval Office is redone with every couch sitter apart: 16 scenes in all.
  - Hair in every angle: all 12 styles front, three-quarter left and back; three-quarter right painted, not mirrored.
  - Faces with expressions in front and both three-quarter views.
  - Garment maps for every plain-pose outfit sheet.
  - 18 standing figures seen from behind: plain, polo and vest outfits.
- **Oct 27, third (quality gate):**
  - The cutter now rejects edits where Firefly moved the figures (hair drift > 12, face drift > 5, garment coverage < 90% or drift > 16); broken pieces from the second push were removed.
  - Garment maps fill seams the markers missed from the nearest marked piece (8 px), so side panels and waistbands recolor too.
  - The hair cut ignores faint redraw noise on clothing.
  - Added the blazer seen from behind (6 figures, 24 from-behind figures in all), the courthouse rally with a speaker at the gazebo lectern, and the faces and garment maps that passed on re-run.
- **Oct 27, fourth:** front hair style 09 (hair is now complete: 12 styles in front, three-quarter left, three-quarter right and back); garment maps 62 and 74; garment maps for the vest and blazer figures seen from behind (sb20, sb32); the four from-behind sheets themselves under `art/people-engine/v2/sheets-back/`.
- **Oct 27, fifth:** garment maps for the base and polo figures seen from behind (sb45, sb03): all 24 from-behind figures recolor now.
- **Not delivered:** face front 03 (heart-shaped face / round face, laughing). Firefly dropped it three times and moved the figures on the fourth, so it fails the drift gate; 35 of 36 face sets are here.
- **Known:** in governor-office the front visitor and the governor touch and measure as one spot (two Firefly tries drew them overlapping); seat one person there or split it.
