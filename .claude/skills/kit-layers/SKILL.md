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

## Fixing

- **Restore before re-fixing:** if a fix goes wrong, put the layer back from the art branch first. A second fix on top of a bad one compounds it.
- **The body layer is the whole bare body under the clothes,** skin everywhere. Never find hands as "skin in the body layer"; that takes the whole torso.
- **A lap hand:** move the solid skin piece from the trousers layer to the body layer, then its fingertips (pixels touching the hand that are closer to the skin color than to the cloth color; brown cloth is warm too, so never use warmth alone), then its own dark outline.
- **A top that holds the legs:** the trousers own their solid pixels (alpha 200 and up). The top keeps covering the trousers' soft top edge, or a line of skin shows at the waist. Then trim the top to the sweater: pixels close to its own color, its outline, never the shoes. Hair that lived only in the top goes back into the body layer: men's hair is drawn, not recolored.
- **Prove it:** rerun the checker (0 flags), render the loud sheet, and run the checker on the old files to show it would have caught them.
