---
id: tests-people-center-face-creator-swatch
title: "people-center-face.browser.mjs waits forever for a clothes swatch the creator no longer shows"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** people-center-face.browser.mjs on main (Oct 28, Shelley, Idaho) times out waiting for [data-testid=engine-appearance-clothes-color] [data-swatch=red] in the character creator, so it never reaches People. The creator's rows are now one color row per garment (jacket, shirt, pants, shoes) with ids like shirt-color, built from src/bench/figure-colors.ts and drawn by src/bench/ui/look-row.mjs as data-testid engine-appearance followed by the row id, and no clothes-color row appears anywhere in src or data. On current main the check's line 34 already clicks the shirt-color row's red swatch (red is in CLOTHES_SWATCHES), so the item may already be fixed and needs one run on a drawn place to confirm.

**Rules.** A check drives the screens a player sees today; never skip or disable it. Replace, never layer: the check's old clothes-color selector is replaced by the creator's current row, not kept as a fallback beside it.

**Done when.** people-center-face.browser.mjs passes on three drawn places with each place and seed named, picking a look through the creator's current controls, and the PR attaches a screenshot of the People web whose center image is the creator's portrait, which the check's final comparison asserts byte for byte.

**Files.** src/bench/people-center-face.browser.mjs

**Notes.** TODO
