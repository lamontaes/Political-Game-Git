---
id: play-town-paper-on-screen
title: "News names the town's paper and says when it closes and why"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from business-local-press-closes-first-year)
lead: play-first
milestone: play-first
---

**What.** Every local paper and station closes in the first year, and business-local-press-closes-first-year is fixing why. The player reads News without knowing which outlet wrote it, so a paper closing goes unnoticed. Head each local story with the outlet's name, and when an outlet closes print its last story and a line saying it closed and the recorded reason, read from the outlet and closure records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: the outlet name and the closure reason come from the organization and closure records by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, local stories in News carry their outlet's name from its organization record, and when a closure record exists a closing line names the outlet and the recorded reason, checked by a test, shown by a screenshot with the place and seed named. The owner plays it: he sees it on News in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Each local story says which paper ran it, and if the paper closes, the news says so.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: business-local-press-closes-first-year's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with business-local-press-closes-first-year (needs-from in the handoff line).
