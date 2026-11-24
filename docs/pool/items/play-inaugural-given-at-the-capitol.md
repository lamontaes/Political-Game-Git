---
id: play-inaugural-given-at-the-capitol
title: "The inaugural is given at the Capitol, with the Oval Office as a cutaway of the President alone"
area: play
kind: bug
priority: 1
size: S
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
source: CTO send-back (comment 7125269509), owner Nov 23: the speech plays with cutaways to the President at work in the Oval Office
checked: sonnet 2026-11-24
---

**What.** The inaugural's first part staged the speech inside the Oval Office with the Speaker and Vice President standing there, while its greeting addresses the Chief Justice and Congress. The owner said the speech plays with cutaways to the President at work in the Oval Office. The speech belongs at the Capitol and the Oval Office is a cutaway of the President alone at the desk. Seen: at the first Continue of a new life's opening address.

**Cause.** Found in code: `speeches.inaugural.first` in `src/bench/data/opening-montage.json` was `window`, an Oval Office beat, and `addressMontage` in `src/bench/montage.ts` drew the key people the part names into every beat but home.

**Fix.** `first` becomes `stand` (the Capitol's inaugural stand, named first in its list and falling back to `us-capitol-exterior` until painted, wanted row address-3), the Oval Office is the `desk` beat with the President alone, and the country and people parts alternate America along a route with the desk (`alternate` in the same file, read by `beatKinds`). The `window` beat is deleted.

**Time box.** 2 hours, one Sonnet session.

**Rules.** Replace, never layer: the `window` beat and its list are deleted, and the one `beatKinds` reads the row. One rule, all 56 places: the national rooms name no place, and the tests draw their places from all 56.

**Done when.** A second session sees, in the running game, in a drawn place from all 56 and with a screenshot, the inaugural's first beat at the Capitol with the Chief Justice, Speaker and Vice President named, and a later beat in the Oval Office with the President alone at the desk, with the LIVE corner unchanged and no beat on the House floor.

**Waits on.** The painting of the inaugural stand (a wanted row), which falls back to the Capitol's exterior meanwhile.

**Files.** src/bench/montage.ts, src/bench/data/opening-montage.json, src/bench/data/scene-places.json, docs/art/WANTED.md
