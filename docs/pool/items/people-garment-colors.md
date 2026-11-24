---
id: people-garment-colors
title: "Each piece of clothing has its own color, from the garment maps, in rooms and in the creator"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/people-garment-colors
pr: #6423
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:56:17.186Z
---

**What.** The owner asked for clothing colors per garment: the vest, the shirt, the pants and the shoes each its own color. Today a person has one clothes color, applied to every unsaturated gray pixel of the figure, which also catches the eyes. The art session painted garment maps for 108 v2 figures (red jacket or vest, yellow shirt, blue pants, green shoes, only on pixels that were clothing). This item gives each person four garment colors on their record, recolors each piece from its map keeping the folds, and gives the creator a color row for each piece the outfit has.

**Rules.** Replace, never layer: the one clothes color on the look record is replaced by four garment colors, and the color-test recolor stays only for figures not yet mapped, inside a registered stopgap and never above the shoulders. Every person drawn is the filled-in person: their garment colors come from their own record or the player's choice.

**Done when.** In a drawn place with a seed, a screenshot of the Oval Office and a home shows people in different jacket, shirt, pants and shoe colors with unchanged eyes; src/bench/figure-colors.test.ts checks each garment changes only its own pixels on the map and the creator offers a color row for each piece the outfit has.

**Files.** src/bench/figure-colors.ts, src/bench/appearance.ts, src/bench/whole-figures.ts, src/bench/handler.ts, art/people-engine/v2/garments

**Notes.** TODO
