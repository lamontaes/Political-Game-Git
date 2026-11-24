---
id: words-address-event-lines-unplayed
title: "Three of the Words lead's address event lines came out unplayed: the closing that cost jobs and the two disaster lines"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Desk, Nov 16, pressed walks for words-addresses-are-scenes-with-ties
---

**What.** Thirty pressed walks at the address step-3 head never reached a disaster in the past year or a closing whose line named lost jobs, so three new event lines were taken out unplayed. The facts they need are still made by the planner.
Seen: Santa Rosa, New Mexico, seed 2624d83b-7513-4e4b-8155-249aa71b8d3a, and 29 other pressed walks, four closings and no disaster.

**Cause.** Measured: at 30 drawn places, seed in each walk's first line, by `node .probe/walk.mjs` against the bench at the step-3 head: src/director/speech-outline.ts `conditionFacts` found a disaster in none, and a closing in four, all said with the closing line that needs no jobs fact. Three openings at Ferriday LA, Barton NM and Holyoke MA held no closure record by January 22 at all.

**Fix.** Add back, as the Words lead wrote them, "We lost {condition-closure} this year, and people here lost their jobs with it." (requires condition-jobs-ended), "The {condition-disaster} hit us hard this year." and "Nobody here has forgotten the {condition-disaster}." (both local), each with tie record, once a pressed walk shows each said: find a place whose opening holds a declared disaster or a closing with ended jobs by drawing places through the walk and waiting (skill drawn-place-tests).

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Wire to the world: each event line says only what the place's own closure or disaster record holds, never more.

**Done when.** In a drawn place with a seed nobody chose, a pressed town or governor's address says each of the three lines, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** data/english/parts/opening-speech.json, src/director/speech-outline.ts
