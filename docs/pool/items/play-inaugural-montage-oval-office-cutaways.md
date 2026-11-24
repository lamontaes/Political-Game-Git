---
id: play-inaugural-montage-oval-office-cutaways
title: "The inaugural plays as the Oval Office montage, not on the House floor"
area: play
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: owner, Nov 23 ("A. Keep the inaugural on Jan 20, with the montage back"), carryover N16-39; his Oct 28 cutaways
checked: sonnet 2026-11-23
---

**What.** The owner ruled on Nov 23 that the Jan 20 address stays an inaugural and is staged as one with his Oct 28 cutaways: the Oval Office window, the Resolute desk, America along a route, and the key people named as the camera passes. Before, every address began on the House floor. The owner wants the President at the Oval Office first and the colonnade when the key people are named. Seen: at the first and middle Continue of a new life's opening address.

**Cause.** Found in code: `beatKinds` in `src/bench/montage.ts` keyed the first part to the chamber for every kind of speech, and `src/bench/data/opening-montage.json` had no Oval Office, desk or colonnade beat.

**Fix.** `speeches.inaugural` in `opening-montage.json` sets the first part to the window, an occasion part to the desk and the key people's parts to the colonnade; `beatKinds` and `addressMontage` read it by the opening's `speechKind`. The unpainted South Lawn view and Resolute desk are named first in their lists and fall back to the Oval Office pictures (wanted rows cto-28, cto-33).

**Time box.** 3 hours, one Sonnet session.

**Rules.** Replace, never layer: the one `beatKinds` reads a row per kind of speech, with no second montage. One rule, all 56 places: the national rooms name no place, and the test draws its places from all 56.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, with a screenshot, the inaugural's first beat at the Oval Office with the Speaker and Vice President named, America along a route in the middle, and home last, never the House floor.

**Waits on.** The opening reaching the inaugural in play (item `play-opening-inaugural-lost-to-warm-up`).

**Files.** src/bench/montage.ts, src/bench/data/opening-montage.json, src/bench/story.ts, src/bench/play.mjs
