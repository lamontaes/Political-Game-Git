---
id: play-rate-unit-says-per-year-on-a-bill-that-is-not-per-year
title: "A property tax rate reads 'of home value' on the card and 'of home value per year' on the bill's estimate"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
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

**Cause.** Needs cause. Read first: the estimate's unit in `billEstimate` in src/bench/play.mjs, and the card's `amount(item.today.value, item.today.unit)`; check whether two unit tables word one unit.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** Words for units come from the screen words in controls.json, never typed in the screen.

**Done when.** A second session, in a played world in a place and seed nobody chose, reads the same screens and sees one wording on all of them.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json
