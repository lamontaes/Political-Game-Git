---
id: drives-m1-11-displaced-ambition-under-band-hawi
title: "M1-11 red on the train in Hawi, Hawaii: 2.5% of 199 displaced workers set out to prove themselves, under the 2.6% floor"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: S4, Nov 14, CI golden-path-year on #9144 at 88e119de
checked:
---

**What.** The accepted spec M1-11 fails in Hawi, Hawaii (place key 1513600, seed 0d9fe3b504b883da2589559ef4b3b898c03672995463c9f37b38b1fe82b13473, the golden-path-year draw for #9144's head 88e119de29): "2.5% of 199 displaced workers set out to prove themselves, outside 2.6-31.1% (6-25% with this sample's error)". The check plays a year with the ordinary producers and counts how many job-loss and closure victims take up an ambition. Seen: displaced workers in the played year do not take up an ambition as often as the displaced-worker rate says they should.

**Cause.** Measured: `GOLDEN_PATH_SEED=0d9fe3b5...3473 GOLDEN_PATH_PLACE_KEY=1513600 node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts` gives the same failure on the clean train 2f6da586 as on #9144's head 88e119de (same 2.5% of 199), so neither this PR nor the train's last fold caused it. Needs cause: why this place's displaced workers form fewer ambitions than the band (sample error puts the lower bound at 2.6%, the sample is 5 of 199), which of the drives engine's inputs (age, money, ties) lowers it in Hawaii.

**Fix.** Find the input in `src/core2/modules/drives.ts` that lowers the share in this place and fix it in the engine, never the band.

**Time box.** 2 hours, Opus medium.

**Rules.** No dice: the share comes from the drive's causes, not a rerun until a seed passes; one rule for all 56 places; never loosen the band.

**Done when.** `src/bench/m1-11-check.ts` passes at Hawi, Hawaii with the seed above and in one fresh drawn place (named with its seed). A second session, on main, runs it at both.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/bench/m1-11-check.ts

**Notes.** Related, dropped: drives-displaced-ambition-floor-small-town (the same check red in Playita PR and Bellview FL, since green on main); this is a new place and seed.
