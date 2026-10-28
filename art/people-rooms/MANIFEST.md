# Art manifest: people in rooms

Every file on this branch, grouped by room or figure sheet. `manifest.json` has each file with its kind, its room or figure, and the Firefly edit that made it; `edits` there has each edit's reference picture and full prompt.

All generated art: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edit at 1K, editing a picture already in the repo.

## Rooms (plates, spots, tags)

| Room | Plate | Spots | Reference painting | Mannequins asked for |
|---|---|---|---|---|
| oval-office-resolute | plates/oval-office-resolute.png | spots/oval-office-resolute.json (6) | art/backdrops/oval-office-resolute__midday.jpg | one sitting in the chair behind the desk, two sitting on each couch, one in each armchair, and two standing near the desk. |
| us-house-floor | plates/us-house-floor.png | spots/us-house-floor.json (104) | art/backdrops/us-house-floor__midday.jpg | one in every chair and seat on the floor and on the rostrum, all facing the rostrum. The big blue panels nearest the viewer are the BACKS of chairs that face away from the viewer: a mannequin sits on the far side of each of those chair backs, so only its head and shoulders show above the chair back. Two mannequins stand in the center aisle. |
| lincoln-memorial | plates/lincoln-memorial.png | spots/lincoln-memorial.json (26) | art/backdrops/lincoln-memorial__night.jpg | standing on the steps and the plaza in front of the memorial, a scattered group of visitors, smaller the farther away they are. |
| rally-town-square | plates/rally-town-square.png | spots/rally-town-square.json (27) | art/backdrops/rally-town-square__midday.jpg | a crowd standing in the square facing where a speaker would stand, plus one speaker standing at that spot. |

## Hair pieces (`art/people-engine/v2/hair-on-figures/<view>/<style>/<figure>-hair.png`)

Each edit painted one style per sex on all six figures of one bald sheet (three women top row, three men bottom row), so each edit gives six pieces, one per figure id `v2-<sheet>-<f|m>-<slim|medium|heavy>`.

| View | Sheet | Styles delivered (women / men) |
|---|---|---|
| front | 37 | 01 shoulder-length wavy hair / a short cropped cut; 02 long straight hair past the shoulders / a short side-parted cut; 03 a short rounded natural afro / short tight curls; 04 a chin-length bob with straight bangs / a close buzz cut; 06 a neat high bun / slicked-back medium-length hair; 07 a low ponytail / short hair with a receding hairline; 08 a short pixie cut / a classic crew cut; 10 long loose curls / neat cornrows; 12 medium layered hair swept to one side / short hair on the sides with a bald crown |
| threeq | 01 | 01 shoulder-length wavy hair / a short cropped cut; 02 long straight hair past the shoulders / a short side-parted cut; 03 a short rounded natural afro / short tight curls; 04 a chin-length bob with straight bangs / a close buzz cut; 05 long box braids / a low fade with a short textured top; 06 a neat high bun / slicked-back medium-length hair; 07 a low ponytail / short hair with a receding hairline; 08 a short pixie cut / a classic crew cut; 09 shoulder-length locs / short locs; 10 long loose curls / neat cornrows |
| back | 06 | 03 a short rounded natural afro / short tight curls; 06 a neat high bun / slicked-back medium-length hair; 09 shoulder-length locs / short locs; 10 long loose curls / neat cornrows |

## Garment maps (`art/people-engine/v2/garments/<figure>-garments.png`)

One edit per outfit sheet; six maps per sheet, one per figure id.

| Sheet | Figures | Pose and outfit |
|---|---|---|
| 01 | v2-01-f/m-slim/medium/heavy | sit three-quarter left, longsleeve |
| 02 | v2-02-f/m-slim/medium/heavy | stand three-quarter left, shirt |
| 06 | v2-06-f/m-slim/medium/heavy | sit back, longsleeve |
| 08 | v2-08-f/m-slim/medium/heavy | sit front, shirt |
| 13 | v2-13-f/m-slim/medium/heavy | sit three-quarter right, shirt |
| 14 | v2-14-f/m-slim/medium/heavy | sit back, polo |
| 21 | v2-21-f/m-slim/medium/heavy | lectern front, vest |
| 23 | v2-23-f/m-slim/medium/heavy | sit front, vest |
| 26 | v2-26-f/m-slim/medium/heavy | sit three-quarter left, vest |
| 36 | v2-36-f/m-slim/medium/heavy | stand three-quarter right, blazer |
| 37 | v2-37-f/m-slim/medium/heavy | sit front, blazer |
| 45 | v2-45-f/m-slim/medium/heavy | stand front, base |
| 49 | v2-49-f/m-slim/medium/heavy | stand three-quarter right, base |
| 53 | v2-53-f/m-slim/medium/heavy | stand three-quarter right, base |
| 57 | v2-57-f/m-slim/medium/heavy | lectern front, base |
| 61 | v2-61-f/m-slim/medium/heavy | sit front, base |
| 66 | v2-66-f/m-slim/medium/heavy | sit three-quarter left, base |
| 70 | v2-70-f/m-slim/medium/heavy | sit three-quarter right, base |

## Prompts

Hair (style names from the tables above; the view sentence changes per view):

> [hr-front-01] Edit the reference picture. Keep all six people exactly the same: the same pose, position, size, face, body, clothes, outlines and shading, pixel for pixel. Only give each person hair, drawn in the same clean dark-outline style, every person's hair the same plain medium gray. The three women in the top row all have shoulder-length wavy hair. The three men in the bottom row all have a short cropped cut. Everyone faces the viewer. The hair sits naturally on each head at the right size and does not cover the face. Nothing else changes. No text.

Garment maps:

> [gm-37] Edit the reference picture. Keep all six people exactly the same: the same pose, position, size, face, body, outlines and shading, pixel for pixel. Change only the colors of the clothes to flat, pure marker colors: every jacket, blazer or vest pure red, every shirt, top or t-shirt under it (or worn alone) pure yellow, every pair of pants, shorts or skirt pure blue, every pair of shoes pure green. Keep the dark outlines and the folds of the cloth. Skin, eyes, any cup, tablet or papers, and the plain background stay exactly as they are. No text.

Mannequin plates (the room-specific part is in the rooms table):

> Edit the reference picture. Keep the room EXACTLY the same: every wall, window, piece of furniture, chair, desk, couch, rug, object, color, line and the camera angle stay identical, pixel for pixel; do not move, redraw, add or remove anything in the room. Only add people-shaped placeholders: smooth mannequins with no face, no hair, no clothes and no details, painted one flat pure bright green (#00FF00, like a green screen) with no shading and no outline, {mannequins asked for} Every mannequin is a realistic adult size for its place in the room, about seven and a half heads tall, sitting fully down on the seat with its back against the chair back, thighs on the seat, or standing with both feet on the floor; nothing floats, nothing stands on furniture. Chairs, desks and furniture in front of a mannequin hide the parts of it behind them. No other changes. Same art style. No text.
