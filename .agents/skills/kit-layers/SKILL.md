---
name: kit-layers
description: How the recolorable (kit) people figures are split into layers (body, shoes, trousers, top, hair) and how to find and fix the splits that make clothes colors run onto hands, legs, hair or shoes. Use when importing or splitting a kit figure, when a person in the game shows a hand, hair or shoes in a clothes color or a line of skin at the waist, and before shipping any pack. Not for whole drawn looks (never recolored) or for placing people in rooms (room-spots, people-pack).
---

# Kit figure layers

Owner, Oct 28 and again Oct 29 after seeing the game: "sleeves are bleeding into people's hands." A kit figure is stacked body, shoes, trousers, top, hair, and the game recolors trousers and top. Any part of the person that sits in a clothes layer takes the clothes' color.

## Check every pack

`art/people-engine/<pack>/tools/kit_layers_check.py <pack dir>` must report 0 flags. With `--sheet out.jpg` it renders the flagged figures in loud test colors (green trousers, magenta top); look at hands, hair, shoes and the waist at full size. It flags:

- **hand-in-clothes:** one solid piece of skin in the trousers or top layer, usually a hand resting on the lap. Khaki trousers match skin too, but only as scattered shading, so the test is one big solid piece.
- **top-holds-legs / top-holds-shoes:** a broken split where the top layer holds the whole outfit (Oct 29: all ten of the heavy man's pose-sheet figures).
- **waist-gap:** bare body showing in a run across the body between the top's hem and the trousers.
- **Hair** (owner, Oct 29: "and hair"): `hair-in-top` (strands over the shoulders in the top layer take the sweater's color: "green on the woman's long hair"), `hair-in-body` (strands left in the body layer keep their old color when the hair is recolored, so the hair goes two-tone), `top-in-hair` (sweater inside the hair layer takes the hair's color; Oct 29, woman-heavy r09's neckline). Fix by moving the piece and its outline to the layer whose color it is. The loud sheet paints hair orange.

## Fixing

- **Restore before re-fixing:** if a fix goes wrong, put the layer back from the art branch first. A second fix on top of a bad one compounds it.
- **The body layer is the whole bare body under the clothes,** skin everywhere. Never find hands as "skin in the body layer"; that takes the whole torso.
- **A lap hand:** move the solid skin piece from the trousers layer to the body layer, then its fingertips (pixels touching the hand that are closer to the skin color than to the cloth color; brown cloth is warm too, so never use warmth alone), then its own dark outline.
- **A top that holds the legs:** the trousers own their solid pixels (alpha 200 and up). The top keeps covering the trousers' soft top edge, or a line of skin shows at the waist. Then trim the top to the sweater: pixels close to its own color, its outline, never the shoes. Hair that lived only in the top goes back into the body layer: men's hair is drawn, not recolored.
- **Sweater color in the hair** (Oct 29: "i see green on the woman's long hair"): a woman drawn in a green sweater keeps specks and chunks of that green on her hair's ends in the hair layer, and they show against any other sweater color. `sweater-hue-in-hair` judges by hue alone, since the pieces are shaded lighter or darker than the sweater. Take them out of the hair layer (the sweater layer shows beneath, or the piece moves to it). Never recolor them to the hair's color: a chunk of sweater recolored is a gray chunk hanging off the hair.
- **Props drawn in a clothes layer** take the clothes' color (a pen drawn in the top turns sweater-colored); they belong in their own layer.
- **Prove it:** rerun the checker (0 flags), render the loud sheet, and run the checker on the old files to show it would have caught them.
