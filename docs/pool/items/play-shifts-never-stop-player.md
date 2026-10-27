---
id: play-shifts-never-stop-player
title: "Work shifts never stop the player: no 'Shift starts' or 'Shift ends' stop on Day or Week"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: words/shifts-never-stop
pr: #6206
blocked-on:
source: "owner, Oct 26 playtest ruling, built by the words-and-scenes lead (deliverable 3 of docs/work-orders/lead-words-scenes-2026-10-26.md)"
lead: words
milestone: play-first
claimed-at:
---

**What.** The owner, Oct 26: "Shifts are for the simulation. Absolutely not... Remove every semblance from that in the game... The player should not be clicking through that." Every Day press stopped at a shift's start and again at its end ("Shift starts · Larimer County Kitchen", "Shift ends ·") with Day and Week grayed out until Continue. The core player clock read work boundaries as stops. The stop is removed and the shift is still worked and paid.

**Rules.** Replace, never layer: the work-boundary query, its acknowledgment plumbing and the bench's shift-stop branch and labels are deleted, not left beside the new path. Speed: a year is not slower.

**Done when.** In a drawn place built with buildBenchWorld, a working character advanced day by day for two weeks through the bench has zero stops without a module and the job's attendance moves on (`src/bench/shifts-never-stop.test.ts`, place and seed named), shown by a before and after bench screenshot.

**Time box.** 2 hours.

**You will see.** Day and Week run through work days; the character goes to work and gets paid without a "Something needs you" stop.

**Screenshot.** Before and after of seven Day presses in the same drawn place, in the PR body.

**Files.** src/core2/player-v1.ts, src/core2/work-spans-v1.ts, src/bench/player.ts, src/bench/scene.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Ruling recorded in OWNER-DECISIONS.md (Oct 26, evening, "Shifts never stop the player").
