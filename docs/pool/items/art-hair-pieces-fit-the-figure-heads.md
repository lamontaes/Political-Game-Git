---
id: art-hair-pieces-fit-the-figure-heads
title: "Fit the hair pieces to the figure heads so a hair choice changes the figure"
area: art
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/people-hair
pr: #6426
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:07:54.847Z
---

**What.** The 108 hair pieces in art/people-engine/v2/hair are whole painted heads (head, neck, face and gray hair), drawn wider and rounder than the heads of the v2 figures, so no uniform scale and offset sets a piece on a figure (tried on the standing three-quarter figures: neck row, eye row and span, cheek width; the hair landed above, beside or not at all). Style n is the same cut in the front, three-quarter and back pieces (12 feminine, 15 masculine); three-quarter has two sheets per sex, one turned each way (v2-07 and v2-19 turn left; v2-17 and v2-30 turn right). The hair is the unsaturated gray non-skin component of a piece with the dark outline within 2 pixels of it, and a swatch recolor works on it like on clothes (src/bench/figure-colors.ts). This item stores a hand-set fit (scale, dx, dy) per style, sex and facing as data and draws the hair on the figure.

**Rules.** Serves LAW.md section 2, People in rooms and figures (every figure drawn from the person's own appearance record). Follow the asset-scene-admission skill; no raster is enlarged to fit. Replace, never layer: the bald figure is the same record plus a hair field.

**Done when.** In the creator in a drawn place at 1440x900, a Hair row steps through the styles for the chosen body and a hair color swatch row recolors it, and the figure in the preview shows the hair sitting on its head; after Begin the player's figure in the living room wears the same hair; a test over the stored fits checks every style has a fit for each facing and that the fitted hair box overlaps the figure's head box; three screenshots of different styles, with place and seed.

**Files.** src/bench/figure-hair.ts (new), src/bench/data/hair-fits.json (new), src/bench/appearance.ts, src/bench/handler.ts, src/bench/scene.ts, src/bench/play.mjs, art/people-engine/v2/hair

**Notes.** From play-stop-33, 2026-10-27 (lane agent 3). The first attempt (an automatic fit by neck, eye and cheek landmarks) is not kept; the hair-mask idea above is the part that worked. Hours: 4 per style group (feminine, masculine). Unblocks play-stop-33.
