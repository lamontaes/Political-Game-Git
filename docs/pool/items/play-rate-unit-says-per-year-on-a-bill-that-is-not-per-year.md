---
id: play-rate-unit-says-per-year-on-a-bill-that-is-not-per-year
title: "A property tax rate reads 'of home value' on the card and 'of home value per year' on the bill's estimate"
area: play
kind: bug
priority: 3
size: S
status: merged
claimed-by:
pr: #9392
blocked-on:
standard: 2
model: sonnet
effort: low
lead: words
root: rc10-screens-keep-own-facts
source: Account lead cluster 11 play walk, Nov 14 (Pearl City, Hawaii, seed 28098917-e63b-4362-bc91-939537321d7e, Ordinance 2025-3)
claimed-at:
after:
checked:
---

**What.** The draft card and the issues list say the property tax rate in force is "0.28% of home value". The same bill's estimate boxes say "0.31% of home value per year" and "0.34% of home value per year". A rate worded two ways in one flow reads as two different things. Seen: the bill paper's "What it would do" boxes and the draft card in the Your office tab, Politics ring.

**Cause.** Found in code: the bill catalog spells the property tax rate's unit as the phrase "percent of home value per year" (src/core2/data/legislature/bill-catalog.json), while the law row the town holds is "percent-of-home-value" (`laws-starting.ts`, line 174); a section's `after.unit` is `p.unit ?? before.unit` (`billSections`, src/core2/modules/legislature.ts near line 2292), so the estimate's two boxes take two spellings and `amount()` in src/bench/play.mjs words them "of home value" and "of home value per year".

**Fix.** A section says its amount in the law's own unit (`unit: before.unit ?? p.unit` in `billSections`), and the catalog row, the starting-law source row and the calibration fixture spell the unit the law's way, "percent-of-home-value". The player sees one wording in the two boxes of "What it would do".

**Time box.** 2 hours for one Sonnet session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** Words for units come from the screen words in controls.json, never typed in the screen.

**Done when.** A second session, in a played world in a place and seed nobody chose, reads the same screens and sees one wording on all of them.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json
