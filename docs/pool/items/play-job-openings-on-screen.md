---
id: play-job-openings-on-screen
title: "Jobs and study lists the openings in town a jobless player could take, and why none fit when none do"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-player-jobless-no-offers)
lead: play-first
milestone: play-first
---

**What.** A jobless 18-year-old player can go a whole year with no job offer in some towns, and world-player-jobless-no-offers is fixing the offers. Jobs and study says No current job and nothing more. List the open positions in town with employer, hours and pay, mark the ones the player fits, and let the player apply to one; when none fit, say why (experience asked, hours, distance), read from the position records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: openings and fit come from the position records and the jobs engine's own fit rule. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, a jobless adult player sees the town's open positions on Jobs and study matching position record ids in a test, can apply to one and later sees the offer or the refusal by record id, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Jobs and study in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Out of work, you can see the jobs open in town and apply for one.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/jobs.ts, src/bench/handler.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: world-player-jobless-no-offers's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-player-jobless-no-offers (needs-from in the handoff line).
